import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Menu items table
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: doublePrecision("price").notNull(),
  category: text("category").notNull(), // 'eel' or 'beverage'
  type: text("type").notNull(), // specific type (e.g. 'smoked', 'grilled', etc.)
  imageUrl: text("image_url").notNull(),
});

// Customer information table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  orderDate: timestamp("order_date").notNull().defaultNow(),
  scheduledDate: timestamp("scheduled_date"),
  deliveryNotes: text("delivery_notes"),
  subtotal: doublePrecision("subtotal").notNull(),
  tax: doublePrecision("tax").notNull(),
  deliveryFee: doublePrecision("delivery_fee").notNull(),
  total: doublePrecision("total").notNull(),
  status: text("status").notNull().default("pending"), // pending, preparing, in-transit, delivered
});

// Order items join table
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id),
  quantity: integer("quantity").notNull(),
  price: doublePrecision("price").notNull(),
  specialInstructions: text("special_instructions"),
});

// Insert schemas
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });

// Select types
export type MenuItem = typeof menuItems.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;

// Insert types
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

// Custom schemas for API requests
export const createOrderRequestSchema = z.object({
  customer: insertCustomerSchema,
  orderItems: z.array(z.object({
    menuItemId: z.number(),
    quantity: z.number().min(1),
    specialInstructions: z.string().optional(),
  })),
  scheduledDate: z.string().optional(),
  deliveryNotes: z.string().optional(),
});

export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;

// Schema for the management dashboard filters
export const orderReportFilterSchema = z.object({
  dateRange: z.enum(['today', 'week', 'month', 'custom']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  category: z.enum(['all', 'eel', 'beverage']).optional(),
  menuItemId: z.number().optional(),
});

export type OrderReportFilter = z.infer<typeof orderReportFilterSchema>;

// Define table relations
export const menuItemsRelations = relations(menuItems, ({ many }) => ({
  orderItems: many(orderItems),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  orderItems: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
}));
