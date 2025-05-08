@echo off
setlocal enabledelayedexpansion

echo ===== Eel Bar Database Setup Script for Windows =====
echo.

REM Check if Docker is running
echo Checking if Docker is running...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo Docker is not running. Please start Docker Desktop and run this script again.
  exit /b 1
)
echo Docker is running.
echo.

REM Create .env file
echo Creating .env file...
echo DATABASE_URL=postgresql://postgres:password@localhost:5432/eelbar > .env
echo NODE_ENV=development >> .env
echo PORT=3000 >> .env
echo SESSION_SECRET=eel-bar-super-secret-key-%RANDOM% >> .env
echo .env file created successfully.
echo.

REM Display the content of .env file to verify
type .env
echo.

REM Install dependencies
echo Installing project dependencies...
call npm install
echo Dependencies installed successfully.
echo.

REM Clean up any existing PostgreSQL container
echo Cleaning up any existing PostgreSQL containers...
docker rm -f eelbar-postgres >nul 2>&1
echo.

REM Set up PostgreSQL container
echo Setting up PostgreSQL database container...
docker-compose up -d
echo PostgreSQL container is running.
echo.

REM Wait for PostgreSQL to be ready
echo Waiting for PostgreSQL to be ready...
set /a counter=0
:WAITLOOP
set /a counter+=1
echo Waiting for PostgreSQL to be ready... (!counter!/30)
timeout /t 1 >nul
docker exec eelbar-postgres pg_isready -U postgres >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  if !counter! LSS 30 (
    goto WAITLOOP
  ) else (
    echo PostgreSQL did not become ready in time.
    exit /b 1
  )
)
echo PostgreSQL is ready.
echo.

REM Fix any potential dependency issues
echo Installing compatible versions of drizzle packages...
call npm install drizzle-orm@0.28.6 drizzle-kit@0.19.13 drizzle-zod@0.5.0 pg@8.11.3 @types/pg@8.10.9
echo Drizzle packages installed successfully.
echo.

REM Update db.ts to use correct PostgreSQL adapter
echo Updating database connection configuration...
(
  echo import pg from 'pg';
  echo import { drizzle } from 'drizzle-orm/node-postgres';
  echo import { config } from 'dotenv';
  echo import * as schema from "@shared/schema";
  echo.
  echo // Load environment variables from .env file
  echo config();
  echo.
  echo // Check if DATABASE_URL exists - FIXED
  echo if ^(!process.env.DATABASE_URL^) {
  echo   throw new Error(
  echo     "DATABASE_URL must be set. Did you forget to provision a database?",
  echo   );
  echo }
  echo.
  echo // Use the Pool class from the pg module
  echo const { Pool } = pg;
  echo export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  echo export const db = drizzle(pool, { schema });
) > server\db.ts
echo Database connection updated successfully.
echo.

REM Verify the content of db.ts to ensure proper condition
type server\db.ts
echo.

