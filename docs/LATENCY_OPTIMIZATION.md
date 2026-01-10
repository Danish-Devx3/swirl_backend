# Latency Optimization & ML Training Data Architecture

## Problem Statement

**Current Concern**: If responses flow `AI Service → Backend → Frontend`, it adds unnecessary latency.

**Requirement**: Store all user data and events for ML training to improve cold start recommendations.

## Principal Engineer Recommendation

### Architecture Pattern: **Hybrid Direct Access with Event Streaming**

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
└──────┬───────────────────────────────┬─────────────────────┘
       │                               │
       │ Direct API Calls              │ User Actions
       │ (Recommendations)             │ (Cart, Orders)
       │                               │
       ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│   AI Service     │          │  User Service   │
│   (FastAPI)      │          │   (NestJS)      │
│   :8000          │          │   :4000         │
│                  │          │                 │
│ - Recommendations│          │ - Cart          │
│ - NL Queries     │          │ - Wishlist      │
│ - Feed           │          │ - Orders        │
│                  │          │ - Profile       │
└────────┬─────────┘          └────────┬────────┘
         │                             │
         │ Event Stream                │ Event Stream
         │ (User Interactions)         │ (User Actions)
         │                             │
         └─────────────┬───────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  Event Bus       │
              │  (Kafka/RabbitMQ)│
              └────────┬─────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌──────────────────┐        ┌──────────────────┐
│  ML Training     │        │  Analytics      │
│  Consumer        │        │  Consumer       │
└──────────────────┘        └──────────────────┘
         │
         ▼
┌──────────────────┐
│  PostgreSQL      │
│  (Events DB)     │
└──────────────────┘
```

## Solution 1: Direct Frontend → AI Service (Recommended)

### Architecture

**Frontend makes direct calls to AI Service for recommendations:**

```
Frontend → AI Service (Recommendations) [Fast, Low Latency]
Frontend → User Service (Cart, Orders, Profile) [User Data]
```

### Implementation

1. **Frontend gets JWT from User Service**
2. **Frontend uses JWT to call AI Service directly**
3. **AI Service validates JWT with User Service** (or shared secret)

### Benefits

- ✅ **Zero Backend Latency**: No extra hop through User Service
- ✅ **Better Performance**: Direct connection, lower latency
- ✅ **Scalability**: AI Service can scale independently
- ✅ **Separation**: User Service handles user data, AI Service handles recommendations

### Code Example

```typescript
// Frontend
const token = await authService.getToken(); // From User Service

