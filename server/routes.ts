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
 
  const httpServer = createServer(app); 
  return httpServer; 
} 
