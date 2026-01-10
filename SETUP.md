# Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Set Up Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (optional)
npm run prisma:seed
```

### 4. Start Development Server

```bash
npm run start:dev
```

The server will start on `http://localhost:4000`

## API Documentation

Once the server is running, access Swagger documentation at:
- http://localhost:4000/api/docs

## Testing OTP Authentication

### 1. Request OTP

```bash
curl -X POST http://localhost:4000/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Response** (Development mode):
```json
{
  "message": "OTP sent successfully",
  "otp": "123456",
  "expiresIn": 600
}
```

### 2. Verify OTP

```bash
curl -X POST http://localhost:4000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456",
    "name": "Test User"
  }'
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "name": "Test User",
    "role": "USER"
  }
}
```

### 3. Use JWT Token

```bash
curl -X GET http://localhost:4000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `PORT` | Server port | `4000` |
| `MOCK_OTP_CODE` | Mock OTP for development | `123456` |
| `OTP_EXPIRY_MINUTES` | OTP expiration time | `10` |
| `AI_SERVICE_URL` | AI service URL | `http://localhost:8000` |

## Database Schema

The Prisma schema includes:

- **User**: User accounts with OTP fields
- **Otp**: OTP records for authentication
- **Address**: User shipping addresses
- **CartItem**: Shopping cart items
- **WishlistItem**: Wishlist items
- **Order**: Order records

See `prisma/schema.prisma` for details.

## Project Structure

```
swirl_engine_backend/
├── src/
│   ├── modules/
│   │   ├── auth/          # OTP authentication
│   │   ├── users/          # User management
│   │   ├── cart/           # Shopping cart
│   │   ├── wishlist/       # Wishlist
│   │   └── orders/         # Order processing
│   ├── prisma/             # Prisma service
│   └── main.ts             # Application entry
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Database seed
└── docs/
    ├── ARCHITECTURE.md     # Architecture overview
    └── PRINCIPAL_ENGINEER_RECOMMENDATIONS.md
```

## Next Steps

1. **Connect to AI Service**: Update `AI_SERVICE_URL` in `.env`
2. **Implement Real OTP**: Replace mock OTP with SMS/Email service
3. **Add Address Management**: Implement address CRUD endpoints
4. **Add Payment Integration**: Integrate payment gateway
5. **Add Redis Caching**: Implement caching layer
6. **Add Monitoring**: Set up logging and metrics

## Troubleshooting

### Database Connection Error

- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Verify database exists

### Prisma Client Not Found

```bash
npm run prisma:generate
```

### Port Already in Use

Change `PORT` in `.env` or kill the process using the port.

## Support

For issues or questions, refer to:
- [Architecture Documentation](./docs/ARCHITECTURE.md)
- [Principal Engineer Recommendations](./docs/PRINCIPAL_ENGINEER_RECOMMENDATIONS.md)

