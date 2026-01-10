# Principal Engineer: Final Architecture Recommendations

## Executive Summary

As a Principal Engineer, I recommend a **hybrid architecture** that:
1. **Eliminates latency** by allowing direct frontend → AI service calls
2. **Collects all user data** for ML training via event streaming
3. **Uses local PostgreSQL** for development and production
4. **Optimizes cold start** recommendations using user preferences and interactions

---

## 🎯 Core Recommendation: Direct Frontend Access

### Problem: Latency Chain

**Current Concern**:
```
Frontend → User Service → AI Service → User Service → Frontend
Latency: ~550ms (unacceptable for real-time recommendations)
```

### Solution: Direct Access Pattern

**Recommended Architecture**:
```
Frontend
  ├─→ AI Service (Direct)     → Recommendations, NL Queries [~200ms]
  └─→ User Service (Direct)    → Cart, Orders, Profile [~150ms]
```

**Latency Reduction**: **36-62% faster** (350ms → 210ms with caching)

---

## 📊 Data Collection for ML Training

### Strategy: Event-Driven Collection

**All User Actions → Events → ML Training Database**

```
User Action (Cart, Wishlist, View, Like)
    ↓
User Service → UserInteraction Table
    ↓
Event Stream (Kafka/RabbitMQ) or Scheduled Sync
    ↓
AI Service → Training Database
    ↓
ML Model Training (Incremental)
```

### Data We Collect

1. **User Interactions**:
   - Views, Likes, Dislikes
   - Cart additions/removals
   - Wishlist additions/removals
   - Order completions
   - Search queries
   - Time spent on items

2. **User Preferences**:
   - Onboarding preferences (gender, style, price range)
   - Updated preferences
   - Implicit preferences (from behavior)

3. **User Profile**:
   - Demographics
   - Purchase history
   - Activity patterns

---

## 🏗️ Recommended Architecture

### Phase 1: Current Implementation (Week 1-2)

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend                              │
└──────┬───────────────────────────────┬──────────────────┘
       │                               │
       │ Direct JWT                    │ Direct JWT
       │                               │
       ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│   AI Service     │          │  User Service   │
│   :8000          │          │   :4000         │
│                  │          │                 │
│ - Recommendations│          │ - Cart          │
│ - NL Queries     │          │ - Wishlist     │
│ - Feed           │          │ - Orders       │
│                  │          │ - Interactions │
└────────┬─────────┘          └────────┬────────┘
         │                             │
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│  PostgreSQL      │          │  PostgreSQL      │
│  (Items +        │          │  (Users +        │
│   Interactions)  │          │   Interactions)  │
└──────────────────┘          └────────┬──────────┘
                                       │
                                       │ Scheduled Sync
                                       │ (Every 5 min)
                                       ▼
                              ┌──────────────────┐
                              │  AI Service      │
                              │  (Reads for      │
                              │   Training)      │
                              └──────────────────┘
```

### Phase 2: Event Streaming (Month 2)

```
User Service → Event Bus (Kafka) → AI Service
              (Real-time, Async)
```

---

## 🔒 Security Architecture

### JWT Token Flow

1. **User authenticates** with User Service (OTP)
2. **User Service returns JWT** (shared secret with AI Service)
3. **Frontend uses JWT** to call both services directly
4. **AI Service validates JWT** using shared secret

**Implementation**:
```typescript
// User Service generates JWT
const token = jwt.sign(
  { sub: user.id, email: user.email },
  process.env.JWT_SECRET, // Shared with AI Service
  { expiresIn: '7d' }
);

// AI Service validates JWT
const payload = jwt.verify(token, process.env.JWT_SECRET);
```

### Service-to-Service Security

**Development**: Shared JWT secret
**Production**: mTLS (mutual TLS) with service mesh

---

## ⚡ Zero-Latency Optimizations

### 1. Direct Frontend → AI Service

**Benefits**:
- ✅ No proxy layer
- ✅ Lower latency (36-62% faster)
- ✅ Better caching (CDN level)
- ✅ Independent scaling

**Implementation**:
```typescript
// Frontend
const recommendations = await fetch(
  'http://ai-service:8000/recommendations/feed',
  {
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'X-User-Id': userId,
    },
  }
);
```

### 2. Caching Strategy

**Redis Cache Layers**:

| Data Type | TTL | Location |
|-----------|-----|----------|
| User Profile | 5 min | User Service |
| Cart Items | 1 min | User Service |
| Recommendations | 30 min | AI Service |
| NL Query Results | 30 min | AI Service |
| Item Details | 15 min | AI Service |

### 3. Pre-computation

- **Pre-compute decks** for active users (every hour)
- **Pre-compute embeddings** for new items
- **Batch process** interactions (every 5 minutes)

### 4. Database Optimization

- **Read replicas** for queries
- **Connection pooling** (PgBouncer)
- **Indexes** on all foreign keys and frequently queried fields

---

## 📈 ML Training Data Flow

### Collection

**User Service captures all events**:

```typescript
// Cart Service
async addToCart(userId, itemId) {
  // Add to cart
  const cartItem = await this.createCartItem(...);
  
  // Record interaction
  await this.interactionsService.recordInteraction({
    userId,
    itemId,
    interactionType: 'CART_ADD',
    timestamp: new Date(),
  });
  
  return cartItem;
}
```

### Storage

**User Service Database**:
```prisma
model UserInteraction {
  userId          String
  itemId          Int
  interactionType InteractionType
  timestamp       DateTime
  syncedToAI      Boolean @default(false)
}
```

### Sync to AI Service

**Option 1: Scheduled Sync (Current)**
```bash
# Run every 5 minutes
npm run sync:interactions
```

**Option 2: Real-time Event Streaming (Future)**
```typescript
// User Service emits event
eventEmitter.emit('user.interaction', data);

