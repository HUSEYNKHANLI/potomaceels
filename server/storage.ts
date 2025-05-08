import {
  type MenuItem,
  type Customer,
  type Order,
  type OrderItem,
  type InsertMenuItem,
  type InsertCustomer,
  type InsertOrder,
  type InsertOrderItem,
  type OrderReportFilter,
} from "@shared/schema";
import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, and, desc, gte, lte, inArray, sql } from "drizzle-orm";

// Define all the CRUD operations for our storage interface
export interface IStorage {
  // Menu Item operations
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItemById(id: number): Promise<MenuItem | undefined>;
  getMenuItemsByCategory(category: string): Promise<MenuItem[]>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;

  // Customer operations
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;

  // Order operations
  getOrder(id: number): Promise<Order | undefined>;
  getOrdersByCustomerId(customerId: number): Promise<Order[]>;
  getRecentOrders(limit: number): Promise<(Order & { customer: Customer, items: (OrderItem & { menuItem: MenuItem })[] })[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;

  // Order items operations
  getOrderItems(orderId: number): Promise<(OrderItem & { menuItem: MenuItem })[]>;
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;

  // Reporting operations
  getSalesMetrics(filter: OrderReportFilter): Promise<{
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    topSellingItem: { menuItem: MenuItem; quantity: number } | null;
  }>;
  getItemPopularity(filter: OrderReportFilter): Promise<{ menuItem: MenuItem; quantity: number }[]>;
  getSalesTrend(filter: OrderReportFilter): Promise<{ date: string; revenue: number }[]>;
}

// In-memory implementation
export class MemStorage implements IStorage {
  private menuItems: Map<number, MenuItem>;
  private customers: Map<number, Customer>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem>;
  
  private menuItemId: number;
  private customerId: number;
  private orderId: number;
  private orderItemId: number;

  constructor() {
    this.menuItems = new Map();
    this.customers = new Map();
    this.orders = new Map();
    this.orderItems = new Map();

    this.menuItemId = 1;
    this.customerId = 1;
    this.orderId = 1;
    this.orderItemId = 1;

    // Initialize with menu items
    this.initializeMenuItems();
  }

  private initializeMenuItems() {
    const eelDishes: InsertMenuItem[] = [
      {
        name: "Smoked Eel",
        description: "Delicately smoked Potomac eel with herbs and spices",
        price: 16.99,
        category: "eel",
        type: "smoked",
        imageUrl: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500",
      },
      {
        name: "Jellied Eel",
        description: "Traditional jellied eel in clear broth with spices",
        price: 14.99,
        category: "eel",
        type: "jellied",
        imageUrl: "https://miro.medium.com/v2/resize:fit:720/format:webp/1*NAh9243Gld1lLlaFGKrOKQ.jpeg",
      },
      {
        name: "Grilled Eel",
        description: "Char-grilled eel with sweet soy glaze",
        price: 17.99,
        category: "eel",
        type: "grilled",
        imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500",
      },
      {
        name: "Fried Eel",
        description: "Crispy fried eel with special house sauce",
        price: 15.99,
        category: "eel",
        type: "fried",
        imageUrl: "https://images.unsplash.com/photo-1562967914-608f82629710?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500",
      },
      {
        name: "Baked Eel",
        description: "Slow-baked eel with herbs and seasonal vegetables",
        price: 18.99,
        category: "eel",
        type: "baked",
        imageUrl: "https://images.unsplash.com/photo-1432139555190-58524dae6a55?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500",
      },
      {
        name: "Eel Sushi",
        description: "Fresh eel sushi with cucumber and avocado",
        price: 19.99,
        category: "eel",
        type: "sushi",
        imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500",
      },
    ];

    const beverages: InsertMenuItem[] = [
      {
        name: "Fat Tire Beer",
        description: "Classic amber ale, perfect with eel dishes",
        price: 6.99,
        category: "beverage",
        type: "beer",
        imageUrl: "https://images.unsplash.com/photo-1584225064785-c62a8b43d148?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500",
      },
      {
        name: "Hot Sake",
        description: "Traditional rice wine, served warm",
        price: 8.99,
        category: "beverage",
        type: "sake",
        imageUrl: "https://images.squarespace-cdn.com/content/v1/58fd82dbbf629ab224f81b68/d2f10916-30d6-4441-8d84-2b8060ef1474/Hot-Sake.jpg?format=2500w",
      },
    ];

    // Add all menu items
    [...eelDishes, ...beverages].forEach(item => {
      this.createMenuItem(item);
    });
  }

