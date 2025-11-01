# TasteLoop Server

A NestJS-based GraphQL API for AI-powered recipe generation with real-time updates via subscriptions.

## Features

- **GraphQL API** with Apollo Server and subscriptions (graphql-ws)
- **JWT Authentication** with Apple Sign-In
- **Background Job Processing** using BullMQ and Valkey (Redis)
- **Database** with Prisma and PostgreSQL
- **Image Storage** on S3-compatible storage (DigitalOcean Spaces / MinIO)
- **Real-time Updates** via GraphQL subscriptions
- **Public Demo API** with CORS protection and rate limiting
- **Observability** with Sentry for error tracking
- **Docker Compose** for local development

## Architecture

The application consists of two main services:

1. **API Service** (`main.api.ts`): Handles GraphQL requests, WebSocket subscriptions, and enqueues jobs
2. **Worker Service** (`main.worker.ts`): Processes background jobs for recipe and image generation

## Tech Stack

- NestJS 11
- GraphQL with Apollo Server 5
- Prisma ORM
- BullMQ for job queues
- Valkey (Redis API) for caching and queues
- PostgreSQL 16
- AWS SDK for S3
- Sentry for monitoring

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd tasteloop-server
```

2. Install dependencies:
```bash
npm install --legacy-peer-deps
```

3. Copy environment file:
```bash
cp .env.local.example .env.local
```

4. Start infrastructure with Docker Compose:
```bash
docker-compose up -d db valkey minio minio-setup
```

5. Run database migrations:
```bash
npx prisma migrate dev --name init
```

6. Generate Prisma client:
```bash
npx prisma generate
```

### Running the Application

#### Development Mode

Start the API server:
```bash
npm run start:api
```

Start the worker (in a separate terminal):
```bash
npm run start:worker
```

The API will be available at `http://localhost:8080/graphql`

#### Using Docker Compose (Full Stack)

Start all services:
```bash
docker-compose up --build
```

This will start:
- PostgreSQL on port 5432
- Valkey (Redis) on port 6379
- MinIO (S3) on ports 9000 (API) and 9001 (Console)
- API server on port 8080
- Worker service

### Accessing Services

- **GraphQL Playground**: http://localhost:8080/graphql
- **MinIO Console**: http://localhost:9001 (user: `minio`, password: `minio12345`)
- **API**: http://localhost:8080

## GraphQL API

### Schema Overview

```graphql
# Authentication
mutation {
  appleSignIn(input: {
    identityToken: "..."
    authorizationCode: "..."
  }) {
    accessToken
    user {
      id
      email
      role
    }
  }
}

# Generate Recipe (authenticated)
mutation {
  generateRecipe(input: {
    ingredients: ["chicken", "garlic", "lemon"]
  }) {
    id
    state
    createdAt
  }
}

# Generate Recipe Demo (public, rate-limited)
mutation {
  generateRecipeDemo(input: {
    ingredients: ["pasta", "tomatoes", "basil"]
  }) {
    id
    state
    createdAt
  }
}

# Query Job Status
query {
  job(id: "job-id") {
    id
    state
    result {
      recipeId
      imageUrl
    }
    error
    createdAt
    updatedAt
  }
}

# Subscribe to Job Updates
subscription {
  jobUpdated(id: "job-id") {
    id
    state
    result {
      recipeId
      imageUrl
    }
  }
}
```

### Job States

Jobs progress through these states:
- `queued` → `processing` → `recipe_generated` → `image_generated` → `succeeded` or `failed`

### Authentication

For authenticated mutations/queries, include the JWT token in headers:
```
Authorization: Bearer <your-jwt-token>
```

For WebSocket subscriptions, pass the token in connection params:
```javascript
{
  connectionParams: {
    Authorization: 'Bearer <your-jwt-token>'
  }
}
```

## Environment Variables

See `.env.local.example` for all configuration options.

Key variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Valkey/Redis connection string | `redis://localhost:6379` |
| `S3_ENDPOINT` | S3-compatible endpoint | `http://minio:9000` |
| `S3_BUCKET` | Bucket name | `recipes-dev` |
| `JWT_SECRET` | Secret for JWT signing | `your-secret-key` |
| `ENABLE_DEMO` | Enable public demo mutation | `true` or `false` |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `http://localhost:3000,https://demo.com` |
| `USE_REDIS_PUBSUB` | Use Redis for PubSub (horizontal scaling) | `false` (in-memory) or `true` |

## Database

### Migrations

Create a new migration:
```bash
npx prisma migrate dev --name <migration-name>
```

Apply migrations in production:
```bash
npx prisma migrate deploy
```

View data in Prisma Studio:
```bash
npm run prisma:studio
```

## Deployment

### DigitalOcean App Platform

1. Push your code to GitHub
2. Create a new App in DigitalOcean
3. Use the `app.yaml` configuration
4. Set environment variables in the App Platform dashboard
5. Deploy!

The `app.yaml` includes:
- API service with auto-deployment
- Worker service
- PostgreSQL database (managed)
- Valkey cache (managed)
- Spaces for image storage

### Manual Deployment

Build the application:
```bash
npm run build
```

Run migrations:
```bash
npx prisma migrate deploy
```

Start the API:
```bash
node dist/main.api.js
```

Start the Worker:
```bash
node dist/main.worker.js
```

## Testing GraphQL

### Example: Generate Recipe with Demo

1. Open GraphQL Playground at http://localhost:8080/graphql

2. Run the mutation:
```graphql
mutation {
  generateRecipeDemo(input: {
    ingredients: ["chicken", "garlic", "lemon"]
  }) {
    id
    state
    createdAt
  }
}
```

3. Subscribe to updates (in a new tab):
```graphql
subscription {
  jobUpdated(id: "your-job-id") {
    id
    state
    result {
      recipeId
      imageUrl
    }
  }
}
```

4. Watch the job progress through states in real-time!

## Security Features

- **CORS**: Strict same-origin policy for demo mutations
- **Rate Limiting**: IP-based rate limiting (10 req/min) for demo endpoint
- **JWT Authentication**: Required for all non-demo operations
- **Feature Flags**: Demo API can be disabled via `ENABLE_DEMO=false`

## Monitoring

### Sentry Integration

Set `SENTRY_DSN` in your environment to enable error tracking:
```bash
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

Errors are automatically captured in both API and Worker services.

## Development

### Project Structure

```
src/
├── auth/              # Authentication (JWT, Apple Sign-In)
├── common/            # Shared utilities (Prisma, rate limiting)
├── graphql/           # GraphQL module, PubSub, guards
├── images/            # Image upload service (S3)
├── jobs/              # Job processing (resolver, service, processor)
├── users/             # User management
├── main.api.ts        # API entry point
├── main.worker.ts     # Worker entry point
└── app.module.ts      # Root module
```

### Adding AI Integration

The recipe generation is currently mocked in `jobs/jobs.processor.ts`. To integrate with AI services:

1. Install AI SDK (e.g., OpenAI):
```bash
npm install openai
```

2. Update `generateRecipe()` method in `jobs.processor.ts`
3. Add API keys to environment variables

### Adding Image Generation

Update `generateAndUploadImage()` in `jobs.processor.ts` to integrate with services like:
- DALL-E (OpenAI)
- Midjourney
- Stable Diffusion

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8080
lsof -ti:8080 | xargs kill -9
```

### Prisma Client Issues
```bash
npx prisma generate
```

### Docker Issues
```bash
# Reset everything
docker-compose down -v
docker-compose up --build
```

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
