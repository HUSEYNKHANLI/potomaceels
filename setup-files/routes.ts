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
          return res.status(400).json({ message: `Menu item with ID ${item.menuItemId} not found` });
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

  // Additional routes for order management and reporting are available
  // in the full implementation

  const httpServer = createServer(app);
  return httpServer;
} 