  // Menu Item operations
  async getMenuItems(): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values());
  }

  async getMenuItemById(id: number): Promise<MenuItem | undefined> {
    return this.menuItems.get(id);
  }

  async getMenuItemsByCategory(category: string): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values()).filter(
      (item) => item.category === category
    );
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const id = this.menuItemId++;
    const newMenuItem = { ...menuItem, id };
    this.menuItems.set(id, newMenuItem);
    return newMenuItem;
  }

  // Customer operations
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = this.customerId++;
    const newCustomer = { ...customer, id };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }

  // Order operations
  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrdersByCustomerId(customerId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.customerId === customerId
    );
  }

  async getRecentOrders(limit: number): Promise<(Order & { customer: Customer, items: (OrderItem & { menuItem: MenuItem })[] })[]> {
    const allOrders = Array.from(this.orders.values())
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, limit);

    return Promise.all(allOrders.map(async (order) => {
      const customer = await this.getCustomer(order.customerId);
      const items = await this.getOrderItems(order.id);
      return {
        ...order,
        customer: customer!,
        items,
      };
    }));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.orderId++;
    const newOrder = { ...order, id };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    
    const updatedOrder = { ...order, status };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  // Order items operations
  async getOrderItems(orderId: number): Promise<(OrderItem & { menuItem: MenuItem })[]> {
    const items = Array.from(this.orderItems.values()).filter(
      (item) => item.orderId === orderId
    );

    return Promise.all(
      items.map(async (item) => {
        const menuItem = await this.getMenuItemById(item.menuItemId);
        return { ...item, menuItem: menuItem! };
      })
    );
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const id = this.orderItemId++;
    const newOrderItem = { ...orderItem, id };
    this.orderItems.set(id, newOrderItem);
    return newOrderItem;
  }

  // Reporting operations
  async getSalesMetrics(filter: OrderReportFilter): Promise<{
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    topSellingItem: { menuItem: MenuItem; quantity: number } | null;
  }> {
    const filteredOrders = this.getFilteredOrders(filter);
    
    // Calculate total revenue and orders
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = filteredOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get top selling item
    const itemCounts = new Map<number, number>();
    for (const order of filteredOrders) {
      const orderItems = await this.getOrderItems(order.id);
      for (const item of orderItems) {
        const currentCount = itemCounts.get(item.menuItemId) || 0;
        itemCounts.set(item.menuItemId, currentCount + item.quantity);
      }
    }

    let topSellingItem: { menuItem: MenuItem; quantity: number } | null = null;
    let maxQuantity = 0;

    for (const [menuItemId, quantity] of itemCounts.entries()) {
      if (quantity > maxQuantity) {
        maxQuantity = quantity;
        const menuItem = await this.getMenuItemById(menuItemId);
        if (menuItem) {
          topSellingItem = { menuItem, quantity };
        }
      }
    }

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      topSellingItem,
    };
  }

  async getItemPopularity(filter: OrderReportFilter): Promise<{ menuItem: MenuItem; quantity: number }[]> {
    const filteredOrders = this.getFilteredOrders(filter);
    
    const itemCounts = new Map<number, number>();
    for (const order of filteredOrders) {
      const orderItems = await this.getOrderItems(order.id);
      for (const item of orderItems) {
        const currentCount = itemCounts.get(item.menuItemId) || 0;
        itemCounts.set(item.menuItemId, currentCount + item.quantity);
      }
    }

    const popularityList: { menuItem: MenuItem; quantity: number }[] = [];
    for (const [menuItemId, quantity] of itemCounts.entries()) {
      const menuItem = await this.getMenuItemById(menuItemId);
      if (menuItem) {
        popularityList.push({ menuItem, quantity });
      }
    }

    return popularityList.sort((a, b) => b.quantity - a.quantity);
  }

  async getSalesTrend(filter: OrderReportFilter): Promise<{ date: string; revenue: number }[]> {
    const filteredOrders = this.getFilteredOrders(filter);
    
    const dailyRevenue = new Map<string, number>();
    
    for (const order of filteredOrders) {
      const date = new Date(order.orderDate).toISOString().split('T')[0];
      const currentRevenue = dailyRevenue.get(date) || 0;
      dailyRevenue.set(date, currentRevenue + order.total);
    }

    const trend = Array.from(dailyRevenue.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));

    return trend.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Helper method to filter orders based on the dashboard filter
  private getFilteredOrders(filter: OrderReportFilter): Order[] {
    let filteredOrders = Array.from(this.orders.values());
    
    // Filter by date range
    if (filter.dateRange || filter.startDate || filter.endDate) {
      const now = new Date();
      let startDate: Date;
      let endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      
      if (filter.dateRange === 'today') {
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
      } else if (filter.dateRange === 'week') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
      } else if (filter.dateRange === 'month') {
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
      } else if (filter.startDate) {
        startDate = new Date(filter.startDate);
        startDate.setHours(0, 0, 0, 0);
        if (filter.endDate) {
          endDate = new Date(filter.endDate);
          endDate.setHours(23, 59, 59, 999);
        }
      } else {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30); // Default to 30 days
        startDate.setHours(0, 0, 0, 0);
      }
      
      filteredOrders = filteredOrders.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= startDate && orderDate <= endDate;
      });
    }
    
    return filteredOrders;
  }
}

