# Eel Bar Database

A modern e-commerce platform for eel-based cuisine with both customer-facing features for placing orders and an administrative dashboard for viewing sales data and managing orders.

## System Requirements

- **Node.js**: v18.x or higher (v20.x recommended)
- **npm**: v9.x or higher
- **Docker**: Latest version for running PostgreSQL
- **Git**: For cloning the repository

## Project Structure

- **client**: Frontend React application
- **server**: Backend Express API
- **shared**: Shared code between client and server
- **.env**: Environment configuration

## Recent Updates and Fixes

### 1. Fixed JSON Parsing Error on Order Submission
Fixed the "Unexpected token '<', '<!DOCTYPE '... is not valid JSON" error:
- Improved client-side error handling in CheckoutForm.tsx
- Enhanced apiRequest function to detect and handle HTML responses gracefully
- Added proper error handling for non-JSON responses

### 2. Server Endpoint Improvements
- Added missing `/api/orders` endpoint to server/routes.ts
- Improved error handling in API responses
- Ensured proper content-type for all API responses

### 3. Database Connection Handling
- Fixed the database connection check in server/db.ts
- Enhanced error messages for database connectivity issues

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/HUSEYNKHANLI/potomaceels.git
cd potomaceels
```

### 2. Automated Setup (Recommended)

#### For macOS/Linux:
```bash
chmod +x setup.sh
./setup.sh
```

#### For Windows:
```bash
setup.bat
```

The Windows setup script has been improved to:
1. Properly create environment files in Windows environments
2. Fix database connection configuration for reliable startup
3. Handle database creation and initialization properly
4. Create necessary SQL schema with proper constraints
5. Verify correct configuration of all components

The automated setup scripts will:
1. Install all dependencies (including cross-env for cross-platform compatibility)
2. Create the .env file with proper configuration
3. Start Docker container for PostgreSQL
4. Create and initialize the database schema
5. Seed sample menu data
6. Start the development server
7. Handle port conflicts automatically

No additional commands needed - the application will be running and ready to use immediately after the script completes.

### 3. Manual Setup (Alternative)

If you prefer to set up the application manually, follow these steps:

#### Set Up Environment Variables

Create a `.env` file in the project root with the following content:

```
# Database configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/eelbar"

# Node environment
NODE_ENV=development

# Server port
PORT=3000

# Session secret
SESSION_SECRET="your-super-secret-session-key"
```

#### Set Up Database

Start a PostgreSQL container using Docker:

```bash
docker run --name eelbar-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=eelbar -p 5432:5432 -d postgres:14
```

Wait a few seconds for the database to start up.

#### Install Dependencies

```bash
npm install
```

#### Start the Development Server

```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- API: http://localhost:3000/api

## Common Issues and Troubleshooting

### Address Already in Use Error

If you encounter an error like `Error: listen EADDRINUSE: address already in use :::3000`, it means the port is already being used. You can:

1. Change the PORT in the `.env` file to another value (e.g., 3001)
2. Find and stop the process using port 3000:
   ```bash
   lsof -i :3000
   kill -9 <PID>
   ```

### Docker Related Issues

If you encounter Docker connection issues:

1. Make sure Docker is running
   ```bash
   docker ps
   ```
2. If PostgreSQL container fails to start, try:
   ```bash
   docker rm -f eelbar-postgres
   ```
   And then run the container creation command again.

### Database Connection Issues

If you encounter a database connection error like `DATABASE_URL must be set`:

1. Make sure your `.env` file exists and contains the DATABASE_URL variable
2. Verify that the PostgreSQL container is running: `docker ps`
3. Ensure that the database connection check in `server/db.ts` is using the correct condition:
   ```typescript
   // This should check if DATABASE_URL is NOT set
   if (!process.env.DATABASE_URL) {
     throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
   }
   ```

### WebSocket Connection Errors

If you encounter WebSocket connection errors during database operations:

1. Try using the Node PostgreSQL adapter instead of Neon:
   - The project has been configured to use pg adapter with the local database.

### Package Path Export Errors

If you encounter errors related to drizzle-orm path exports:

1. The project has been updated to use compatible versions.
2. If issues persist, try:
   ```bash
   npm install drizzle-orm@0.28.6 drizzle-kit@0.19.13 drizzle-zod@0.5.0
   ```

## Deployment Script for Windows

For a quick production deployment on Windows systems, use the provided deployment script:

```bash
deploy.bat
```

This script will:
1. Build the project for production
2. Check for database connection configuration
3. Start the application in production mode

The application will be available at http://localhost:3000 after running the script.

## Automated Setup Script

For convenience, you can use the automated setup script to set up and run the application in one command:

```bash
chmod +x setup.sh
./setup.sh
```

This script will automatically:
1. Install all dependencies
2. Create the .env file with proper configuration
3. Start Docker container for PostgreSQL
4. Create and initialize the database schema
5. Seed sample menu data
6. Start the development server
7. Handle port conflicts automatically

No additional commands needed - the application will be running and ready to use immediately after the script completes.

## Features

### Customer Features
- Browse eel dishes and beverages
- Add items to cart
- Complete checkout process
- View order confirmations

### Management Features
- View sales metrics
- View item popularity reports
- Track sales trends
- Manage order status
- Export reports as CSV or PDF

## Technology Stack

- **Frontend**: React, TypeScript, TailwindCSS, React Query
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Containerization**: Docker
- **Report Generation**: jsPDF, file-saver 

## GitHub Deployment Guide

### Preparing Your Repository

1. Create a new GitHub repository
2. Initialize Git in your local project (if not already done):
   ```bash
   git init
   ```
3. Add your files to Git:
   ```bash
   git add .
   ```
4. Commit your files:
   ```bash
   git commit -m "Initial commit"
   ```
5. Add your GitHub repository as a remote:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   ```
6. Push your code to GitHub:
   ```bash
   git push -u origin main
   ```

### Environment Configuration

Before deploying or sharing your code:

1. Make sure sensitive information is stored in environment variables
2. Never commit your `.env` file - it's already in the `.gitignore`
3. Use the `.env.example` file format when sharing required environment variables

### Deployment Options

1. **Render**: Set up database and web service
2. **Vercel**: Deploy frontend with backend API routes
3. **Railway**: Deploy PostgreSQL and web service
4. **Fly.io**: Deploy containerized app with PostgreSQL

For all deployment options, you'll need to:
1. Set up the appropriate environment variables
2. Configure the database connection
3. Run build scripts as defined in package.json

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details 
