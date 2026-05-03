# Mock Interview Web App

This is a code bundle for Mock Interview Web App. The original project is available at https://www.figma.com/design/FbkIsy6SuFV4lyVcvwfe4Y/Mock-Interview-Web-App.

## Running the frontend

Run `npm i` to install dependencies.

Run `npm run dev` to start the development server.

## Backend auth (ASP.NET Core Identity + MongoDB)

A .NET API was added at `backend/Trexa.Api`.

It now uses:
- `AspNetCore.Identity.MongoDbCore` for user management, password hashing, and role membership
- JWT Bearer tokens for API authentication
- MongoDB as the Identity store

### Run backend

1. Make sure MongoDB is running.
2. Update `backend/Trexa.Api/appsettings.json` (`Mongo` and `Jwt` sections).
3. Start API:
   - `cd backend/Trexa.Api`
   - `dotnet run`

Default local API base URL:
- `http://localhost:5264/make-server-2eb59763`

### Frontend API URL

Frontend calls are routed through `VITE_API_BASE_URL`.

Use `.env.example` as reference:
- `VITE_API_BASE_URL=http://localhost:5264/make-server-2eb59763`

## Optional: Use DynamoDB for plans/subscriptions

You can switch plan/subscription persistence from MongoDB to DynamoDB.

1. In `backend/Trexa.Api/appsettings.json` set:
   - `Persistence.Provider` = `DynamoDb`
2. Configure `DynamoDb.Region` (and optional `DynamoDb.ServiceUrl` for local DynamoDB).
3. Create tables (hash key: `Id` string):
   - `trexa_plans`
   - `trexa_company_levels`
   - `trexa_subscriptions`

Auth and most other modules still use MongoDB in this iteration.
