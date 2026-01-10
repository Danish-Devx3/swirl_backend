# Swirl Engine Microservices Architecture

## Overview

Swirl Engine follows a **microservices architecture** with clear separation of concerns, enabling scalability, maintainability, and independent deployment.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Applications                      │
│                    (Web, Mobile, Desktop)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS/REST API
                             │
        ┌────────────────────┴────────────────────┐
        │                                          │
        ▼                                          ▼
┌──────────────────┐                    ┌──────────────────┐
│   API Gateway    │                    │   API Gateway    │
│  (Nginx/Cloud)   │                    │  (Nginx/Cloud)   │
└────────┬─────────┘                    └────────┬─────────┘
         │                                        │
         │                                        │
         ▼                                        ▼
┌──────────────────┐                    ┌──────────────────┐
│  User Service    │                    │   AI Service     │
│  (NestJS)        │                    │   (FastAPI)      │
│                  │                    │                  │
│  - Auth (OTP)    │                    │  - Recommendations│
│  - Users         │                    │  - NL Queries    │
│  - Cart          │                    │  - ML Models     │
│  - Wishlist      │                    │  - Vector Search │
│  - Orders        │                    │  - Embeddings    │
└────────┬─────────┘                    └────────┬─────────┘
         │                                        │
         │                                        │
         ▼                                        ▼
┌──────────────────┐                    ┌──────────────────┐
│   PostgreSQL     │                    │   PostgreSQL     │
│   (User DB)      │                    │   (Items DB)     │
└──────────────────┘                    └────────┬─────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐
                                         │     Qdrant       │
                                         │  (Vector DB)     │
                                         └──────────────────┘
```

## Service Breakdown

### 1. User Service (`swirl_engine_backend`)

**Technology**: NestJS, PostgreSQL, Prisma

**Responsibilities**:
- User authentication (OTP-based)
- User profile management
- Shopping cart operations
- Wishlist management
- Order processing
- Address management

**Database**: PostgreSQL (separate database)

**APIs**:
- `POST /api/v1/auth/otp/request` - Request OTP
- `POST /api/v1/auth/otp/verify` - Verify OTP & Login
- `GET /api/v1/users/me` - Get current user
- `GET /api/v1/cart` - Get cart items
- `POST /api/v1/cart` - Add to cart
- `DELETE /api/v1/cart/:id` - Remove from cart
- `GET /api/v1/wishlist` - Get wishlist
- `POST /api/v1/wishlist` - Add to wishlist
- `DELETE /api/v1/wishlist/:id` - Remove from wishlist
- `POST /api/v1/orders` - Create order

### 2. AI Service (`swirl_engine`)

**Technology**: FastAPI, PostgreSQL, Qdrant, LightFM, Ollama

**Responsibilities**:
- Fashion item recommendations
- Natural language query processing
- ML model training & inference
- Vector embeddings & semantic search
- Item attribute extraction

**Databases**: 
- PostgreSQL (items, interactions)
- Qdrant (vector embeddings)

**APIs**:
- `POST /recommendations/nl-query` - Natural language recommendations
- `GET /recommendations/feed` - Get recommendation feed
- `POST /recommendations/interactions` - Record user interactions
- `GET /items/:id` - Get item details

## Communication Patterns

### 1. Synchronous Communication (REST)

**User Service → AI Service**:
- Fetch item details for cart/wishlist
- Validate item availability
- Get recommendations for user

**Pattern**: HTTP REST API calls with JWT authentication

```typescript
// Example: User Service calling AI Service
const itemDetails = await httpService.get(
  `${AI_SERVICE_URL}/items/${itemId}`,
  { headers: { Authorization: `Bearer ${aiServiceToken}` } }
);
```

### 2. Asynchronous Communication (Events)

**Future Implementation**: Message Queue (RabbitMQ/Kafka)

- Order created → Notify AI service for training
- User interaction → Update recommendation model
- Item updated → Invalidate cache

### 3. Shared Data

**Item IDs**: Both services use the same `item_id` (integer) to reference fashion items

**User IDs**: User service generates UUIDs, AI service stores as strings

## Security Architecture

### 1. Authentication Flow

```
Client
  │
  ├─→ Request OTP (email/phone)
  │   └─→ User Service
  │
  ├─→ Verify OTP
  │   └─→ User Service → Returns JWT
  │
  └─→ Use JWT for subsequent requests
      ├─→ User Service (validates JWT)
      └─→ AI Service (validates JWT)
