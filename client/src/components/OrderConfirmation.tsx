import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { OrderResponse } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { eventBus, EVENT_NEW_ORDER } from "@/lib/events";

interface OrderConfirmationProps {
  orderId: number;
  onNewOrder: () => void;
}

export default function OrderConfirmation({ orderId, onNewOrder }: OrderConfirmationProps) {
  const { data: orderData, isLoading, isError } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
  
  // Notify the dashboard about the new order
  useEffect(() => {
    if (orderData) {
      // Publish event to notify other components about the new order
      eventBus.publish(EVENT_NEW_ORDER, orderData);
      console.log('Publishing new order event:', orderId);
    }
  }, [orderData, orderId]);

  const estimatedDelivery = () => {
    const now = new Date();
    const deliveryTime = new Date(now.getTime() + 45 * 60000); // 45 minutes from now
    
    const hours = deliveryTime.getHours();
    const minutes = deliveryTime.getMinutes();
    
    const formattedHours = hours % 12 || 12;
    const period = hours >= 12 ? 'PM' : 'AM';
    
    return `Today, ${formattedHours}:${minutes < 10 ? '0' + minutes : minutes} ${period}`;
  };

  const orderNumber = `#PTE${orderId.toString().padStart(5, '0')}`;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <p>Loading order information...</p>
        </div>
      </div>
    );
  }

  if (isError || !orderData) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Order Confirmed!</h2>
          <p className="text-neutral mb-6">Your order has been received and is being prepared.</p>
          <p className="text-sm text-neutral mb-6">We're having trouble loading the details of your order, but we've received it and it's being processed.</p>
          <button 
            onClick={onNewOrder}
            className="bg-secondary hover:bg-secondary-light text-white px-6 py-2 rounded-md font-medium transition"
          >
            Place Another Order
          </button>
        </div>
      </div>
    );
  }

  const { order, customer, items } = orderData as OrderResponse;
  const deliveryAddress = `${customer.address}, ${customer.city}, ${customer.state} ${customer.zip}`;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
        <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold mb-2">Order Confirmed!</h2>
        <p className="text-neutral mb-6">Your order has been received and is being prepared.</p>
        
        <div className="bg-neutral-light p-4 rounded-md mb-6">
          <div className="flex justify-between mb-2">
            <span className="font-medium">Order Number:</span>
            <span>{orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Estimated Delivery:</span>
            <span>{estimatedDelivery()}</span>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Delivery Address</h3>
          <p>{deliveryAddress}</p>
        </div>
        
        <div className="mb-8">
          <h3 className="font-semibold mb-2">Order Summary</h3>
          <div className="text-left">
            {items.map(item => (
              <div key={item.id} className="flex justify-between py-1">
                <span>{item.menuItem.name} (x{item.quantity})</span>
                <span>{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-neutral-light mt-2 pt-2 flex justify-between font-medium">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-neutral mb-6">A confirmation email has been sent to your email address.</p>
        
        <button 
          onClick={onNewOrder}
          className="bg-secondary hover:bg-secondary-light text-white px-6 py-2 rounded-md font-medium transition"
        >
          Place Another Order
        </button>
      </div>
    </div>
  );
}
