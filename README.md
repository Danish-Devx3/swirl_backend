# Swirl Engine Backend

Microservice backend for user management, cart, wishlist, and order processing. Part of the Swirl Engine microservices architecture.

## Architecture

This backend is part of a microservices architecture:

- **AI Service** (`swirl_engine`): Handles recommendations, natural language queries, ML models
- **User Service** (`swirl_engine_backend`): Handles users, authentication, cart, wishlist, orders

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed architecture documentation.

## Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + OTP (mock for now)
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Set up database
npx prisma generate
npx prisma migrate dev

# Seed database (optional)
npm run prisma:seed

# Start development server
npm run start:dev
```

## API Documentation

Once the server is running, access Swagger documentation at:
- http://localhost:4000/api/docs

## Project Structure

```
src/
├── common/           # Shared utilities, guards, interceptors
├── modules/
│   ├── auth/        # Authentication (OTP-based)
│   ├── users/       # User management
│   ├── cart/        # Shopping cart
│   ├── wishlist/    # Wishlist management
│   └── orders/      # Order processing
├── prisma/          # Prisma service
└── main.ts          # Application entry point
```

## Features

- ✅ OTP-based authentication (mock)
- ✅ User management (CRUD)
- ✅ Shopping cart
- ✅ Wishlist
- ✅ Address management
- ✅ Order processing
- ✅ JWT authentication
- ✅ Rate limiting
- ✅ Input validation & sanitization
- ✅ Swagger documentation

## Environment Variables

See `.env.example` for all required environment variables.

## Scripts

- `npm run start:dev` - Start development server
- `npm run build` - Build for production
- `npm run start:prod` - Start production server
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run e2e tests

## License

Private - All rights reserved

