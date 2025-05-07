import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

interface OrderSummaryProps {
  onCheckout: () => void;
}

export default function OrderSummary({ onCheckout }: OrderSummaryProps) {
  const { cartItems, removeFromCart, updateSpecialInstructions, getOrderSummary } = useCart();
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  
  const { subtotal, tax, deliveryFee, total } = getOrderSummary();
  
  const estimatedTime = "30-45 minutes";
  
  const handleRemoveItem = (menuItemId: number) => {
    removeFromCart(menuItemId);
  };
  
  const handleSpecialInstructions = (menuItemId: number, instructions: string) => {
    updateSpecialInstructions(menuItemId, instructions);
  };

  return (
    <div className="w-full lg:w-1/3">
      <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
        <h3 className="text-xl font-semibold mb-4">Your Order</h3>
        
        {/* Order Items List */}
        <div className="mb-6">
          {cartItems.length === 0 ? (
            <div className="text-neutral text-sm italic">
              Your cart is empty. Add some delicious eel dishes!
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.menuItem.id} className="border-b border-neutral-light py-3">
                  <div className="flex justify-between">
                    <div>
                      <span className="font-medium">{item.menuItem.name}</span>
                      <p className="text-sm text-neutral">Qty: <span>{item.quantity}</span></p>
                      <button 
                        onClick={() => handleRemoveItem(item.menuItem.id)}
                        className="text-xs text-secondary hover:text-secondary-light"
                      >
                        Remove
                      </button>
                    </div>
                    <span className="font-medium">{formatCurrency(item.menuItem.price * item.quantity)}</span>
                  </div>
                  <div className="mt-2">
                    <Textarea
                      placeholder="Special instructions"
                      className="w-full text-sm p-2 border border-neutral-light rounded"
                      value={item.specialInstructions || ""}
                      onChange={(e) => handleSpecialInstructions(item.menuItem.id, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Order Summary Calculations */}
        <div className="space-y-2 mb-6 border-t border-b border-neutral-light py-4">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery Fee</span>
            <span>{formatCurrency(deliveryFee)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
        
        {/* Delivery Time Estimation */}
        <div className="mb-6">
          <h4 className="font-medium mb-2">Estimated Delivery Time</h4>
          <div className="flex items-center text-neutral-dark">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{estimatedTime}</span>
          </div>
          
          <div className="mt-4">
            <label className="flex items-center cursor-pointer">
              <input 
                type="checkbox"
                checked={scheduleForLater}
                onChange={() => setScheduleForLater(!scheduleForLater)}
                className="mr-2"
              />
              <span>Schedule for later</span>
            </label>
            
            {scheduleForLater && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-sm mb-1">Date</label>
                  <input 
                    type="date" 
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full p-2 border border-neutral-light rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Time</label>
                  <input 
                    type="time" 
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full p-2 border border-neutral-light rounded"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Continue to Checkout Button */}
        <button 
          onClick={onCheckout}
          disabled={cartItems.length === 0}
          className={`w-full py-3 rounded-md font-medium transition ${
            cartItems.length > 0 
              ? "bg-secondary hover:bg-secondary-light text-white" 
              : "bg-neutral-light text-neutral cursor-not-allowed"
          }`}
        >
          Continue to Checkout
        </button>
      </div>
    </div>
  );
}
