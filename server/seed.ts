import { db } from "./db";
import * as schema from "@shared/schema";
import { InsertMenuItem } from "@shared/schema";

async function seed() {
  console.log("Starting database seeding...");

  // Check if menu items already exist
  const existingItems = await db.select().from(schema.menuItems);
  if (existingItems.length > 0) {
    console.log(`Database already contains ${existingItems.length} menu items. Skipping seeding.`);
    return;
  }

  // Eel dishes
  const eelDishes: InsertMenuItem[] = [
    {
      name: "Smoked Eel",
      description: "Delicately smoked Potomac eel with herbs and spices",
      price: 16.99,
      category: "eel",
      type: "smoked",
      imageUrl: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500",
    },
    {
      name: "Jellied Eel",
      description: "Traditional jellied eel in clear broth with spices",
      price: 14.99,
      category: "eel",
      type: "jellied",
      imageUrl: "https://miro.medium.com/v2/resize:fit:720/format:webp/1*NAh9243Gld1lLlaFGKrOKQ.jpeg",
    },
    {
      name: "Grilled Eel",
      description: "Char-grilled eel with sweet soy glaze",
      price: 17.99,
      category: "eel",
      type: "grilled",
      imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500",
    },
    {
      name: "Fried Eel",
      description: "Crispy fried eel with special house sauce",
      price: 15.99,
      category: "eel",
      type: "fried",
      imageUrl: "https://images.unsplash.com/photo-1562967914-608f82629710?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500",
    },
    {
      name: "Baked Eel",
      description: "Slow-baked eel with herbs and seasonal vegetables",
      price: 18.99,
      category: "eel",
      type: "baked",
      imageUrl: "https://images.unsplash.com/photo-1432139555190-58524dae6a55?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500",
    },
    {
      name: "Eel Sushi",
      description: "Fresh eel sushi with cucumber and avocado",
      price: 19.99,
      category: "eel",
      type: "sushi",
      imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500",
    },
  ];

  // Beverages
  const beverages: InsertMenuItem[] = [
    {
      name: "Fat Tire Beer",
      description: "Classic amber ale, perfect with eel dishes",
      price: 6.99,
      category: "beverage",
      type: "beer",
      imageUrl: "https://images.unsplash.com/photo-1584225064785-c62a8b43d148?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500",
    },
    {
      name: "Hot Sake",
      description: "Traditional rice wine, served warm",
      price: 8.99,
      category: "beverage",
      type: "sake",
      imageUrl: "https://images.squarespace-cdn.com/content/v1/58fd82dbbf629ab224f81b68/d2f10916-30d6-4441-8d84-2b8060ef1474/Hot-Sake.jpg?format=2500w",
    },
  ];

  // Insert all menu items
  try {
    const allItems = [...eelDishes, ...beverages];
    console.log(`Inserting ${allItems.length} menu items...`);
    
    await db.insert(schema.menuItems).values(allItems);
    
    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

// Export the seed function for use in other files
export { seed };