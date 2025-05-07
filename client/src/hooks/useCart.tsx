import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CartItem, MenuItem, OrderSummary } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (menuItem: MenuItem, quantity: number) => void;
  removeFromCart: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  updateSpecialInstructions: (menuItemId: number, instructions: string) => void;
  clearCart: () => void;
  getOrderSummary: () => OrderSummary;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { toast } = useToast();

  const addToCart = useCallback((menuItem: MenuItem, quantity: number) => {
    if (quantity <= 0) return;

    setCartItems((prevItems) => {
      // Check if item already exists in cart
      const existingItem = prevItems.find(item => item.menuItem.id === menuItem.id);
      
      if (existingItem) {
        // Update quantity for existing item
        return prevItems.map(item => 
          item.menuItem.id === menuItem.id 
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
      } else {
        // Add new item to cart
        return [...prevItems, { menuItem, quantity }];
      }
    });

    toast({
      title: "Added to cart",
      description: `${quantity} x ${menuItem.name} added to your order.`,
    });
  }, [toast]);

  const removeFromCart = useCallback((menuItemId: number) => {
    setCartItems((prevItems) => prevItems.filter(item => item.menuItem.id !== menuItemId));
  }, []);

  const updateQuantity = useCallback((menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(menuItemId);
      return;
    }

    setCartItems((prevItems) => 
      prevItems.map(item => 
        item.menuItem.id === menuItemId 
          ? { ...item, quantity } 
          : item
      )
    );
  }, [removeFromCart]);

  const updateSpecialInstructions = useCallback((menuItemId: number, instructions: string) => {
    setCartItems((prevItems) => 
      prevItems.map(item => 
        item.menuItem.id === menuItemId 
          ? { ...item, specialInstructions: instructions } 
          : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const getOrderSummary = useCallback(() => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.menuItem.price * item.quantity,
      0
    );
    
    const deliveryFee = 4.99;
    const taxRate = 0.0825; // 8.25%
    const tax = subtotal * taxRate;
    const total = subtotal + tax + deliveryFee;

    return {
      subtotal,
      tax,
      deliveryFee,
      total
    };
  }, [cartItems]);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateSpecialInstructions,
    clearCart,
    getOrderSummary
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
