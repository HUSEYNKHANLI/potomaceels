// Types corresponding to the database schema
export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  type: string;
  imageUrl: string;
}

export interface Customer {
  id?: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface Order {
  id: number;
  customerId: number;
  orderDate: string;
  scheduledDate?: string;
  deliveryNotes?: string;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  status: "pending" | "preparing" | "in-transit" | "delivered";
}

export interface OrderItem {
  id: number;
  orderId: number;
  menuItemId: number;
  quantity: number;
  price: number;
  specialInstructions?: string;
  menuItem?: MenuItem;
}

// Frontend specific types
export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

export interface OrderSummary {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
}

export interface CreateOrderRequest {
  customer: Customer;
  orderItems: {
    menuItemId: number;
    quantity: number;
    specialInstructions?: string;
  }[];
  scheduledDate?: string;
  deliveryNotes?: string;
}

export interface OrderResponse {
  order: Order;
  customer: Customer;
  items: OrderItem[];
}

export interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topSellingItem: {
    menuItem: MenuItem;
    quantity: number;
  } | null;
}

export interface ItemPopularity {
  menuItem: MenuItem;
  quantity: number;
}

export interface SalesTrend {
  date: string;
  revenue: number;
}

export interface ReportFilter {
  dateRange?: 'today' | 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
  category?: 'all' | 'eel' | 'beverage';
  menuItemId?: number;
}

export interface RecentOrder {
  id: number;
  customerId: number;
  orderDate: string;
  scheduledDate?: string | null;
  deliveryNotes?: string | null;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  status: "pending" | "preparing" | "in-transit" | "delivered";
  customer: Customer;
  items: OrderItem[];
}