// Direct call to AI Service
const recommendations = await fetch('http://ai-service:8000/recommendations/feed', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

## Solution 2: Event-Driven ML Training Data Collection

### Event Types to Capture

1. **User Interactions** (for ML training):
   - Item views
   - Likes/dislikes (swipes)
   - Cart additions
   - Wishlist additions
   - Order completions
   - Search queries
   - Time spent on items

2. **User Profile Events**:
   - Profile updates
   - Preference changes
   - Onboarding completion

### Event Streaming Architecture

```typescript
// User Service - Emit events
@EventPattern('user.interaction')
async handleUserInteraction(data: {
  userId: string;
  itemId: number;
  interactionType: 'view' | 'like' | 'dislike' | 'cart' | 'wishlist';
  timestamp: Date;
}) {
  // Send to event bus
  await this.eventBus.emit('user.interaction', data);
}

// AI Service - Consume events
@EventPattern('user.interaction')
async trainModel(data: UserInteractionEvent) {
  // Store in training database
  await this.prisma.userInteraction.create({
    data: {
      userId: data.userId,
      itemId: data.itemId,
      interactionType: data.interactionType,
      timestamp: data.timestamp,
    },
  });
  
  // Trigger incremental model training
  await this.mlService.updateModel(data.userId);
}
```

## Solution 3: Shared Database for ML Training (Alternative)

### Architecture

**Both services write to shared events database:**

```
User Service → PostgreSQL (Events Table)
AI Service → PostgreSQL (Events Table) [Read for Training]
```

### Schema Design

```prisma
model UserInteraction {
  id              String   @id @default(uuid())
  userId          String
  itemId          Int
  interactionType String   // view, like, dislike, cart, wishlist, order
  timestamp       DateTime @default(now())
  metadata        Json?    // Additional context
  
  @@index([userId, timestamp])
  @@index([itemId, timestamp])
  @@index([interactionType])
}

model UserPreference {
  id              String   @id @default(uuid())
  userId          String
  preferenceType  String   // gender, style, price_range, etc.
  preferenceValue Json
  updatedAt       DateTime @updatedAt
  
  @@unique([userId, preferenceType])
  @@index([userId])
}
```

## Recommended Approach: Hybrid Solution

### 1. Direct Frontend → AI Service (Recommendations)

**Why**: Lowest latency, best user experience

**Implementation**:
- Frontend authenticates with User Service
- Frontend gets JWT token
- Frontend calls AI Service directly with JWT
- AI Service validates JWT (shared secret or User Service validation endpoint)

### 2. Event Streaming for ML Training

**Why**: Real-time data collection, scalable, decoupled

**Implementation**:
- User Service emits events to message queue (Kafka/RabbitMQ)
- AI Service consumes events and stores in training database
- Background workers train models incrementally

### 3. Shared Events Database (Fallback)

**Why**: Simple, no additional infrastructure needed initially

**Implementation**:
- Both services write to same PostgreSQL database
- AI Service reads events for training
- Can migrate to event streaming later

## Latency Comparison

### Current (AI → Backend → Frontend)
```
Request:  Frontend → Backend → AI Service → Backend → Frontend
Latency:  ~200ms + ~150ms + ~200ms = ~550ms
```

### Recommended (Direct Access)
```
Request:  Frontend → AI Service → Frontend
Latency:  ~200ms + ~150ms = ~350ms (36% faster)
```

### With Caching
```
Request:  Frontend → AI Service (Cached) → Frontend
Latency:  ~200ms + ~10ms = ~210ms (62% faster)
```

## Implementation Plan

### Phase 1: Shared Database (Week 1-2)

1. Add `UserInteraction` table to AI Service database
2. User Service writes events to shared table
3. AI Service reads events for training

### Phase 2: Direct Frontend Access (Week 3-4)

1. Add JWT validation endpoint in AI Service
2. Update frontend to call AI Service directly
3. Remove backend proxy for recommendations

### Phase 3: Event Streaming (Month 2)

1. Set up Kafka/RabbitMQ
2. Migrate event publishing to message queue
3. AI Service consumes events asynchronously

## Code Implementation

### User Service - Event Emission

```typescript
// src/modules/cart/cart.service.ts
async addToCart(userId: string, itemId: number) {
  const cartItem = await this.prisma.cartItem.create({...});
  
  // Emit event for ML training
  await this.eventEmitter.emit('user.interaction', {
    userId,
    itemId,
    interactionType: 'cart',
    timestamp: new Date(),
  });
  
  return cartItem;
}
```

### AI Service - Event Consumption

```python
# src/api/services/event_consumer.py
async def consume_user_interaction(event: dict):
    """Store user interaction for ML training"""
    await prisma.user_interaction.create({
        'user_id': event['userId'],
        'item_id': event['itemId'],
        'interaction_type': event['interactionType'],
        'timestamp': event['timestamp'],
    })
    
    # Trigger incremental training
    await ml_service.update_user_embeddings(event['userId'])
```

### Frontend - Direct AI Service Call

```typescript
// lib/api-client.ts
class SwirlAPIClient {
  async getRecommendations(userId: string, token: string) {
    // Direct call to AI Service
    return await fetch(`${AI_SERVICE_URL}/recommendations/feed`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-User-Id': userId,
      },
    });
  }
}
```

## Database Schema for ML Training

### User Service Database (PostgreSQL)

```prisma
model UserInteraction {
  id              String   @id @default(uuid())
  userId          String
  itemId          Int
  interactionType String
  timestamp       DateTime @default(now())
  metadata        Json?
  
  @@index([userId, timestamp])
  @@index([itemId])
}
```

### AI Service Database (PostgreSQL)

```python
# Same schema, synced via events or shared database
class UserInteraction(Base):
    __tablename__ = 'user_interactions'
    
    id = Column(String, primary_key=True)
    user_id = Column(String, index=True)
    item_id = Column(Integer, index=True)
    interaction_type = Column(String)
    timestamp = Column(DateTime)
    metadata = Column(JSON)
```

## Cold Start Improvement Strategy

### 1. Collect Initial Preferences

```typescript
// User Service - Store onboarding preferences
await prisma.userPreference.create({
  data: {
    userId: user.id,
    preferenceType: 'gender',
    preferenceValue: { value: 'men' },
  },
});
```

### 2. Use Preferences for Cold Start

```python
# AI Service - Use preferences for cold start
async def get_cold_start_recommendations(user_id: str):
    # Get user preferences from User Service
    preferences = await user_service.get_preferences(user_id)
    
    # Filter items by preferences
    items = await filter_items_by_preferences(preferences)
    
    # Return diverse recommendations
    return get_diverse_items(items, limit=20)
```

### 3. Incremental Learning

```python
# After each interaction, update user embeddings
async def update_user_embeddings(user_id: str):
    interactions = await get_user_interactions(user_id)
    
    # Update LightFM model
    await ml_service.incremental_train(user_id, interactions)
    
    # Update user embeddings in Qdrant
    await vector_indexer.update_user_embedding(user_id)
```

## Monitoring & Optimization

### Key Metrics

1. **Latency**:
   - P50, P95, P99 response times
   - Compare direct vs. proxied calls

2. **Event Processing**:
   - Event queue depth
   - Processing lag
   - Failed events

3. **ML Training**:
   - Training frequency
   - Model update latency
   - Recommendation quality

### Optimization Strategies

1. **Caching**: Cache recommendations per user (5-10 min TTL)
2. **Pre-computation**: Pre-compute decks for active users
3. **Batch Processing**: Batch event processing for efficiency
4. **Async Training**: Train models asynchronously, don't block requests

## Conclusion

**Recommended Architecture**:

1. ✅ **Direct Frontend → AI Service** for recommendations (lowest latency)
2. ✅ **Event Streaming** for ML training data (scalable, real-time)
3. ✅ **Shared Database** as fallback (simple, no extra infrastructure)
4. ✅ **Incremental Training** based on user interactions (better cold start)

**Benefits**:
- 36-62% latency reduction
- Real-time ML training data
- Better cold start recommendations
- Scalable architecture
- Decoupled services

This architecture provides the best balance of performance, scalability, and maintainability.

