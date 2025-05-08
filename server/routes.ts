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
 
  // Get recent orders 
  app.get("/api/orders/recent/:limit", async (req: Request, res: Response) => { 
    try { 
      const { limit } = req.params; 
      const recentOrders = await storage.getRecentOrders(Number(limit));
      res.json(recentOrders); 
    } catch (error) { 
      res.status(500).json({ message: "Failed to fetch recent orders" }); 
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
      if (!["pending", "preparing", "ready", "delivered", "cancelled"].includes(status)) {
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
