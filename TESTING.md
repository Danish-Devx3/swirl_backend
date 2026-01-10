# Testing Guide - Swirl Engine Backend

This document describes the test suite for the Swirl Engine Backend (NestJS).

## Test Structure

The test suite uses Jest and follows NestJS testing conventions. Each module has corresponding `.spec.ts` files:

### Service Tests

- **`src/modules/auth/auth.service.spec.ts`**: Authentication service tests
- **`src/modules/users/users.service.spec.ts`**: User service tests
- **`src/modules/cart/cart.service.spec.ts`**: Cart service tests
- **`src/modules/wishlist/wishlist.service.spec.ts`**: Wishlist service tests
- **`src/modules/orders/orders.service.spec.ts`**: Orders service tests
- **`src/modules/interactions/interactions.service.spec.ts`**: Interactions service tests
- **`src/modules/preferences/preferences.service.spec.ts`**: Preferences service tests

### Controller Tests

- **`src/modules/auth/auth.controller.spec.ts`**: Authentication controller tests

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Run Specific Test File

```bash
npm test -- auth.service.spec.ts
```

## Test Coverage

### Authentication Module

- OTP request and verification
- User creation and login
- JWT token generation
- User validation

### User Module

- User profile retrieval
- Profile updates

### Cart Module

- Add to cart
- Update quantity
- Remove from cart
- Clear cart

### Wishlist Module

- Add to wishlist
- Remove from wishlist

### Orders Module

- Order creation
- Order retrieval

### Interactions Module

- Recording interactions
- Retrieving user interactions
- Syncing to AI service

### Preferences Module

- Setting preferences
- Getting preferences
- Deleting preferences