// Database implementation
export class DatabaseStorage implements IStorage {
  // Menu Item operations
  async getMenuItems(): Promise<MenuItem[]> {
    const menuItems = await db.query.menuItems.findMany();
    return menuItems;
  }

  async getMenuItemById(id: number): Promise<MenuItem | undefined> {
    const menuItem = await db.query.menuItems.findFirst({
      where: eq(schema.menuItems.id, id)
    });
    return menuItem || undefined;
  }

  async getMenuItemsByCategory(category: string): Promise<MenuItem[]> {
    const menuItems = await db.query.menuItems.findMany({
      where: eq(schema.menuItems.category, category)
    });
    return menuItems;
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const [newMenuItem] = await db.insert(schema.menuItems)
      .values(menuItem)
      .returning();
    return newMenuItem;
  }

  // Customer operations
  async getCustomer(id: number): Promise<Customer | undefined> {
    const customer = await db.query.customers.findFirst({
      where: eq(schema.customers.id, id)
    });
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(schema.customers)
      .values(customer)
      .returning();
    return newCustomer;
  }

  // Order operations
  async getOrder(id: number): Promise<Order | undefined> {
    const order = await db.query.orders.findFirst({
      where: eq(schema.orders.id, id)
    });
    return order || undefined;
  }

  async getOrdersByCustomerId(customerId: number): Promise<Order[]> {
    const orders = await db.query.orders.findMany({
      where: eq(schema.orders.customerId, customerId)
    });
    return orders;
  }

  async getRecentOrders(limit: number): Promise<(Order & { customer: Customer, items: (OrderItem & { menuItem: MenuItem })[] })[]> {
    const orders = await db.query.orders.findMany({
      orderBy: desc(schema.orders.orderDate),
      limit,
      with: {
        customer: true,
        orderItems: {
          with: {
            menuItem: true
          }
        }
      }
    });

    return orders.map(order => ({
      ...order,
      items: order.orderItems
    }));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(schema.orders)
      .values(order)
      .returning();
    return newOrder;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const [updatedOrder] = await db.update(schema.orders)
      .set({ status })
      .where(eq(schema.orders.id, id))
      .returning();
    return updatedOrder || undefined;
  }

  // Order items operations
  async getOrderItems(orderId: number): Promise<(OrderItem & { menuItem: MenuItem })[]> {
    const orderItems = await db.query.orderItems.findMany({
      where: eq(schema.orderItems.orderId, orderId),
      with: {
        menuItem: true
      }
    });
    return orderItems;
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const [newOrderItem] = await db.insert(schema.orderItems)
      .values(orderItem)
      .returning();
    return newOrderItem;
  }

