# Principal Engineer Architecture Recommendations

## Executive Summary

As a Principal Engineer, I recommend a **microservices architecture** with clear service boundaries, secure inter-service communication, and zero-latency optimization strategies. This document outlines the recommended architecture, security patterns, and scalability approaches.

---

## Recommended Architecture

### Service Separation

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                        │
│              (Nginx / Cloud Load Balancer)                  │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
    ┌──────────────────┐          ┌──────────────────┐
    │  User Service    │          │   AI Service     │
    │  (NestJS)        │          │   (FastAPI)      │
    │  Port: 4000      │          │   Port: 8000     │
    └─────────┬────────┘          └─────────┬────────┘
              │                             │
              ▼                             ▼
    ┌──────────────────┐          ┌──────────────────┐
    │   PostgreSQL     │          │   PostgreSQL     │
    │   (User DB)      │          │   (Items DB)     │
    └──────────────────┘          └────────┬─────────┘
                                            │
                                            ▼
                                   ┌──────────────────┐
                                   │     Qdrant       │
                                   │  (Vector DB)      │
                                   └──────────────────┘
```

### Why This Architecture?

1. **Separation of Concerns**: User management vs. AI/ML operations
2. **Independent Scaling**: Scale services based on load
3. **Technology Flexibility**: Use best tool for each service
4. **Fault Isolation**: One service failure doesn't bring down the system
5. **Team Autonomy**: Different teams can work independently

---

## Security Architecture

### 1. Authentication & Authorization

#### OTP-Based Authentication (Current Implementation)

**Flow**:
```
User → Request OTP → User Service
User → Verify OTP → User Service → Returns JWT
User → Use JWT for all subsequent requests
```

**Security Measures**:
- ✅ OTP expiry (10 minutes)
- ✅ Max attempts (5)
- ✅ Rate limiting (3 requests/hour per email/phone)
- ✅ Secure storage (hashed in database)
- ⚠️ **Production**: Use real SMS/Email service (Twilio, AWS SNS)

#### JWT Token Strategy

**Access Token**:
- Expiry: 7 days
- Contains: user_id, email, role
- Stored: Client-side (httpOnly cookie recommended)

**Refresh Token** (Future):
- Expiry: 30 days
- Stored: httpOnly cookie
- Used to refresh access token

**Security**:
- ✅ Strong secret keys (256-bit)
- ✅ Token rotation
- ✅ Blacklist for logout (Redis)
- ✅ Short expiration

### 2. Service-to-Service Communication

#### Option 1: Service Account Tokens (Recommended for MVP)

```typescript
// Each service has a service account
const AI_SERVICE_TOKEN = process.env.AI_SERVICE_TOKEN;

// User Service calls AI Service
const response = await httpService.get(
  `${AI_SERVICE_URL}/items/${itemId}`,
  {
    headers: {
      'Authorization': `Bearer ${AI_SERVICE_TOKEN}`,
      'X-Service-Name': 'user-service',
    },
  }
);
```

**Pros**: Simple, easy to implement
**Cons**: Token rotation requires coordination

#### Option 2: API Keys (Simple Alternative)

```typescript
const response = await httpService.get(
  `${AI_SERVICE_URL}/items/${itemId}`,
  {
    headers: {
      'X-API-Key': process.env.AI_SERVICE_API_KEY,
    },
  }
);
```

#### Option 3: mTLS (Production - Recommended)

**For Production**: Use mutual TLS (mTLS) with service mesh (Istio/Linkerd)

- Each service has client certificate
- Services verify each other's certificates
- Encrypted communication
- Automatic certificate rotation

### 3. Network Security

#### API Gateway Security

**Nginx Configuration**:
```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

# SSL/TLS
ssl_protocols TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;

# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

#### Firewall Rules

- **User Service**: Only accessible via API Gateway
- **AI Service**: Only accessible via API Gateway
- **Databases**: Only accessible from service VPCs
- **No direct internet access** to services

### 4. Data Security

#### Encryption

- **At Rest**: Database encryption (PostgreSQL TDE)
- **In Transit**: TLS 1.3 for all communications
- **PII Data**: Encrypt sensitive fields (email, phone) in database

#### Input Validation

- ✅ class-validator for all DTOs
- ✅ SQL injection prevention (Prisma parameterized queries)
- ✅ XSS prevention (input sanitization)
- ✅ Rate limiting (100 req/min per IP)

---

## Zero-Latency Architecture

### 1. Caching Strategy

#### Redis Cache Layers

**User Service Cache**:
```typescript
// Cache user profiles
@Cacheable({ ttl: 300 }) // 5 minutes
async getUserProfile(userId: string) { ... }

// Cache cart items
@Cacheable({ ttl: 60 }) // 1 minute
async getCart(userId: string) { ... }
```

**AI Service Cache**:
```typescript
// Cache recommendation decks
@Cacheable({ ttl: 3600 }) // 1 hour
async getRecommendations(userId: string) { ... }

// Cache NL query results
@Cacheable({ ttl: 1800 }) // 30 minutes
async nlQuery(query: string) { ... }
```

#### CDN Caching

- Static assets (images, CSS, JS)
- API responses with appropriate cache headers
- Edge locations for global users

### 2. Database Optimization

#### Read Replicas

```
Primary DB (Write) → Replica 1 (Read) → Replica 2 (Read)
```

**Prisma Configuration**:
```typescript
// Use read replica for queries
const user = await prisma.user.findUnique({
  where: { id: userId },
  // Automatically routes to read replica
});
```

#### Connection Pooling

- **Prisma**: Max 20 connections per service
- **PgBouncer**: Connection pooler (200 connections → 20 DB connections)
- **Connection Timeout**: 5 seconds

