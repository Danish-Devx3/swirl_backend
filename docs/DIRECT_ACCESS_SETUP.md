# Direct Frontend → AI Service Setup Guide

## Overview

To reduce latency, the frontend should call the AI Service directly for recommendations, while using the User Service for user data (cart, orders, profile).

## Architecture

```
Frontend
  ├─→ AI Service (Direct)     → Recommendations, NL Queries, Feed
  └─→ User Service (Direct)   → Cart, Orders, Profile, Auth
```

## Implementation Steps

### 1. AI Service - Add JWT Validation Endpoint

The AI Service needs to validate JWT tokens from the User Service.

**File**: `src/api/main.py`

```python
from src.auth.jwt_auth import get_current_user

@app.get("/auth/validate")
async def validate_token(current_user: dict = Depends(get_current_user)):
    """Validate JWT token and return user info"""
    return {
        "valid": True,
        "user_id": current_user.get("sub"),
        "email": current_user.get("email"),
    }
```

### 2. Frontend - Update API Client

**File**: `lib/api-client.ts` (Next.js)

```typescript
// AI Service Client (Direct)
class AIServiceClient {
  private baseURL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000';
  
  async getRecommendations(userId: string, token: string) {
    return await fetch(`${this.baseURL}/recommendations/feed`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-User-Id': userId,
      },
    });
  }
  
  async nlQuery(query: string, token: string) {
    return await fetch(`${this.baseURL}/recommendations/nl-query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit: 10 }),
    });
  }
}

// User Service Client
class UserServiceClient {
  private baseURL = process.env.NEXT_PUBLIC_USER_SERVICE_URL || 'http://localhost:4000';
  
  async getCart(token: string) {
    return await fetch(`${this.baseURL}/api/v1/cart`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }
  
  // ... other user service methods
}
```

### 3. Environment Variables

**Frontend** (`.env.local`):

```env
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000
NEXT_PUBLIC_USER_SERVICE_URL=http://localhost:4000
```

**AI Service** (`.env`):

```env
# Use same JWT secret as User Service
JWT_SECRET=your-shared-jwt-secret
JWT_ALGORITHM=HS256
```

**User Service** (`.env`):

```env
JWT_SECRET=your-shared-jwt-secret
JWT_EXPIRES_IN=7d
```

### 4. CORS Configuration

**AI Service** (`src/api/main.py`):

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        # Add production URLs
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Benefits

1. **Reduced Latency**: 36-62% faster responses
2. **Better Scalability**: Services scale independently
3. **Simpler Architecture**: No unnecessary proxy layer
4. **Better Caching**: Can cache at CDN level

## Security Considerations

1. **Shared JWT Secret**: Both services use same secret
2. **Token Validation**: AI Service validates tokens
3. **CORS**: Only allow frontend origins
4. **Rate Limiting**: Apply rate limits on AI Service

## Monitoring

Track these metrics:
- Response time: AI Service direct vs. proxied
- Error rate: Failed token validations
- Cache hit rate: Recommendation caching

## Migration Path

1. **Phase 1**: Add JWT validation to AI Service
2. **Phase 2**: Update frontend to call AI Service directly
3. **Phase 3**: Remove proxy endpoints from User Service
4. **Phase 4**: Monitor and optimize