  // Reporting operations
  async getSalesMetrics(filter: OrderReportFilter): Promise<{
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    topSellingItem: { menuItem: MenuItem; quantity: number } | null;
  }> {
    const { dateFilter, categoryFilter, menuItemFilter } = this.buildFilters(filter);
    
    // Get filtered orders
    const orders = await db.query.orders.findMany({
      where: dateFilter,
    });
    
    // Calculate base metrics
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Get all order items for these orders
    const orderIds = orders.map(order => order.id);
    
    // Find the top selling item
    const topItemResult = await db.select({
      menuItemId: schema.orderItems.menuItemId,
      totalQuantity: sql`sum(${schema.orderItems.quantity})::int`,
    })
    .from(schema.orderItems)
    .where(and(
      inArray(schema.orderItems.orderId, orderIds),
      categoryFilter ? inArray(schema.orderItems.menuItemId, 
        db.select({ id: schema.menuItems.id })
          .from(schema.menuItems)
          .where(eq(schema.menuItems.category, filter.category || 'all'))
      ) : undefined,
      menuItemFilter ? eq(schema.orderItems.menuItemId, filter.menuItemId as number) : undefined
    ))
    .groupBy(schema.orderItems.menuItemId)
    .orderBy(desc(sql`sum(${schema.orderItems.quantity})`))
    .limit(1);
    
    let topSellingItem: { menuItem: MenuItem; quantity: number } | null = null;
    
    if (topItemResult.length > 0) {
      const { menuItemId, totalQuantity } = topItemResult[0];
      const menuItem = await this.getMenuItemById(menuItemId);
      if (menuItem) {
        topSellingItem = { menuItem, quantity: totalQuantity };
      }
    }
    
    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      topSellingItem,
    };
  }

  async getItemPopularity(filter: OrderReportFilter): Promise<{ menuItem: MenuItem; quantity: number }[]> {
    const { dateFilter, categoryFilter, menuItemFilter } = this.buildFilters(filter);
    
    // Get filtered orders
    const orders = await db.query.orders.findMany({
      where: dateFilter,
    });
    
    // Get all order items for these orders
    const orderIds = orders.map(order => order.id);
    
    // Get item popularity
    const popularityResults = await db.select({
      menuItemId: schema.orderItems.menuItemId,
      totalQuantity: sql`sum(${schema.orderItems.quantity})::int`,
    })
    .from(schema.orderItems)
    .where(and(
      inArray(schema.orderItems.orderId, orderIds),
      categoryFilter ? inArray(schema.orderItems.menuItemId, 
        db.select({ id: schema.menuItems.id })
          .from(schema.menuItems)
          .where(eq(schema.menuItems.category, filter.category || 'all'))
      ) : undefined,
      menuItemFilter ? eq(schema.orderItems.menuItemId, filter.menuItemId as number) : undefined
    ))
    .groupBy(schema.orderItems.menuItemId)
    .orderBy(desc(sql`sum(${schema.orderItems.quantity})`));
    
    // Map results to full objects with menu item details
    const popularityList: { menuItem: MenuItem; quantity: number }[] = [];
    
    for (const result of popularityResults) {
      const menuItem = await this.getMenuItemById(result.menuItemId);
      if (menuItem) {
        popularityList.push({ 
          menuItem, 
          quantity: result.totalQuantity 
        });
      }
    }
    
    return popularityList;
  }

  async getSalesTrend(filter: OrderReportFilter): Promise<{ date: string; revenue: number }[]> {
    const { dateFilter } = this.buildFilters(filter);
    
    // Get filtered orders
    const orders = await db.query.orders.findMany({
      where: dateFilter,
    });
    
    // Process orders into daily revenue 
    const dailyRevenue = new Map<string, number>();
    
    for (const order of orders) {
      const date = new Date(order.orderDate).toISOString().split('T')[0];
      const currentRevenue = dailyRevenue.get(date) || 0;
      dailyRevenue.set(date, currentRevenue + order.total);
    }
    
    // Convert to array and sort by date
    const trend = Array.from(dailyRevenue.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));
    
    return trend.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Helper method to build filter conditions based on report filter
  private buildFilters(filter: OrderReportFilter) {
    // Build date filter
    let dateFilter;
    if (filter.dateRange || filter.startDate) {
      const now = new Date();
      let startDate: Date;
      let endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      
      if (filter.dateRange === 'today') {
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
      } else if (filter.dateRange === 'week') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
      } else if (filter.dateRange === 'month') {
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
      } else if (filter.startDate) {
        startDate = new Date(filter.startDate);
        if (filter.endDate) {
          endDate = new Date(filter.endDate);
        }
      } else {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30); // Default to 30 days
      }
      
      dateFilter = and(
        gte(schema.orders.orderDate, startDate),
        lte(schema.orders.orderDate, endDate)
      );
    }
    
    // Category filter
    const categoryFilter = filter.category && filter.category !== 'all';
    
    // Menu item filter
    const menuItemFilter = filter.menuItemId !== undefined;
    
    return { dateFilter, categoryFilter, menuItemFilter };
  }
}

// Initialize storage with database implementation
// Initialize storage with database implementation
export const storage = new DatabaseStorage();

// Ensure the storage is properly initialized before use
try {
  // Test the database connection
  db.select().from(schema.menuItems).limit(1);
  console.log("Storage initialized successfully");
} catch (error) {
  console.error("Error initializing storage:", error);
}