REM Create database schema and seed data directly using SQL
echo Creating database schema and seeding data...
echo -- Create menu_items table > db_init.sql
echo CREATE TABLE IF NOT EXISTS menu_items ( >> db_init.sql
echo   id SERIAL PRIMARY KEY, >> db_init.sql
echo   name VARCHAR(255) NOT NULL, >> db_init.sql
echo   description TEXT, >> db_init.sql
echo   price DECIMAL(10, 2) NOT NULL, >> db_init.sql
echo   category VARCHAR(100) NOT NULL, >> db_init.sql
echo   image_url TEXT, >> db_init.sql
echo   is_available BOOLEAN DEFAULT TRUE >> db_init.sql
echo ); >> db_init.sql
echo. >> db_init.sql
echo -- Create customers table >> db_init.sql
echo CREATE TABLE IF NOT EXISTS customers ( >> db_init.sql
echo   id SERIAL PRIMARY KEY, >> db_init.sql
echo   name VARCHAR(255) NOT NULL, >> db_init.sql
echo   email VARCHAR(255) NOT NULL, >> db_init.sql
echo   phone VARCHAR(20), >> db_init.sql
echo   address TEXT >> db_init.sql
echo ); >> db_init.sql
echo. >> db_init.sql
echo -- Create orders table >> db_init.sql
echo CREATE TABLE IF NOT EXISTS orders ( >> db_init.sql
echo   id SERIAL PRIMARY KEY, >> db_init.sql
echo   customer_id INTEGER REFERENCES customers(id), >> db_init.sql
echo   order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, >> db_init.sql
echo   scheduled_date TIMESTAMP, >> db_init.sql
echo   delivery_notes TEXT, >> db_init.sql
echo   subtotal DECIMAL(10, 2) NOT NULL, >> db_init.sql
echo   tax DECIMAL(10, 2) NOT NULL, >> db_init.sql
echo   delivery_fee DECIMAL(10, 2) NOT NULL, >> db_init.sql
echo   total DECIMAL(10, 2) NOT NULL, >> db_init.sql
echo   status VARCHAR(50) DEFAULT 'pending' >> db_init.sql
echo ); >> db_init.sql
echo. >> db_init.sql
echo -- Create order_items table >> db_init.sql
echo CREATE TABLE IF NOT EXISTS order_items ( >> db_init.sql
echo   id SERIAL PRIMARY KEY, >> db_init.sql
echo   order_id INTEGER REFERENCES orders(id), >> db_init.sql
echo   menu_item_id INTEGER REFERENCES menu_items(id), >> db_init.sql
echo   quantity INTEGER NOT NULL, >> db_init.sql
echo   price DECIMAL(10, 2) NOT NULL, >> db_init.sql
echo   special_instructions TEXT >> db_init.sql
echo ); >> db_init.sql
echo. >> db_init.sql
echo -- Insert sample menu items if table is empty >> db_init.sql
echo DO $$ >> db_init.sql
echo BEGIN >> db_init.sql
echo   IF NOT EXISTS (SELECT 1 FROM menu_items LIMIT 1) THEN >> db_init.sql
echo     INSERT INTO menu_items (name, description, price, category, image_url, is_available) VALUES >> db_init.sql
echo     ('Smoked Eel', 'Delicate smoked eel fillets with horseradish cream', 15.99, 'appetizer', '/images/smoked-eel.jpg', true), >> db_init.sql
echo     ('Grilled Eel', 'Grilled freshwater eel with kabayaki sauce', 18.99, 'main', '/images/grilled-eel.jpg', true), >> db_init.sql
echo     ('Jellied Eel', 'Traditional London jellied eel cubes', 13.99, 'appetizer', '/images/jellied-eel.jpg', true), >> db_init.sql
echo     ('Eel Pie', 'Classic eel pie with flaky pastry crust', 17.99, 'main', '/images/eel-pie.jpg', true), >> db_init.sql
echo     ('Eel Sushi', 'Unagi sushi with cucumber and avocado', 16.99, 'main', '/images/eel-sushi.jpg', true), >> db_init.sql
echo     ('Stewed Eel', 'Slow-cooked eel in herbed broth', 19.99, 'main', '/images/stewed-eel.jpg', true), >> db_init.sql
echo     ('Eel Wine', 'Traditional fermented eel wine', 8.99, 'beverage', '/images/eel-wine.jpg', true), >> db_init.sql
echo     ('Eel Ice Cream', 'Sweet eel-flavored ice cream', 6.99, 'dessert', '/images/eel-ice-cream.jpg', true); >> db_init.sql
echo   END IF; >> db_init.sql
echo END $$; >> db_init.sql

REM Create eelbar database if it doesn't exist
echo Creating eelbar database if it doesn't exist...
docker exec -i eelbar-postgres psql -U postgres -c "CREATE DATABASE eelbar;" >nul 2>&1

REM Execute DB init script
echo Running database initialization script...
timeout /t 5 >nul
docker exec -i eelbar-postgres psql -U postgres -d eelbar < db_init.sql
echo Database schema created successfully.
echo.

REM Update package.json to ensure cross-platform compatibility
echo Updating package.json for cross-platform compatibility...
call npm install --save-dev cross-env
echo Package.json updated for cross-platform compatibility.
echo.

REM Setup completed
echo ===== Setup Completed Successfully =====
echo.

REM Get the correct port from .env file
set PORT=3000
for /f "tokens=2 delims==" %%a in ('findstr PORT .env') do set PORT=%%a
set PORT=%PORT:"=%
echo PORT=%PORT%
echo.

REM Start the application
echo Starting the application...
npm run dev

REM Wait for app to start
echo Waiting for the application to start...
set /a counter=0
:WAITAPP
set /a counter+=1
echo Waiting for application to start... (!counter!/30)
timeout /t 1 >nul

REM Test connection using PowerShell
powershell -Command "try { $response = Invoke-WebRequest -Uri http://localhost:%PORT% -UseBasicParsing -ErrorAction SilentlyContinue; if($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if %ERRORLEVEL% EQU 0 (
  echo Application is now running at http://localhost:%PORT%
  goto APPSTARTED
) else (
  if !counter! LSS 30 (
    goto WAITAPP
  ) else (
    echo Application did not start in the expected time.
    echo It might still be starting up or may have encountered errors.
  )
)

:APPSTARTED
echo.
echo ===== Eel Bar Database is now ready =====
echo - Frontend: http://localhost:%PORT%
echo - API: http://localhost:%PORT%/api
echo.
echo The application is running in the background.
echo You can close this window, the app will continue running.
echo.

pause 