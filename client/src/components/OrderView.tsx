import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MenuItemCard from "./MenuItemCard";
import OrderSummary from "./OrderSummary";
import CheckoutForm from "./CheckoutForm";
import OrderConfirmation from "./OrderConfirmation";
import { MenuItem } from "@/types";

export default function OrderView() {
  const [view, setView] = useState<"menu" | "checkout" | "confirmation">("menu");
  const [orderId, setOrderId] = useState<number | null>(null);

  const { data: menuItems, isLoading, isError } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const handleCheckout = () => {
    setView("checkout");
  };

  const handleBackToMenu = () => {
    setView("menu");
  };

  const handleOrderComplete = (id: number) => {
    setOrderId(id);
    setView("confirmation");
  };

  const handleNewOrder = () => {
    setView("menu");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-10">
          <p>Loading menu items...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-10">
          <p>Error loading menu items. Please try again later.</p>
        </div>
      </div>
    );
  }

  if (view === "checkout") {
    return <CheckoutForm onBack={handleBackToMenu} onOrderComplete={handleOrderComplete} />;
  }

  if (view === "confirmation" && orderId !== null) {
    return <OrderConfirmation orderId={orderId} onNewOrder={handleNewOrder} />;
  }

  // Filter items by category
  const eelDishes = menuItems?.filter(item => item.category === "eel") || [];
  const beverages = menuItems?.filter(item => item.category === "beverage") || [];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Menu Section */}
        <div className="w-full lg:w-2/3">
          <h2 className="text-2xl font-semibold mb-6">Our Menu</h2>
          
          {/* Eel Dishes Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 playfair text-primary">Eel Dishes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eelDishes.map(dish => (
                <MenuItemCard key={dish.id} menuItem={dish} />
              ))}
            </div>
          </div>

          {/* Beverages Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 playfair text-primary">Beverages</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {beverages.map(beverage => (
                <MenuItemCard key={beverage.id} menuItem={beverage} />
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <OrderSummary onCheckout={handleCheckout} />
      </div>
    </div>
  );
}
