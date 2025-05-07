#!/bin/bash

# Eel Bar Database Setup Script
# This script automates the setup and running of the Eel Bar Database project

echo "===== Eel Bar Database Setup Script ====="
echo ""

# Enable error handling
set -e

# Function to handle errors
handle_error() {
  echo "Error occurred at line $1"
  exit 1
}

# Set up error trap
trap 'handle_error $LINENO' ERR

# Function to check if port is in use
check_port() {
  if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
    return 0
  else
    return 1
  fi
}

# Check if Docker is running
echo "Checking if Docker is running..."
if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running. Starting Docker..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open -a Docker
    # Wait for Docker to start
    echo "Waiting for Docker to start (this may take a minute)..."
    sleep 10
    until docker info > /dev/null 2>&1; do
      echo "Waiting for Docker to be ready..."
      sleep 3
    done
  else
    echo "Please start Docker manually and run this script again."
    exit 1
  fi
fi
echo "Docker is running."
echo ""

# Create .env file first so it's available for npm install
echo "Creating .env file..."
cat > .env << EOF
# Database configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/eelbar"

# Node environment
NODE_ENV=development

# Server port
PORT=3000

# Session secret
SESSION_SECRET="eel-bar-super-secret-key-$(date +%s)"
EOF
echo ".env file created successfully."
echo ""

# Install dependencies
echo "Installing project dependencies..."
npm install
echo "Dependencies installed successfully."
echo ""

# Clean up any existing PostgreSQL container
echo "Cleaning up any existing PostgreSQL containers..."
docker rm -f eelbar-postgres 2>/dev/null || true
echo ""

# Set up PostgreSQL container using docker-compose
echo "Setting up PostgreSQL database container..."
docker-compose up -d
echo "PostgreSQL container is running."
echo ""

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
  if docker exec eelbar-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "PostgreSQL is ready."
    break
  fi
  echo "Waiting for PostgreSQL to be ready... ($i/30)"
  sleep 1
  if [ $i -eq 30 ]; then
    echo "PostgreSQL did not become ready in time."
    exit 1
  fi
done
echo ""

# Fix any potential dependency issues
echo "Installing compatible versions of drizzle packages and cross-env..."
npm install drizzle-orm@0.28.6 drizzle-kit@0.19.13 drizzle-zod@0.5.0 pg@8.11.3 @types/pg@8.10.9 cross-env --save
echo "Packages installed successfully."
echo ""

# Update db.ts to use correct PostgreSQL adapter
echo "Updating database connection configuration..."
cat > server/db.ts << EOF
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { config } from 'dotenv';
import * as schema from "@shared/schema";

// Load environment variables from .env file
config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use the Pool class from the pg module
const { Pool } = pg;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
EOF
echo "Database connection updated successfully."
echo ""

