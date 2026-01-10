# ML Training Data Collection

## Overview

This document explains how user interactions and events are collected for ML training to improve recommendations, especially for cold start scenarios.

## Data Collection Strategy

### 1. User Interactions

**Captured Events**:
- `VIEW`: User views an item
- `LIKE`: User likes/swipes right on item
- `DISLIKE`: User dislikes/swipes left on item
- `CART_ADD`: User adds item to cart
- `CART_REMOVE`: User removes item from cart
- `WISHLIST_ADD`: User adds item to wishlist
- `WISHLIST_REMOVE`: User removes item from wishlist
- `ORDER_COMPLETE`: User completes order
- `SEARCH_QUERY`: User performs search
- `TIME_SPENT`: Time spent viewing item

### 2. User Preferences

**Stored Preferences**:
- `gender`: User's gender preference
- `style`: Preferred styles (casual, formal, etc.)
- `price_range`: Price range preferences
- `category`: Preferred categories
- `colors`: Preferred colors
- `materials`: Preferred materials
- `occasion`: Preferred occasions

## Data Flow

### Collection

```
User Action → User Service → UserInteraction Table
                          → Event Emitter → AI Service
```

### Storage

**User Service Database**:
- `UserInteraction` table: All user interactions
- `UserPreference` table: User preferences
- `syncedToAI` flag: Track sync status

**AI Service Database**:
- `UserInteractionDB` table: Synced interactions
- Used for ML model training

### Sync Process

**Option 1: Scheduled Sync (Current)**

```typescript
// Run every 5 minutes
// scripts/sync-interactions-to-ai.ts
```

**Option 2: Real-time Event Streaming (Future)**

```typescript
// User Service emits event
eventEmitter.emit('user.interaction', {
  userId,
  itemId,
  interactionType,
  timestamp,
});

// AI Service consumes event
@EventPattern('user.interaction')
async handleInteraction(data) {
  await this.storeInteraction(data);
  await this.updateModel(data.userId);
}
```

## Cold Start Improvement

### 1. Initial Preferences

When user completes onboarding:

```typescript
// User Service
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
    return get_diverse_recommendations(filtered_items)
```

### 3. Incremental Learning

After each interaction:

```python
# AI Service
async def update_user_model(user_id: str):
    # Get recent interactions
    interactions = await get_user_interactions(user_id)
    
    # Update LightFM model incrementally
    await ml_service.incremental_train(user_id, interactions)
    
    # Update user embeddings
    await vector_indexer.update_user_embedding(user_id)
```

## API Endpoints

### Record Interaction

```bash
POST /api/v1/interactions
Authorization: Bearer <token>
{
  "interactionType": "VIEW",
  "itemId": 123,
  "metadata": { "duration": 5000 }
}
```

### Get Preferences

```bash
GET /api/v1/preferences
Authorization: Bearer <token>
```

### Set Preference

```bash
POST /api/v1/preferences
Authorization: Bearer <token>
{
  "preferenceType": "gender",
  "preferenceValue": "men"
}
```

## Data Privacy

- User interactions are stored with user_id
- Can be anonymized for analytics
- GDPR compliance: Users can request data deletion
- Data retention: Keep interactions for 2 years for ML training

## Performance Considerations

1. **Async Processing**: Don't block user requests for interaction recording
2. **Batch Sync**: Sync interactions in batches (1000 at a time)
3. **Incremental Training**: Train models incrementally, not on every interaction
4. **Caching**: Cache user preferences to avoid repeated DB queries

## Monitoring

Track:
- Interaction recording rate
- Sync success/failure rate
- ML model update frequency
- Recommendation quality improvement over time

