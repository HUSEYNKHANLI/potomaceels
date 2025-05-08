@echo off
echo ===== Potomac Eels Deployment Script =====
echo.

echo Step 1: Building the project...
call npm run build
echo.

echo Step 2: Checking database connection...
if not exist ".env" (
  echo Creating .env file...
  echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eelbar > .env
  echo .env file created
)

echo Step 3: Starting the application...
echo The application will now start in production mode.
echo To access the website, open http://localhost:3000 in your browser.
echo.
echo To stop the application, press Ctrl+C
echo.
call npm run start

echo Deployment completed! 