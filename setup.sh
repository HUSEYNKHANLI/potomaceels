#!/bin/bash

# Eel Bar Database Setup Script
# This script automates the setup and running of the Eel Bar Database project

echo "===== Eel Bar Database Setup Script ====="
echo ""

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

# Install dependencies
echo "Installing project dependencies..."
npm install
echo "Dependencies installed successfully."
echo ""

# Create .env file
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

# Set up PostgreSQL container using docker-compose
echo "Setting up PostgreSQL database container..."
docker-compose up -d
echo "PostgreSQL container is running."
echo ""

# Fix any potential dependency issues
echo "Installing compatible versions of drizzle packages..."
npm install drizzle-orm@0.28.6 drizzle-kit@0.19.13 drizzle-zod@0.5.0 pg@8.11.3 @types/pg@8.10.9
echo "Drizzle packages installed successfully."
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

# Update routes.ts to use MemStorage temporarily for testing
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

# Setup completed
echo "===== Setup Completed ====="
echo "You can now start the development server with: npm run dev"
echo "The application will be available at:"
echo "- Frontend: http://localhost:3000"
echo "- API: http://localhost:3000/api"
echo ""

# Ask if user wants to start the server
read -p "Do you want to start the development server now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Starting development server..."
  npm run dev
else
  echo "You can start the server later by running: npm run dev"
fi 