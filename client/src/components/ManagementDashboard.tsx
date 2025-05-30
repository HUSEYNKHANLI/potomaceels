import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ReportFilter, SalesMetrics, ItemPopularity, SalesTrend, RecentOrder, MenuItem } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import StatCard from "./StatCard";
import { formatCurrency } from "@/lib/utils";
import { eventBus, EVENT_NEW_ORDER, EVENT_ORDER_STATUS_UPDATED } from "@/lib/events";
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
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";

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
  
  // Handle automatic refresh when new orders are created
  const refreshAllData = useCallback(() => {
    console.log('Real-time update: New order detected! Refreshing dashboard data...');
    
    // Refresh all dashboard data immediately
    queryClient.invalidateQueries({ queryKey: ["/api/orders/recent"] });
    queryClient.invalidateQueries({ queryKey: ["/api/reports/sales-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["/api/reports/item-popularity"] });
    queryClient.invalidateQueries({ queryKey: ["/api/reports/sales-trend"] });
    
    // Also trigger a manual refetch of orders
    refetchOrders();
  }, [queryClient, refetchOrders]);
  
  // Subscribe to new order events
  useEffect(() => {
    // Subscribe to the new order event
    const unsubscribe = eventBus.subscribe(EVENT_NEW_ORDER, (orderData) => {
      refreshAllData();
    });
    
    // Subscribe to order status updates as well
    const unsubscribeStatus = eventBus.subscribe(EVENT_ORDER_STATUS_UPDATED, () => {
      refreshAllData();
    });
    
    // Clean up subscriptions when component unmounts
    return () => {
      unsubscribe();
      unsubscribeStatus();
    };
  }, [refreshAllData]);
  
  // Status update mutation
  const { mutate: updateOrderStatus, isPending: isUpdatingStatus } = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number, status: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/orders/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/sales-metrics"] });
      
      // Publish event for real-time updates
      eventBus.publish(EVENT_ORDER_STATUS_UPDATED, {
        orderId: variables.orderId,
        status: variables.status
      });
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
    const dateStr = new Date().toLocaleDateString().replace(/\//g, '-');
    const fileName = `eel-bar-report-${dateStr}.${format}`;
    
    // Prepare data for export
    const exportData = {
      metrics: salesMetrics,
      trends: salesTrend,
      popularity: itemPopularity,
      orders: recentOrders?.slice(0, 10),
      filters: filter
    };
    
    if (format === 'csv') {
      // Generate CSV content
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Add report header
      csvContent += "Eel Bar Sales Report\r\n";
      csvContent += `Generated on: ${new Date().toLocaleDateString()}\r\n\r\n`;
      
      // Add filter information
      csvContent += "Filter Settings\r\n";
      csvContent += `Date Range: ${filter.dateRange || 'All Time'}\r\n`;
      csvContent += `Category: ${filter.category || 'All'}\r\n`;
      csvContent += `Menu Item: ${selectedMenuItemId ? menuItems?.find(item => item.id === selectedMenuItemId)?.name : 'All'}\r\n\r\n`;
      
      // Add sales metrics
      if (salesMetrics) {
        csvContent += "Sales Metrics\r\n";
        csvContent += `Total Revenue,${salesMetrics.totalRevenue}\r\n`;
        csvContent += `Total Orders,${salesMetrics.totalOrders}\r\n`;
        csvContent += `Average Order Value,${salesMetrics.averageOrderValue}\r\n`;
        csvContent += `Top Selling Item,${salesMetrics.topSellingItem?.menuItem.name || 'N/A'}\r\n`;
        csvContent += `Top Item Quantity,${salesMetrics.topSellingItem?.quantity || 0}\r\n\r\n`;
      }
      
      // Add sales trend data
      if (salesTrend && salesTrend.length > 0) {
        csvContent += "Sales Trend\r\n";
        csvContent += "Date,Revenue\r\n";
        
        salesTrend.forEach(day => {
          csvContent += `${day.date},${day.revenue}\r\n`;
        });
        csvContent += "\r\n";
      }
      
      // Add item popularity data
      if (itemPopularity && itemPopularity.length > 0) {
        csvContent += "Item Popularity\r\n";
        csvContent += "Menu Item,Quantity,Category\r\n";
        
        itemPopularity.forEach(item => {
          csvContent += `${item.menuItem.name},${item.quantity},${item.menuItem.category}\r\n`;
        });
        csvContent += "\r\n";
      }
      
      // Add recent orders data
      if (recentOrders && recentOrders.length > 0) {
        csvContent += "Recent Orders\r\n";
        csvContent += "Order ID,Customer,Date,Status,Total\r\n";
        
        recentOrders.slice(0, 10).forEach(order => {
          const orderId = `EEL${order.id.toString().padStart(4, '0')}`;
          const customerName = order.customer?.name || 'Unknown';
          const orderDate = order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'Unknown';
          csvContent += `${orderId},${customerName},${orderDate},${order.status},${order.total}\r\n`;
        });
      }
      
      // Create a download link and trigger download
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } else if (format === 'pdf') {
      // Generate PDF using jsPDF
      const doc = new jsPDF();
      
      // Add report header
      doc.setFontSize(18);
      doc.text("Eel Bar Sales Report", 14, 20);
      
      doc.setFontSize(11);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
      
      // Add filter information
      doc.setFontSize(14);
      doc.text("Filter Settings", 14, 40);
      
      doc.setFontSize(10);
      const dateRangeText = `Date Range: ${filter.dateRange || 'All Time'}`;
      const categoryText = `Category: ${filter.category || 'All'}`;
      const menuItemText = `Menu Item: ${selectedMenuItemId ? menuItems?.find(item => item.id === selectedMenuItemId)?.name : 'All'}`;
      
      doc.text(dateRangeText, 14, 50);
      doc.text(categoryText, 14, 55);
      doc.text(menuItemText, 14, 60);
      
      // Add sales metrics
      if (salesMetrics) {
        doc.setFontSize(14);
        doc.text("Sales Metrics", 14, 70);
        
        doc.setFontSize(10);
        doc.text(`Total Revenue: ${formatCurrency(salesMetrics.totalRevenue)}`, 14, 80);
        doc.text(`Total Orders: ${salesMetrics.totalOrders}`, 14, 85);
        doc.text(`Average Order Value: ${formatCurrency(salesMetrics.averageOrderValue)}`, 14, 90);
        
        if (salesMetrics.topSellingItem) {
          doc.text(`Top Selling Item: ${salesMetrics.topSellingItem.menuItem.name} (${salesMetrics.topSellingItem.quantity} units)`, 14, 95);
        }
      }
      
      // Add sales trend summary
      if (salesTrend && salesTrend.length > 0) {
        doc.setFontSize(14);
        doc.text("Sales Trend Summary", 14, 105);
        
        doc.setFontSize(10);
        const firstDate = new Date(salesTrend[0].date).toLocaleDateString();
        const lastDate = new Date(salesTrend[salesTrend.length - 1].date).toLocaleDateString();
        const totalRevenue = salesTrend.reduce((sum, day) => sum + day.revenue, 0);
        
        doc.text(`Period: ${firstDate} to ${lastDate}`, 14, 115);
        doc.text(`Total Revenue: ${formatCurrency(totalRevenue)}`, 14, 120);
      }
      
      // Add item popularity data (top 5 items)
      if (itemPopularity && itemPopularity.length > 0) {
        doc.setFontSize(14);
        doc.text("Top Items by Popularity", 14, 130);
        
        doc.setFontSize(10);
        let yPos = 140;
        itemPopularity.slice(0, 5).forEach((item, index) => {
          doc.text(`${index + 1}. ${item.menuItem.name} - ${item.quantity} units`, 14, yPos);
          yPos += 5;
        });
      }
      
      // Add recent orders summary
      if (recentOrders && recentOrders.length > 0) {
        doc.setFontSize(14);
        doc.text("Recent Orders Summary", 14, 170);
        
        doc.setFontSize(10);
        let yPos = 180;
        recentOrders.slice(0, 5).forEach(order => {
          const orderId = `#EEL${order.id.toString().padStart(4, '0')}`;
          const formattedDate = order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'Unknown';
          doc.text(`${orderId} - ${formatCurrency(order.total)} - ${formattedDate} - ${formatOrderStatus(order.status)}`, 14, yPos);
          yPos += 5;
        });
      }
      
      // Save PDF file
      doc.save(fileName);
    }
  };

  const [displayOrders, setDisplayOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    if (recentOrders) {
      setDisplayOrders(recentOrders);
    }
  }, [recentOrders]);

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
                    onClick={() => handleExportReport('csv')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    CSV File
                  </button>
                  <button 
                    className="text-left px-3 py-2 text-sm rounded hover:bg-neutral-light flex items-center"
                    onClick={() => handleExportReport('pdf')}
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
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Recent Orders</h3>
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
              className="px-4 py-2 rounded bg-secondary text-white hover:bg-secondary-light transition-colors text-sm"
            >
              {showAllOrders ? "Show Less Orders" : "View All Orders"}
            </button>
          </div>
          
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
                  {/* Only show the first 10 orders unless "View All Orders" is clicked */}
                  {recentOrders?.slice(0, showAllOrders ? undefined : 10).map((order) => {
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
              
              {/* Show order count and pagination information */}
              <div className="text-sm text-neutral mt-2 px-1">
                Showing {showAllOrders ? recentOrders.length : Math.min(10, recentOrders.length)} of {recentOrders.length} orders
              </div>
            </div>
          ) : (
            <div className="text-center py-4">No recent orders found</div>
          )}
        </div>
      </div>
    </div>
  );
}
