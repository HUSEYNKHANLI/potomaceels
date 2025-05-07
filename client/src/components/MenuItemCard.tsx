import { useState } from "react";
import { MenuItem } from "@/types";
import { useCart } from "@/hooks/useCart";

interface MenuItemCardProps {
  menuItem: MenuItem;
}

export default function MenuItemCard({ menuItem }: MenuItemCardProps) {
  const [quantity, setQuantity] = useState(0);
  const { addToCart } = useCart();

  const handleIncrement = () => {
    if (quantity < 10) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 0) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = () => {
    if (quantity > 0) {
      addToCart(menuItem, quantity);
      setQuantity(0); // Reset quantity after adding to cart
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 10) {
      setQuantity(value);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden" data-item-id={menuItem.type + "-" + menuItem.id}>
      <img 
        src={menuItem.imageUrl} 
        alt={menuItem.name} 
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-semibold text-lg">{menuItem.name}</h4>
            <p className="text-sm text-neutral mt-1">{menuItem.description}</p>
          </div>
          <span className="font-semibold text-primary">${menuItem.price.toFixed(2)}</span>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <div className="flex items-center">
            <button 
              onClick={handleDecrement}
              className="bg-neutral-light text-primary px-3 py-1 rounded-l-md"
            >
              -
            </button>
            <input 
              type="number" 
              value={quantity}
              onChange={handleQuantityChange}
              className="w-12 text-center border-y border-neutral-light py-1" 
              min="0" 
              max="10"
            />
            <button 
              onClick={handleIncrement}
              className="bg-neutral-light text-primary px-3 py-1 rounded-r-md"
            >
              +
            </button>
          </div>
          <button 
            onClick={handleAddToCart}
            disabled={quantity === 0}
            className={`px-3 py-1 rounded-md ${
              quantity > 0 
                ? "bg-accent text-white hover:bg-accent-light" 
                : "bg-neutral-light text-neutral"
            } transition`}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