// AI Service consumes event
@EventPattern('user.interaction')
async handleInteraction(data) {
  await this.storeForTraining(data);
  await this.updateModel(data.userId);
}
```

### ML Training

**AI Service uses interactions for**:
1. **LightFM Model Training**: User-item interactions
2. **Cold Start**: User preferences + interactions
3. **Incremental Updates**: Update embeddings after each interaction

---

## 🚀 Cold Start Improvement Strategy

### 1. Initial Preferences (Onboarding)

```typescript
// User completes onboarding
await preferencesService.setPreference(userId, 'gender', 'men');
await preferencesService.setPreference(userId, 'style', 'casual');
await preferencesService.setPreference(userId, 'price_range', { min: 500, max: 5000 });
```

### 2. AI Service Uses Preferences

```python
# AI Service - Cold Start
async def get_cold_start_recommendations(user_id: str):
    # Fetch preferences from User Service
    preferences = await user_service_client.get_preferences(user_id)
    
    # Filter items by preferences
    filtered_items = await filter_by_preferences(preferences)
    
    # Return diverse recommendations
    return get_diverse_recommendations(filtered_items, limit=20)
```

### 3. Incremental Learning

```python
# After each interaction
async def update_user_model(user_id: str):
    interactions = await get_recent_interactions(user_id)
    
    # Update LightFM model
    await ml_service.incremental_train(user_id, interactions)
    
    # Update user embeddings in Qdrant
    await vector_indexer.update_user_embedding(user_id)
```

---

## 📋 Implementation Checklist

### Week 1: Foundation
- [x] Set up User Service with Prisma
- [x] Implement OTP authentication
- [x] Create interaction tracking
- [x] Set up preferences storage

### Week 2: Direct Access
- [ ] Add JWT validation to AI Service
- [ ] Update frontend to call AI Service directly
- [ ] Test latency improvements
- [ ] Set up CORS on AI Service

### Week 3: Data Sync
- [ ] Implement interaction sync script
- [ ] Set up scheduled job (cron)
- [ ] Test data flow to AI Service
- [ ] Verify ML training uses new data

### Week 4: Optimization
- [ ] Add Redis caching
- [ ] Optimize database queries
- [ ] Set up monitoring
- [ ] Performance testing

---

## 🎯 Key Metrics to Track

### Latency
- **P50**: < 200ms (recommendations)
- **P95**: < 500ms
- **P99**: < 1000ms

### ML Training
- **Interaction sync lag**: < 5 minutes
- **Model update frequency**: Every 1000 interactions
- **Cold start accuracy**: > 70% user satisfaction

### System Health
- **Error rate**: < 0.1%
- **Uptime**: > 99.9%
- **Cache hit rate**: > 80%

---

## 🔐 Security Checklist

- [x] JWT token validation
- [x] CORS configuration
- [x] Rate limiting
- [x] Input validation
- [x] SQL injection prevention (Prisma)
- [ ] mTLS for production (service-to-service)
- [ ] API key rotation
- [ ] Audit logging

---

## 📊 Cost Optimization

### Development
- **Local PostgreSQL**: Free
- **Local Redis**: Free (optional)
- **No cloud costs**

### Production
- **Database**: Managed PostgreSQL (RDS/Azure) - $50-200/month
- **Cache**: Managed Redis - $30-100/month
- **Compute**: Auto-scaling based on load
- **Total**: ~$100-500/month for moderate traffic

---

## 🎓 Best Practices

1. **Always record interactions** (async, don't block)
2. **Batch sync** interactions (1000 at a time)
3. **Incremental training** (not on every interaction)
4. **Cache aggressively** (user profiles, recommendations)
5. **Monitor everything** (latency, errors, sync lag)

---

## 🚨 Risk Mitigation

### Single Point of Failure
- **Mitigation**: Multiple service replicas, health checks

### Data Loss
- **Mitigation**: Automated backups, point-in-time recovery

### Latency Spikes
- **Mitigation**: Caching, read replicas, CDN

### ML Model Staleness
- **Mitigation**: Incremental training, scheduled full retraining

---

## 📝 Conclusion

**Recommended Architecture**:

1. ✅ **Direct Frontend → AI Service** (lowest latency)
2. ✅ **Event-Driven Data Collection** (scalable, real-time)
3. ✅ **Local PostgreSQL** (simple, cost-effective)
4. ✅ **Incremental ML Training** (better recommendations over time)

**Expected Results**:
- **36-62% latency reduction**
- **Real-time ML training data**
- **Better cold start recommendations**
- **Scalable architecture**

This architecture provides the optimal balance of **performance**, **scalability**, and **maintainability** for a production-ready system.

