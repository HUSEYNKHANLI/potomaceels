import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ReportFilter, SalesMetrics, ItemPopularity, SalesTrend, RecentOrder, MenuItem } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import StatCard from "./StatCard";
import { formatCurrency } from "@/lib/utils";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

export default function ManagementDashboard() {
  const [filter, setFilter] = useState<ReportFilter>({
    dateRange: "week",
    category: "all"
  });

  const [selectedMenuItemId, setSelectedMenuItemId] = useState<number | undefined>(undefined);
  const [showAllOrders, setShowAllOrders] = useState<boolean>(false);
  const [orderLimit, setOrderLimit] = useState<number>(10);

  // Load menu items for filters
  const { data: menuItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  // Sales metrics query
  const { data: salesMetrics, isLoading: metricsLoading } = useQuery<SalesMetrics>({
    queryKey: ["/api/reports/sales-metrics", filter],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/reports/sales-metrics", filter);
      return res.json();
    }
  });

  // Item popularity query
  const { data: itemPopularity, isLoading: popularityLoading } = useQuery<ItemPopularity[]>({
    queryKey: ["/api/reports/item-popularity", filter],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/reports/item-popularity", filter);
      return res.json();
    }
  });

  // Sales trend query
  const { data: salesTrend, isLoading: trendLoading } = useQuery<SalesTrend[]>({
    queryKey: ["/api/reports/sales-trend", filter],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/reports/sales-trend", filter);
      return res.json();
    }
  });

  // Get query client for cache invalidation
  const queryClient = useQueryClient();
  
  // Recent orders query with auto-refresh (polling every 30 seconds)
  const { data: recentOrders, isLoading: ordersLoading, refetch: refetchOrders } = useQuery<RecentOrder[]>({
    queryKey: ["/api/orders/recent", orderLimit],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/orders/recent/${orderLimit}`);
      return res.json();
    },
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });
  
  // Auto-refresh dashboard data periodically
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      // Refresh all dashboard data
      queryClient.invalidateQueries({ queryKey: ["/api/reports/sales-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/item-popularity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/sales-trend"] });
    }, 60000); // Refresh every minute
    
    return () => clearInterval(refreshInterval);
  }, [queryClient]);
  
  // Status update mutation
  const { mutate: updateOrderStatus, isPending: isUpdatingStatus } = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number, status: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/orders/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/sales-metrics"] });
    }
  });

  // Event handlers for filters
  const handleDateRangeChange = (value: string) => {
    setFilter({ ...filter, dateRange: value as ReportFilter["dateRange"] });
  };

  const handleCategoryChange = (value: string) => {
    setFilter({ ...filter, category: value as ReportFilter["category"] });
  };

  const handleMenuItemChange = (value: string) => {
    setFilter({ 
      ...filter, 
      menuItemId: value === "all" ? undefined : parseInt(value) 
    });
    setSelectedMenuItemId(value === "all" ? undefined : parseInt(value));
  };

  // Prepare chart data
  const popularityChartData = itemPopularity?.slice(0, 5).map(item => ({
    name: item.menuItem.name,
    quantity: item.quantity
  }));

  const trendChartData = salesTrend?.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: day.revenue
  }));

  // Format status for display
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "preparing":
        return "bg-blue-100 text-blue-800";
      case "in-transit":
        return "bg-indigo-100 text-indigo-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      default:
        return "bg-neutral-light text-neutral";
    }
  };
  
  const formatOrderStatus = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "preparing":
        return "Preparing";
      case "in-transit":
        return "In Transit";
      case "delivered":
        return "Delivered";
      default:
        return status;
    }
  };
  
  // Handle export functionality
  const handleExportReport = (format: 'csv' | 'pdf') => {
    // Create a download link
    const reportType = format.toUpperCase();
    const dateStr = new Date().toLocaleDateString().replace(/\//g, '-');
    const fileName = `eel-bar-report-${dateStr}.${format}`;
    
    // Show export confirmation message
    alert(`Export ${reportType} functionality is ready to use! This would download the current dashboard data as a ${reportType} file named "${fileName}".`);
    
    // In a real application, this would generate the file using libraries like jspdf and file-saver
    console.log(`Exporting dashboard data as ${reportType}...`);
    
    // Data that would be included in the export:
    const exportData = {
      metrics: salesMetrics,
      trends: salesTrend,
      popularity: itemPopularity,
      orders: recentOrders,
      filters: filter
    };
    
    console.log('Export data:', exportData);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-6">Management Dashboard</h2>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium mb-1">Date Range</label>
            <Select 
              defaultValue={filter.dateRange} 
              onValueChange={handleDateRangeChange}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <Select 
              defaultValue={filter.category} 
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="eel">Eel Dishes</SelectItem>
                <SelectItem value="beverage">Beverages</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Menu Item</label>
            <Select 
              value={selectedMenuItemId?.toString() || "all"} 
              onValueChange={handleMenuItemChange}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                {menuItems?.map(item => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex items-end">
            <Popover>
              <PopoverTrigger asChild>
                <button className="bg-primary hover:bg-primary-light text-white px-4 py-2 rounded flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Report
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-medium mb-1">Export Format</p>
                  <button 
                    className="text-left px-3 py-2 text-sm rounded hover:bg-neutral-light flex items-center"
                    onClick={() => handleExportCSV()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    CSV File
                  </button>
                  <button 
                    className="text-left px-3 py-2 text-sm rounded hover:bg-neutral-light flex items-center"
                    onClick={() => handleExportPDF()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    PDF Document
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Revenue"
            value={salesMetrics ? formatCurrency(salesMetrics.totalRevenue) : "-"}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            change={{
              value: "12.5%",
              trend: "up",
            }}
            color="primary"
            isLoading={metricsLoading}
          />
          
          <StatCard
            title="Total Orders"
            value={salesMetrics ? salesMetrics.totalOrders.toString() : "-"}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            }
            change={{
              value: "8.3%",
              trend: "up",
            }}
            color="secondary"
            isLoading={metricsLoading}
          />
          
          <StatCard
            title="Average Order"
            value={salesMetrics ? formatCurrency(salesMetrics.averageOrderValue) : "-"}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
            change={{
              value: "3.2%",
              trend: "up",
            }}
            color="neutral-dark"
            isLoading={metricsLoading}
          />
          
          <StatCard
            title="Top Item"
            value={salesMetrics?.topSellingItem ? salesMetrics.topSellingItem.menuItem.name : "-"}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            subtitle={salesMetrics?.topSellingItem ? `${salesMetrics.topSellingItem.quantity} units sold this period` : ""}
            color="accent"
            isLoading={metricsLoading}
          />
        </div>
        
        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Trend Chart */}
          <div className="bg-neutral-light p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Sales Trend</h3>
            {trendLoading ? (
              <div className="h-64 bg-white rounded border border-neutral-light flex items-center justify-center">
                <p className="text-neutral">Loading chart data...</p>
              </div>
            ) : trendChartData && trendChartData.length > 0 ? (
              <div className="h-64 bg-white rounded border border-neutral-light p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendChartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      name="Revenue" 
                      stroke="hsl(var(--secondary))" 
                      fill="hsl(var(--secondary) / 0.2)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 bg-white rounded border border-neutral-light flex items-center justify-center">
                <p className="text-neutral">No data available for selected filters</p>
              </div>
            )}
          </div>
          
          {/* Item Popularity Chart */}
          <div className="bg-neutral-light p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Item Popularity</h3>
            {popularityLoading ? (
              <div className="h-64 bg-white rounded border border-neutral-light flex items-center justify-center">
                <p className="text-neutral">Loading chart data...</p>
              </div>
            ) : popularityChartData && popularityChartData.length > 0 ? (
              <div className="h-64 bg-white rounded border border-neutral-light p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={popularityChartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      dataKey="quantity" 
                      name="Units Sold" 
                      fill="hsl(var(--accent))" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 bg-white rounded border border-neutral-light flex items-center justify-center">
                <p className="text-neutral">No data available for selected filters</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Recent Orders Table */}
        <div>
          <h3 className="text-lg font-medium mb-4">Recent Orders</h3>
          {ordersLoading ? (
            <div className="text-center py-4">Loading recent orders...</div>
          ) : recentOrders && recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-neutral-light">
                <thead>
                  <tr className="bg-neutral-light">
                    <th className="py-3 px-4 text-left">Order ID</th>
                    <th className="py-3 px-4 text-left">Customer</th>
                    <th className="py-3 px-4 text-left">Date & Time</th>
                    <th className="py-3 px-4 text-left">Items</th>
                    <th className="py-3 px-4 text-left">Total</th>
                    <th className="py-3 px-4 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders?.map((order) => {
                    if (!order || !order.customer || !order.items) {
                      return null;
                    }
                    
                    const formattedItems = order.items.map(item => 
                      `${item.menuItem?.name || 'Unknown Item'} (${item.quantity})`
                    ).join(", ");
                    
                    const formattedDate = order.orderDate ? new Date(order.orderDate).toLocaleString('en-US', {
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Unknown Date';
                    const orderId = `#EEL${order.id.toString().padStart(4, '0')}`;
                    
                    return (
                      <tr key={order.id} className="border-b border-neutral-light hover:bg-gray-50">
                        <td className="py-3 px-4">{orderId}</td>
                        <td className="py-3 px-4">{order.customer.name || 'Unknown Customer'}</td>
                        <td className="py-3 px-4">{formattedDate}</td>
                        <td className="py-3 px-4">{formattedItems}</td>
                        <td className="py-3 px-4">{formatCurrency(order.total)}</td>
                        <td className="py-3 px-4">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className={`${getStatusBadgeClass(order.status)} px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity flex items-center`}>
                                <span>{order.status ? formatOrderStatus(order.status) : 'Unknown'}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2" align="start">
                              <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium mb-1">Update Status</p>
                                {isUpdatingStatus && (
                                  <div className="text-xs text-neutral mb-1">Updating...</div>
                                )}
                                <button 
                                  className={`text-left px-2 py-1 text-sm rounded hover:bg-neutral-light ${order.status === 'pending' ? 'bg-yellow-50' : ''}`}
                                  onClick={() => updateOrderStatus({ orderId: order.id, status: 'pending' })}
                                  disabled={isUpdatingStatus}
                                >
                                  Pending
                                </button>
                                <button 
                                  className={`text-left px-2 py-1 text-sm rounded hover:bg-neutral-light ${order.status === 'preparing' ? 'bg-blue-50' : ''}`}
                                  onClick={() => updateOrderStatus({ orderId: order.id, status: 'preparing' })}
                                  disabled={isUpdatingStatus}
                                >
                                  Preparing
                                </button>
                                <button 
                                  className={`text-left px-2 py-1 text-sm rounded hover:bg-neutral-light ${order.status === 'in-transit' ? 'bg-indigo-50' : ''}`}
                                  onClick={() => updateOrderStatus({ orderId: order.id, status: 'in-transit' })}
                                  disabled={isUpdatingStatus}
                                >
                                  In Transit
                                </button>
                                <button 
                                  className={`text-left px-2 py-1 text-sm rounded hover:bg-neutral-light ${order.status === 'delivered' ? 'bg-green-50' : ''}`}
                                  onClick={() => updateOrderStatus({ orderId: order.id, status: 'delivered' })}
                                  disabled={isUpdatingStatus}
                                >
                                  Delivered
                                </button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">No recent orders found</div>
          )}
          <div className="mt-4 flex justify-center">
            <button 
              onClick={() => {
                if (showAllOrders) {
                  setOrderLimit(10);
                  setShowAllOrders(false);
                } else {
                  setOrderLimit(100); // A higher number to fetch more orders
                  setShowAllOrders(true);
                }
                // Force refetch immediately when button is clicked
                setTimeout(() => {
                  refetchOrders();
                }, 100);
              }}
              className="px-4 py-2 rounded bg-secondary text-white hover:bg-secondary-light transition-colors"
            >
              {showAllOrders ? "Show Less Orders" : "View All Orders"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
