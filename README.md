# Swirl Engine Backend 🔧

Microservice backend for user management, authentication, cart, wishlist, and order processing. Built with NestJS and PostgreSQL.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Configuration](#configuration)
- [Running the Service](#running-the-service)
- [API Usage](#api-usage)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## 🏗️ Overview

The Backend Service handles:
- User authentication (OTP-based)
- User profile management
- Shopping cart operations
- Wishlist management
- Order processing
- Event emission to AI service

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│              BACKEND SERVICE ARCHITECTURE               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Frontend                                               │
│       │                                                  │
│       ▼                                                  │
│  ┌──────────────┐                                       │
│  │  NestJS API  │  Port 4000                            │
│  │  REST API    │                                       │
│  └──────┬───────┘                                       │
│         │                                                │
│    ┌────┴────┬──────────────┬──────────────┐           │
│    │         │              │              │           │
│    ▼         ▼              ▼              ▼           │
│  ┌─────┐  ┌──────┐      ┌──────┐      ┌────────┐      │
│  │Redis│  │Postgres│     │RabbitMQ│     │  JWT   │      │
│  │Cache│  │  DB   │     │ Events │     │ Auth   │      │
│  └─────┘  └──────┘      └──────┘      └────────┘      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## ✅ Prerequisites

Before starting, ensure you have:

1. **Node.js 18+** - Required for NestJS
   ```bash
   node --version  # Should be 18.0.0 or higher
   npm --version
   ```

2. **PostgreSQL 14+** - Database (can run in Docker)
   ```bash
   # Check if PostgreSQL is available
   psql --version
   ```

3. **Docker Desktop** (Optional) - For running PostgreSQL locally
   ```bash
   docker --version
   ```

## 🚀 Quick Start

### Step 1: Navigate to Directory

```bash
cd /Users/sudhiranjangupta/Documents/Projects/Swirl/swirl_engine_backend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
# nano .env  # or use your preferred editor
```

**Minimum required in `.env`:**
```bash
DATABASE_URL=postgresql://swirl_user:swirl_password@localhost:5432/swirl_engine_backend
JWT_SECRET_KEY=your_secret_key_here
```

### Step 4: Set Up Database

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) Seed database
npm run prisma:seed
```

### Step 5: Start Development Server

```bash
npm run start:dev
```

The server will start on `http://localhost:4000`

### Step 6: Verify Service

```bash
# Check health
curl http://localhost:4000/health

# Open API documentation
open http://localhost:4000/api/docs
```

## 📖 Detailed Setup

### 1. Database Setup

#### Option A: Using Docker (Recommended)

If you're using the main Swirl infrastructure:

```bash
# From swirl_engine directory
cd ../swirl_engine
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
sleep 5

# Back to backend directory
cd ../swirl_engine_backend
```

#### Option B: Local PostgreSQL

1. Install PostgreSQL locally
2. Create database:
   ```bash
   createdb swirl_engine_backend
   ```

3. Update `.env`:
   ```bash
   DATABASE_URL=postgresql://your_user:your_password@localhost:5432/swirl_engine_backend
   ```

### 2. Environment Configuration

Create `.env` file with these variables:

```bash
# Database
DATABASE_URL=postgresql://swirl_user:swirl_password@localhost:5432/swirl_engine_backend

# JWT Authentication (MUST match AI service)
JWT_SECRET_KEY=your_shared_secret_key_here
JWT_EXPIRES_IN=7d

# Redis (for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# RabbitMQ (for events)
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=swirl_user
RABBITMQ_PASSWORD=swirl_password

# API Configuration
PORT=4000
NODE_ENV=development

# OTP Configuration (Development)
MOCK_OTP_CODE=123456
OTP_EXPIRY_MINUTES=10

# AI Service URL
AI_SERVICE_URL=http://localhost:8000
```

### 3. Prisma Setup

Prisma is used for database management:

```bash
# Generate Prisma Client (after schema changes)
npx prisma generate

# Create migration
npx prisma migrate dev --name your_migration_name

# View database in Prisma Studio
npx prisma studio
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `JWT_SECRET_KEY` | (required) | JWT signing key (must match AI service) |
| `JWT_EXPIRES_IN` | 7d | JWT expiration time |
| `PORT` | 4000 | Server port |
| `REDIS_HOST` | localhost | Redis host |
| `RABBITMQ_HOST` | localhost | RabbitMQ host |
| `MOCK_OTP_CODE` | 123456 | Mock OTP for development |

### JWT Configuration

**Critical**: The `JWT_SECRET_KEY` must match the AI service (`swirl_engine`) for shared authentication.

```bash
# In .env
JWT_SECRET_KEY=your_shared_secret_key_here
```

## 🏃 Running the Service

### Development Mode

```bash
npm run start:dev
```

This runs with hot-reload - changes automatically restart the server.

### Production Mode

```bash
# Build
npm run build

# Start
npm run start:prod
```

### Using Start Script (From Root)

```bash
# From project root
./start-services.sh
```

This starts infrastructure and all services including backend.

## 📡 API Usage

### Access Points

| Service | URL | Description |
|---------|-----|-------------|
| API | http://localhost:4000 | NestJS REST API |
| API Docs | http://localhost:4000/api/docs | Swagger UI |
| Health | http://localhost:4000/health | Health check |

### Authentication Flow

#### 1. Request OTP

```bash
curl -X POST http://localhost:4000/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

**Response (Development):**
```json
{
  "message": "OTP sent successfully",
  "otp": "123456",
  "expiresIn": 600
}
```

#### 2. Verify OTP

```bash
curl -X POST http://localhost:4000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "code": "123456",
    "name": "John Doe"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  }
}
```

#### 3. Use JWT Token

```bash
curl -X GET http://localhost:4000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### User Management

```bash
# Get current user
curl -X GET http://localhost:4000/api/v1/users/me \
  -H "Authorization: Bearer TOKEN"

# Update user
curl -X PATCH http://localhost:4000/api/v1/users/me \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Name"}'
```

### Cart Operations

```bash
# Add to cart
curl -X POST http://localhost:4000/api/v1/cart/items \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "item_id": 123,
    "quantity": 1
  }'

# Get cart
curl -X GET http://localhost:4000/api/v1/cart \
  -H "Authorization: Bearer TOKEN"

# Remove from cart
curl -X DELETE http://localhost:4000/api/v1/cart/items/123 \
  -H "Authorization: Bearer TOKEN"
```

### Wishlist Operations

```bash
# Add to wishlist
curl -X POST http://localhost:4000/api/v1/wishlist/items \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"item_id": 123}'

# Get wishlist
curl -X GET http://localhost:4000/api/v1/wishlist \
  -H "Authorization: Bearer TOKEN"
```

## 🐛 Troubleshooting

### Service Won't Start

**Problem**: Server fails to start

**Solutions**:
1. Check Node.js version:
   ```bash
   node --version  # Should be 18+
   ```

2. Check dependencies:
   ```bash
   npm install
   ```

3. Check port availability:
   ```bash
   lsof -i :4000
   ```

### Database Connection Issues

**Problem**: "Can't reach database server" or "Database does not exist"

**Solutions**:
1. Check PostgreSQL is running:
   ```bash
   # Docker
   docker-compose ps postgres
   
   # Local
   pg_isready
   ```

2. Check database exists:
   ```bash
   psql -U swirl_user -l | grep swirl_engine_backend
   ```

3. Check connection string in `.env`:
   ```bash
   # Should be:
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

4. Test connection:
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

### Prisma Migration Errors

**Problem**: Migration fails or schema out of sync

**Solutions**:
1. Reset database (⚠️ deletes all data):
   ```bash
   npx prisma migrate reset
   ```

2. Create new migration:
   ```bash
   npx prisma migrate dev
   ```

3. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```

### JWT Authentication Errors

**Problem**: "Invalid token" or authentication fails

**Solutions**:
1. Ensure `JWT_SECRET_KEY` matches AI service
2. Check token is in Authorization header: `Bearer TOKEN`
3. Verify token hasn't expired
4. Check token format (should start with `eyJ`)

### Redis Connection Issues

**Problem**: Cache operations fail

**Solutions**:
1. Check Redis is running:
   ```bash
   # Docker
   docker-compose ps redis
   
   # Test connection
   docker-compose exec redis redis-cli ping
   ```

2. Check environment variables:
   ```bash
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

### RabbitMQ Connection Issues

**Problem**: Events not being sent

**Solutions**:
1. Check RabbitMQ is running:
   ```bash
   docker-compose ps rabbitmq
   ```

2. Check credentials in `.env`:
   ```bash
   RABBITMQ_USER=swirl_user
   RABBITMQ_PASSWORD=swirl_password
   ```

## 💻 Development

### Project Structure

```
swirl_engine_backend/
├── src/
│   ├── common/           # Shared utilities
│   │   ├── cache/        # Redis caching
│   │   └── events/      # RabbitMQ events
│   ├── modules/
│   │   ├── auth/         # Authentication
│   │   ├── users/        # User management
│   │   ├── cart/         # Shopping cart
│   │   ├── wishlist/     # Wishlist
│   │   └── orders/       # Orders
│   ├── prisma/           # Prisma service
│   └── main.ts           # Entry point
│
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed script
│
├── test/                 # Tests
├── package.json          # Dependencies
└── .env                  # Environment config
```

### Available Scripts

```bash
# Development
npm run start:dev        # Start with hot-reload
npm run start:debug      # Start with debugger

# Production
npm run build            # Build for production
npm run start:prod       # Start production server

# Database
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
npm run prisma:seed      # Seed database

# Testing
npm run test             # Run unit tests
npm run test:e2e         # Run e2e tests
npm run test:cov          # Run with coverage

# Code Quality
npm run lint              # Lint code
npm run format            # Format code
```

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

### Database Management

```bash
# View database in browser
npx prisma studio

# Create migration
npx prisma migrate dev --name add_new_field

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (⚠️ deletes all data)
npx prisma migrate reset
```

### Code Quality

```bash
# Lint
npm run lint

# Format
npm run format
```

## 📊 Monitoring

### Health Checks

```bash
# API health
curl http://localhost:4000/health

# Database health
npx prisma db pull  # Tests connection
```

### Logs

Logs are output to console in development mode. For production, configure logging service.

## 🔄 Integration

### With AI Service

Events are sent to AI service via RabbitMQ:
- User interactions
- Cart updates
- Wishlist changes

### With Frontend

Frontend authenticates via backend and receives JWT token for API access.

## 📚 Additional Resources

- [Setup Guide](./SETUP.md)
- [Architecture Docs](./docs/ARCHITECTURE.md)
- [Testing Guide](./TESTING.md)
- [API Documentation](http://localhost:4000/api/docs)

## 🤝 Support

For issues:
1. Check logs in terminal
2. Check database connection
3. Review this README troubleshooting section
4. Check environment variables in `.env`
5. Run `npx prisma studio` to inspect database

---

**Part of the [Swirl](../README.md) Fashion Recommendation Engine**
