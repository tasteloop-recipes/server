# TasteLoop Server

TasteLoop Server is a NestJS GraphQL API that generates recipes with AI and stores them using Prisma. The application now includes a background queue that processes `RecipeWorker` jobs and turns prompts into fully hydrated recipe records.

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL database
- Redis-compatible queue (Valkey on DigitalOcean works out of the box)

Copy `.env.example` to `.env` and update the following variables:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD` (optional if your queue is unauthenticated)

## Installation

```bash
npm ci
npm run prisma:generate
```

## Local development

### Run the API server

```bash
npm run start:dev
```

### Run the recipe queue worker

The worker runs independently of the HTTP server so it can scale separately.

```bash
npm run start:queue:dev
```

Both commands watch for file changes and reload automatically.

## Docker workflow

The repository ships with a `docker-compose.yml` that provisions PostgreSQL, Valkey, the API server, and the queue worker.

```bash
docker compose up --build
```

- The `app` service hosts the GraphQL API at `http://localhost:3000`.
- The `queue` service runs the background worker via `npm run start:queue:dev`.
- The `valkey` service provides a Redis-compatible queue backend.

You can override `REDIS_*` variables in `.env` to point to a managed Valkey instance on DigitalOcean.

## Database helpers

```bash
npm run prisma:migrate         # create a new migration (development)
npm run prisma:migrate:prod    # apply committed migrations without prompts
npm run prisma:format          # format schema.prisma
npm run prisma:studio          # inspect the database visually
```

## Testing and linting

```bash
npm run lint && npm run format && npm run prisma:format
npm run test
npm run test:cov
npm run test:e2e
```

## Production build

```bash
npm run build
npm run start:prod           # starts the compiled HTTP server
npm run start:queue          # starts the compiled queue worker
```

## Project structure highlights

- `src/ai` – AI service that talks to OpenAI.
- `src/recipe-worker` – GraphQL resolver, service, and queue processor for `RecipeWorker` jobs.
- `src/queue` – Queue configuration and worker bootstrap.
- `prisma/` – Prisma schema and migrations.

## License

UNLICENSED