#### Indexing Strategy

**User Service**:
```sql
-- Indexes for common queries
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_phone ON users(phone);
CREATE INDEX idx_cart_user_status ON cart_items(user_id, status);
CREATE INDEX idx_wishlist_user_status ON wishlist_items(user_id, status);
```

**AI Service**:
```sql
-- Already optimized with Qdrant indexes
-- PostgreSQL indexes for item lookups
CREATE INDEX idx_item_id ON items(item_id);
CREATE INDEX idx_interactions_user ON user_interactions(user_id);
```

### 3. API Response Optimization

#### Response Compression

```typescript
// Enable gzip compression
app.use(compression());
```

#### Pagination

```typescript
// Always paginate large datasets
GET /api/v1/cart?page=1&limit=20
```

#### Field Selection

```typescript
// Allow clients to select fields
GET /api/v1/users/me?fields=id,name,email
```

### 4. Background Processing

#### Async Operations

**Message Queue (Future)**:
- Order processing
- Email notifications
- Cache warming
- Model training

**Current**: Use NestJS EventEmitter for internal events

---

## Scalability Patterns

### Horizontal Scaling

#### Stateless Services

Both services are **stateless**:
- No server-side sessions (JWT-based)
- No in-memory state
- Can scale horizontally without issues

#### Load Balancing

```
API Gateway → [Service Instance 1, Service Instance 2, Service Instance 3]
```

**Strategy**: Round-robin with health checks

### Vertical Scaling

#### Database Scaling

- **Read Replicas**: Scale reads horizontally
- **Connection Pooling**: Optimize connections
- **Query Optimization**: Indexes, query analysis

#### Service Scaling

- **CPU**: For compute-intensive operations (AI service)
- **Memory**: For caching (Redis)
- **Network**: For high-throughput scenarios

### Auto-Scaling

**Kubernetes HPA** (Future):
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
spec:
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## Monitoring & Observability

### Metrics

**Key Metrics**:
- Request rate (req/sec)
- Response time (p50, p95, p99)
- Error rate (%)
- Database query time
- Cache hit rate

**Tools**: Prometheus + Grafana

### Logging

**Structured Logging**:
```typescript
logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  timestamp: new Date().toISOString(),
});
```

**Tools**: ELK Stack (Elasticsearch, Logstash, Kibana) or CloudWatch

### Tracing

**Distributed Tracing**:
- Request ID propagation
- Service dependency mapping
- Performance bottleneck identification

**Tools**: Jaeger or AWS X-Ray

### Health Checks

```typescript
GET /health
{
  "status": "ok",
  "database": "connected",
  "cache": "connected",
  "uptime": 3600
}
```

---

## Deployment Strategy

### Development

```
Local Development:
- User Service: localhost:4000
- AI Service: localhost:8000
- PostgreSQL: localhost:5432
- Qdrant: localhost:6333
```

### Staging

```
Docker Compose:
- All services containerized
- Same architecture as production
- Test data
```

### Production

```
Kubernetes / Cloud:
- User Service: 3+ replicas
- AI Service: 3+ replicas
- Database: Managed PostgreSQL (RDS/Azure)
- Cache: Managed Redis (ElastiCache/Azure Cache)
- Load Balancer: Cloud Load Balancer
```

---

## Best Practices

### 1. API Design

- ✅ RESTful conventions
- ✅ Consistent error responses
- ✅ Versioning (`/api/v1/`)
- ✅ Swagger documentation
- ✅ Rate limiting

### 2. Error Handling

```typescript
// Consistent error format
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [...]
}
```

### 3. Testing

- **Unit Tests**: Service logic
- **Integration Tests**: API endpoints
- **E2E Tests**: Complete user flows
- **Load Tests**: Performance under load

### 4. Documentation

- ✅ API documentation (Swagger)
- ✅ Architecture diagrams
- ✅ Runbooks for operations
- ✅ Development setup guides

---

## Migration Path

### Phase 1: Current (Monolith Split) ✅

- Separate services
- Independent databases
- REST API communication
- Basic authentication

### Phase 2: Enhanced Communication (Next 3 months)

- ⏳ Message queue (RabbitMQ/Kafka)
- ⏳ Service discovery
- ⏳ Circuit breakers
- ⏳ Retry mechanisms

### Phase 3: Advanced Features (6+ months)

- ⏳ Service mesh (Istio)
- ⏳ GraphQL gateway
- ⏳ Event sourcing (orders)
- ⏳ CQRS pattern

---

## Cost Optimization

### Development

- **Free tier** services where possible
- **Local development** for most work

### Production

- **Reserved instances** for predictable workloads
- **Spot instances** for batch processing
- **Auto-scaling** to match demand
- **CDN** for static assets

---

## Risk Mitigation

### Single Point of Failure

**Mitigation**:
- Multiple service replicas
- Database replication
- Load balancer redundancy
- Health checks and auto-recovery

### Data Loss

**Mitigation**:
- Automated backups (daily)
- Point-in-time recovery
- Cross-region replication (future)

### Security Breaches

**Mitigation**:
- Regular security audits
- Penetration testing
- Dependency updates
- Security monitoring

---

## Conclusion

This architecture provides:

✅ **Scalability**: Independent scaling of services
✅ **Security**: Multiple layers of protection
✅ **Performance**: Caching and optimization
✅ **Maintainability**: Clear separation of concerns
✅ **Reliability**: Health checks and failover

**Next Steps**:
1. Set up development environment
2. Configure CI/CD pipeline
3. Set up monitoring
4. Plan production deployment
5. Implement Phase 2 enhancements

For questions or clarifications, please refer to the service-specific documentation or contact the architecture team.