```

### 2. Service-to-Service Authentication

**Option 1: Service Account Tokens**
- Each service has a service account
- Long-lived JWT tokens for inter-service communication
- Stored in environment variables

**Option 2: API Keys**
- Simple API keys for service-to-service calls
- Rotated periodically

**Option 3: mTLS (Mutual TLS)**
- For production: Use mTLS for service-to-service communication
- Certificates managed by service mesh (Istio/Linkerd)

### 3. Zero-Latency Architecture

#### Caching Strategy

**Redis Cache Layers**:

1. **User Service Cache**:
   - User profiles (TTL: 5 minutes)
   - Cart items (TTL: 1 minute)
   - Wishlist items (TTL: 1 minute)

2. **AI Service Cache**:
   - Pre-computed recommendation decks (TTL: 1 hour)
   - NL query results (TTL: 30 minutes)
   - Item details (TTL: 15 minutes)

3. **CDN Cache**:
   - Static assets (images, CSS, JS)
   - API responses (with appropriate cache headers)

#### Database Optimization

1. **Read Replicas**:
   - User Service: 1 primary + 2 read replicas
   - AI Service: 1 primary + 2 read replicas

2. **Connection Pooling**:
   - Prisma connection pool (max 20 connections)
   - PgBouncer for PostgreSQL connection pooling

3. **Indexing**:
   - All foreign keys indexed
   - Frequently queried fields indexed
   - Composite indexes for common queries

#### API Gateway

**Nginx/Cloud Load Balancer**:
- Request routing
- SSL termination
- Rate limiting
- Caching (proxy cache)
- Health checks

## Deployment Architecture

### Development

```
┌─────────────┐    ┌─────────────┐
│ User Service│    │  AI Service │
│  :4000      │    │   :8000     │
└─────────────┘    └─────────────┘
```

### Production

```
┌─────────────────────────────────────────┐
│         Load Balancer (Nginx)           │
│         SSL Termination                  │
└─────────────┬───────────────┬───────────┘
              │               │
    ┌─────────┴────┐   ┌──────┴─────────┐
    │ User Service│   │  AI Service    │
    │  (3 replicas)│   │  (3 replicas) │
    └──────────────┘   └───────────────┘
              │               │
    ┌─────────┴────┐   ┌──────┴─────────┐
    │ PostgreSQL  │   │ PostgreSQL +   │
    │  (Primary + │   │  Qdrant        │
    │   Replicas) │   │  (Vector DB)   │
    └──────────────┘   └───────────────┘
```

## Data Flow Examples

### Example 1: User Adds Item to Cart

```
1. Client → User Service: POST /api/v1/cart
   Headers: Authorization: Bearer <jwt>
   Body: { itemId: 123, quantity: 1 }

2. User Service:
   - Validates JWT
   - Validates user exists
   - Calls AI Service: GET /items/123
   - Creates CartItem in database
   - Returns cart item

3. Response: { id: "uuid", itemId: 123, quantity: 1, ... }
```

### Example 2: User Gets Recommendations

```
1. Client → AI Service: POST /recommendations/nl-query
   Headers: Authorization: Bearer <jwt>
   Body: { query: "casual party outfit", limit: 10 }

2. AI Service:
   - Validates JWT
   - Extracts user_id from JWT
   - Processes NL query (LLM)
   - Searches Qdrant
   - Filters by attributes
   - Returns recommendations

3. Response: { recommendations: [...], extracted_attributes: {...} }
```

### Example 3: User Creates Order

```
1. Client → User Service: POST /api/v1/orders
   Headers: Authorization: Bearer <jwt>
   Body: { cartItemIds: [...], shippingAddressId: "uuid" }

2. User Service:
   - Validates JWT
   - Gets cart items
   - Validates items with AI Service
   - Creates order
   - Clears cart items
   - (Future) Publishes OrderCreated event

3. Response: { order: {...}, orderNumber: "ORD-123" }
```

## Scalability Considerations

### Horizontal Scaling

**User Service**:
- Stateless (can scale horizontally)
- Session stored in JWT (no server-side sessions)
- Database connection pooling

**AI Service**:
- Stateless API layer
- Background workers for model training
- Vector search can be distributed (Qdrant cluster)

### Vertical Scaling

- Database: Increase RAM for caching
- Vector DB: Increase RAM for embeddings
- API Servers: Increase CPU for concurrent requests

### Load Balancing

- Round-robin for API servers
- Sticky sessions (if needed) via JWT
- Health checks for automatic failover

## Monitoring & Observability

### Metrics

- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate
- Database query time
- Cache hit rate

### Logging

- Structured logging (JSON)
- Request/response logging
- Error tracking (Sentry)
- Audit logs for sensitive operations

### Tracing

- Distributed tracing (OpenTelemetry)
- Request ID propagation
- Service dependency mapping

## Security Best Practices

1. **JWT Security**:
   - Short expiration (7 days access, 30 days refresh)
   - Secure secret keys (256-bit)
   - Token rotation

2. **OTP Security**:
   - Rate limiting (max 3 requests/hour)
   - Expiry (10 minutes)
   - Max attempts (5)
   - Secure storage (hashed in database)

3. **API Security**:
   - Rate limiting (100 req/min per IP)
   - Input validation & sanitization
   - SQL injection prevention (Prisma)
   - XSS prevention (input sanitization)

4. **Network Security**:
   - HTTPS only (TLS 1.3)
   - CORS configuration
   - Firewall rules
   - Service-to-service: mTLS (production)

5. **Data Security**:
   - Encryption at rest (database)
   - Encryption in transit (TLS)
   - PII data encryption
   - Regular backups

## Future Enhancements

1. **Message Queue**: RabbitMQ/Kafka for async communication
2. **Service Mesh**: Istio for advanced traffic management
3. **API Gateway**: Kong/Apache APISIX for advanced features
4. **Event Sourcing**: For order processing
5. **CQRS**: Separate read/write models for scalability
6. **GraphQL**: For flexible data fetching
7. **WebSockets**: Real-time updates (cart, wishlist)

## Migration Path

### Phase 1: Current (Monolith Split)
- ✅ Separate services
- ✅ Independent databases
- ✅ REST API communication

### Phase 2: Enhanced Communication
- ⏳ Message queue for events
- ⏳ Service discovery
- ⏳ Circuit breakers

### Phase 3: Advanced Features
- ⏳ Service mesh
- ⏳ Advanced caching
- ⏳ GraphQL gateway

## Conclusion

This microservices architecture provides:
- **Scalability**: Independent scaling of services
- **Maintainability**: Clear separation of concerns
- **Security**: Multiple layers of security
- **Performance**: Caching and optimization strategies
- **Reliability**: Health checks and failover mechanisms

For questions or improvements, please refer to the service-specific documentation.