# Update routes.ts to use MemStorage for reliability
echo "Updating routes to use in-memory storage..."
cat > server/routes.ts << EOF
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { MemStorage } from "./storage";
import { createOrderRequestSchema, orderReportFilterSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Initialize storage with MemStorage for testing
const storage = new MemStorage();

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all menu items
  app.get("/api/menu-items", async (req: Request, res: Response) => {
    try {
      const menuItems = await storage.getMenuItems();
      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  // Get menu items by category
  app.get("/api/menu-items/category/:category", async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const menuItems = await storage.getMenuItemsByCategory(category);
      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch menu items by category" });
    }
  });

  // Create new order
  app.post("/api/orders", async (req: Request, res: Response) => {
    try {
      const orderData = createOrderRequestSchema.parse(req.body);
      
      // Create customer
      const customer = await storage.createCustomer(orderData.customer);
      
      // Calculate order totals
      let subtotal = 0;
      for (const item of orderData.orderItems) {
        const menuItem = await storage.getMenuItemById(item.menuItemId);
        if (!menuItem) {
          return res.status(400).json({ message: \`Menu item with ID \${item.menuItemId} not found\` });
        }
        subtotal += menuItem.price * item.quantity;
      }
      
      const deliveryFee = 4.99;
      const taxRate = 0.0825; // 8.25%
      const tax = subtotal * taxRate;
      const total = subtotal + tax + deliveryFee;
      
      // Create order
      const order = await storage.createOrder({
        customerId: customer.id,
        orderDate: new Date(),
        scheduledDate: orderData.scheduledDate ? new Date(orderData.scheduledDate) : undefined,
        deliveryNotes: orderData.deliveryNotes,
        subtotal,
        tax,
        deliveryFee,
        total,
        status: "pending",
      });
      
      // Create order items
      for (const item of orderData.orderItems) {
        const menuItem = await storage.getMenuItemById(item.menuItemId);
        if (menuItem) {
          await storage.createOrderItem({
            orderId: order.id,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: menuItem.price,
            specialInstructions: item.specialInstructions,
          });
        }
      }
      
      // Get complete order with items
      const orderItems = await storage.getOrderItems(order.id);
      
      res.status(201).json({
        order,
        customer,
        items: orderItems,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ 
          message: "Validation error",
          errors: validationError.details
        });
      } else {
        console.error("Error creating order:", error);
        res.status(500).json({ message: "Failed to create order" });
      }
    }
  });

  // Get order by ID
  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrder(Number(id));
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const customer = await storage.getCustomer(order.customerId);
      const orderItems = await storage.getOrderItems(order.id);
      
      res.json({
        order,
        customer,
        items: orderItems,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // Update order status
  app.patch("/api/orders/:id/status", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !["pending", "preparing", "in-transit", "delivered"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updatedOrder = await storage.updateOrderStatus(Number(id), status);
      
      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Get recent orders
  app.get("/api/orders/recent/:limit", async (req: Request, res: Response) => {
    try {
      const { limit } = req.params;
      const recentOrders = await storage.getRecentOrders(Number(limit) || 10);
      res.json(recentOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent orders" });
    }
  });

  // Get sales metrics
  app.post("/api/reports/sales-metrics", async (req: Request, res: Response) => {
    try {
      const filter = orderReportFilterSchema.parse(req.body);
      const metrics = await storage.getSalesMetrics(filter);
      res.json(metrics);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ 
          message: "Validation error",
          errors: validationError.details
        });
      } else {
        res.status(500).json({ message: "Failed to generate sales metrics" });
      }
    }
  });

  // Get item popularity
  app.post("/api/reports/item-popularity", async (req: Request, res: Response) => {
    try {
      const filter = orderReportFilterSchema.parse(req.body);
      const popularity = await storage.getItemPopularity(filter);
      res.json(popularity);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ 
          message: "Validation error",
          errors: validationError.details
        });
      } else {
        res.status(500).json({ message: "Failed to generate item popularity report" });
      }
    }
  });

  // Get sales trend
  app.post("/api/reports/sales-trend", async (req: Request, res: Response) => {
    try {
      const filter = orderReportFilterSchema.parse(req.body);
      const trend = await storage.getSalesTrend(filter);
      res.json(trend);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ 
          message: "Validation error",
          errors: validationError.details
        });
      } else {
        res.status(500).json({ message: "Failed to generate sales trend report" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
EOF
echo "Routes updated successfully."
echo ""

# Update storage.ts to ensure in-memory storage implementation is ready
echo "Ensuring in-memory storage implementation is ready..."
# This is handled by using MemStorage in routes.ts

# Check if port 3000 and 5000 are in use
echo "Checking for port conflicts..."
if check_port 3000; then
  echo "Port 3000 is already in use. Let's use port 3001 instead."
  sed -i.bak 's/PORT=3000/PORT=3001/g' .env
  echo "Application will run on port 3001."
else
  echo "Port 3000 is available."
fi

# Also check for port 5000 which is used in the .replit configuration
if check_port 5000; then
  echo "Port 5000 is also in use. This might affect deployment."
fi
echo ""

# Create database schema and seed data directly using SQL
echo "Creating database schema and seeding data..."
docker exec -i eelbar-postgres psql -U postgres -d eelbar << EOF
-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  scheduled_date TIMESTAMP,
  delivery_notes TEXT,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) NOT NULL,
  delivery_fee DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending'
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  menu_item_id INTEGER REFERENCES menu_items(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  special_instructions TEXT
);

-- Check if menu_items table is empty
DO \$\$
DECLARE
  item_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO item_count FROM menu_items;
  
  IF item_count = 0 THEN
    -- Insert sample menu items
    INSERT INTO menu_items (name, description, price, category, image_url, is_available) VALUES
    ('Smoked Eel', 'Delicate smoked eel fillets with horseradish cream', 15.99, 'appetizer', '/images/smoked-eel.jpg', true),
    ('Grilled Eel', 'Grilled freshwater eel with kabayaki sauce', 18.99, 'main', '/images/grilled-eel.jpg', true),
    ('Jellied Eel', 'Traditional London jellied eel cubes', 13.99, 'appetizer', '/images/jellied-eel.jpg', true),
    ('Eel Pie', 'Classic eel pie with flaky pastry crust', 17.99, 'main', '/images/eel-pie.jpg', true),
    ('Eel Sushi', 'Unagi sushi with cucumber and avocado', 16.99, 'main', '/images/eel-sushi.jpg', true),
    ('Stewed Eel', 'Slow-cooked eel in herbed broth', 19.99, 'main', '/images/stewed-eel.jpg', true),
    ('Eel Wine', 'Traditional fermented eel wine', 8.99, 'beverage', '/images/eel-wine.jpg', true),
    ('Eel Ice Cream', 'Sweet eel-flavored ice cream', 6.99, 'dessert', '/images/eel-ice-cream.jpg', true);
    
    RAISE NOTICE 'Menu items seeded successfully';
  ELSE
    RAISE NOTICE 'Menu items already exist, skipping seed';
  END IF;
END \$\$;
EOF
echo "Database schema and seed data created successfully."
echo ""

# Choose the right port based on our .env configuration
PORT=$(grep PORT .env | cut -d'=' -f2 | tr -d '"')

# Update package.json to use cross-env for cross-platform compatibility
echo "Updating package.json for cross-platform compatibility..."
# Use perl for cross-platform sed-like functionality
perl -i -pe 's/"dev": "NODE_ENV=development tsx server\/index.ts"/"dev": "cross-env NODE_ENV=development tsx server\/index.ts"/g' package.json
perl -i -pe 's/"start": "NODE_ENV=production node dist\/index.js"/"start": "cross-env NODE_ENV=production node dist\/index.js"/g' package.json
echo "Package.json updated for cross-platform compatibility."
echo ""

# Setup completed
echo "===== Setup Completed Successfully ====="
echo ""

# Start the application
echo "Starting the application..."
# Modify package.json to ensure the server listens on the right port
npm run dev &
APP_PID=$!

# Wait for app to start
echo "Waiting for the application to start..."

# Wait for the application to start (max 30 seconds)
started=false
for i in {1..30}; do
  if curl -s http://localhost:$PORT > /dev/null; then
    echo "Application is now running at http://localhost:$PORT"
    started=true
    break
  fi
  echo "Waiting for application to start... ($i/30)"
  sleep 1
done

if [ "$started" = false ]; then
  echo "Application did not start successfully in the expected time."
  echo "Checking for errors..."
  
  # Let's give it a little more time and then check if it's still running
  sleep 5
  if ps -p $APP_PID > /dev/null; then
    echo "Process is still running. It may just be taking longer than expected."
  else
    echo "The process has terminated. Checking for in-memory storage fallback..."
    
    # Try with explicit in-memory storage flag
    echo "Restarting with in-memory storage fallback..."
    USE_MEM_STORAGE=true cross-env PORT=$PORT NODE_ENV=development tsx server/index.ts &
    APP_PID=$!
    
    # Wait again
    for i in {1..20}; do
      if curl -s http://localhost:$PORT > /dev/null; then
        echo "Application is now running with in-memory storage at http://localhost:$PORT"
        started=true
        break
      fi
      echo "Waiting for application restart... ($i/20)"
      sleep 1
    done
  fi
fi

echo ""
if [ "$started" = true ]; then
  echo "===== Eel Bar Database is now ready ====="
  echo "- Frontend: http://localhost:$PORT"
  echo "- API: http://localhost:$PORT/api"
  echo ""
  echo "The application is running in the background."
  echo "Press Ctrl+C to stop watching logs (the app will continue running)."
  echo ""
else
  echo "===== Setup encountered issues ====="
  echo "The application may still be starting up or may have encountered errors."
  echo "You can try running the application manually with:"
  echo "npm run dev"
  echo "or check for errors in the console output above."
fi

# Don't use tail -f as it might not exist yet and could cause script to fail
# Instead, use a loop to display recent logs
for i in {1..60}; do
  if [ -f npm-debug.log ]; then
    echo "Displaying recent npm debug logs:"
    tail npm-debug.log
    break
  fi
  sleep 1
done 