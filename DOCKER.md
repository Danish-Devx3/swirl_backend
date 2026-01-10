# Docker Setup Guide - Backend Service

This guide explains how to build and run the Swirl Engine Backend service using Docker.

## Quick Start

### Build Image

```bash
docker build -t swirl-backend-service:latest .
```

### Run Container

```bash
docker run -p 4000:4000 \
  -e DATABASE_URL=postgresql://swirl_user:swirl_password@host.docker.internal:5432/swirl_engine_backend \
  -e REDIS_HOST=host.docker.internal \
  -e RABBITMQ_HOST=host.docker.internal \
  -e JWT_SECRET_KEY=your_secret_key \
  swirl-backend-service:latest
```

## Environment Variables

Required environment variables:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_HOST=redis
REDIS_PORT=6379
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
JWT_SECRET_KEY=your_secret_key
```

## Development

For development with hot reload:

```bash
docker run -p 4000:4000 \
  -v $(pwd):/app \
  -v /app/node_modules \
  -e NODE_ENV=development \
  swirl-backend-service:latest npm run start:dev
```

## Production

The Dockerfile automatically:
1. Runs database migrations on startup
2. Starts the production server
3. Includes health checks

## Troubleshooting

### Database Connection

```bash
# Check if database is accessible
docker exec -it container_name sh -c "npx prisma db pull"
```

### View Logs

```bash
docker logs -f swirl-backend-service
```

### Rebuild

```bash
docker build --no-cache -t swirl-backend-service:latest .
```

