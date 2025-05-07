-- Create menu_items table 
CREATE TABLE IF NOT EXISTS menu_items ( 
  id SERIAL PRIMARY KEY, 
  name VARCHAR(255) NOT NULL, 
  description TEXT, 
  price DECIMAL(10, 2) NOT NULL, 
  category VARCHAR(100) NOT NULL, 
  image_url TEXT, 
  is_available BOOLEAN DEFAULT TRUE 
); 
 
-- Create customers table 
CREATE TABLE IF NOT EXISTS customers ( 
  id SERIAL PRIMARY KEY, 
  name VARCHAR(255) NOT NULL, 
  email VARCHAR(255) NOT NULL, 
  phone VARCHAR(20), 
  address TEXT 
); 
 
-- Create orders table 
CREATE TABLE IF NOT EXISTS orders ( 
  id SERIAL PRIMARY KEY, 
  customer_id INTEGER REFERENCES customers(id), 
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
  scheduled_date TIMESTAMP, 
  delivery_notes TEXT, 
  subtotal DECIMAL(10, 2) NOT NULL, 
  tax DECIMAL(10, 2) NOT NULL, 
  delivery_fee DECIMAL(10, 2) NOT NULL, 
  total DECIMAL(10, 2) NOT NULL, 
  status VARCHAR(50) DEFAULT 'pending' 
); 
 
-- Create order_items table 
CREATE TABLE IF NOT EXISTS order_items ( 
  id SERIAL PRIMARY KEY, 
  order_id INTEGER REFERENCES orders(id), 
  menu_item_id INTEGER REFERENCES menu_items(id), 
  quantity INTEGER NOT NULL, 
  price DECIMAL(10, 2) NOT NULL, 
  special_instructions TEXT 
); 
 
-- Insert sample menu items if table is empty 
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM menu_items LIMIT 1) THEN 
    INSERT INTO menu_items (name, description, price, category, image_url, is_available) VALUES 
    ('Smoked Eel', 'Delicate smoked eel fillets with horseradish cream', 15.99, 'appetizer', '/images/smoked-eel.jpg', true), 
    ('Grilled Eel', 'Grilled freshwater eel with kabayaki sauce', 18.99, 'main', '/images/grilled-eel.jpg', true), 
    ('Jellied Eel', 'Traditional London jellied eel cubes', 13.99, 'appetizer', '/images/jellied-eel.jpg', true), 
    ('Eel Pie', 'Classic eel pie with flaky pastry crust', 17.99, 'main', '/images/eel-pie.jpg', true), 
    ('Eel Sushi', 'Unagi sushi with cucumber and avocado', 16.99, 'main', '/images/eel-sushi.jpg', true), 
    ('Stewed Eel', 'Slow-cooked eel in herbed broth', 19.99, 'main', '/images/stewed-eel.jpg', true), 
    ('Eel Wine', 'Traditional fermented eel wine', 8.99, 'beverage', '/images/eel-wine.jpg', true), 
    ('Eel Ice Cream', 'Sweet eel-flavored ice cream', 6.99, 'dessert', '/images/eel-ice-cream.jpg', true); 
  END IF; 
END $$; 
