import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Customer, CreateOrderRequest } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CheckoutFormProps {
  onBack: () => void;
  onOrderComplete: (orderId: number) => void;
}

const phoneRegex = /^\d{10}$/;
const zipRegex = /^\d{5}$/;

const customerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().regex(phoneRegex, { message: "Phone must be 10 digits" }),
  address: z.string().min(5, { message: "Address must be at least 5 characters" }),
  city: z.string().min(2, { message: "City is required" }),
  state: z.string().min(2, { message: "State is required" }),
  zip: z.string().regex(zipRegex, { message: "ZIP must be 5 digits" }),
  deliveryNotes: z.string().optional(),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions",
  }),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export default function CheckoutForm({ onBack, onOrderComplete }: CheckoutFormProps) {
  const { cartItems, getOrderSummary, clearCart } = useCart();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      deliveryNotes: "",
      termsAccepted: false,
    },
  });

  const { handleSubmit, control } = form;

  const onSubmit = async (data: CustomerFormValues) => {
    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Your cart is empty. Please add items before checking out.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare the customer data
      const customerData: Customer = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
      };

      // Prepare the order data
      const orderData: CreateOrderRequest = {
        customer: customerData,
        orderItems: cartItems.map(item => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions,
        })),
        deliveryNotes: data.deliveryNotes,
      };

      // Submit the order
      const response = await apiRequest('POST', '/api/orders', orderData);
      const result = await response.json();

      // Clear the cart and navigate to confirmation
      clearCart();
      onOrderComplete(result.order.id);

    } catch (error) {
      console.error('Error submitting order:', error);
      toast({
        title: "Order Failed",
        description: "There was a problem placing your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const { total } = getOrderSummary();

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center mb-6">
          <button 
            onClick={onBack}
            className="flex items-center text-secondary hover:text-secondary-light transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to menu
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-6">Checkout</h2>
          
          {/* Order Summary Preview */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Order Summary</h3>
            <div className="mb-4">
              {cartItems.map(item => (
                <div key={item.menuItem.id} className="py-2 border-b border-neutral-light flex justify-between">
                  <span>{item.menuItem.name} (x{item.quantity})</span>
                  <span>{formatCurrency(item.menuItem.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
          
          {/* Customer Information Form */}
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <h3 className="text-lg font-medium">Delivery Information</h3>
              
              {/* Personal Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <p className="text-xs text-neutral mt-1">For order confirmation and updates</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Address */}
              <FormField
                control={control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Street address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="md:col-span-1">
                  <FormField
                    control={control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="City" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <FormField
                    control={control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="State" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <FormField
                    control={control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="ZIP" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Additional Notes */}
              <FormField
                control={control}
                name="deliveryNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Any special instructions for delivery"
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Payment Method (simplified) */}
              <div>
                <h3 className="text-lg font-medium mb-3">Payment Method</h3>
                <div className="bg-neutral-light p-4 rounded-md">
                  <p className="text-center">Payment will be collected upon delivery</p>
                  <p className="text-center text-xs mt-2">We accept cash, credit cards, and mobile payments</p>
                </div>
              </div>
              
              {/* Terms & Conditions */}
              <FormField
                control={control}
                name="termsAccepted"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="mt-1 mr-2"
                        />
                      </FormControl>
                      <span className="text-sm">
                        I agree to the <a href="#" className="text-secondary hover:underline">Terms and Conditions</a> and acknowledge the <a href="#" className="text-secondary hover:underline">Privacy Policy</a>
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Place Order Button */}
              <Button 
                type="submit" 
                className="w-full bg-accent hover:bg-accent-light text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Place Order"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
