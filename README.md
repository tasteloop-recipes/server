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

The repository ships with a `docker-compose.yml` that provisions PostgreSQL, Valkey, MinIO object storage, the API server, and the queue worker.

```bash
docker compose up --build
```

- The `app` service hosts the GraphQL API at `http://localhost:3000`.
- The `queue` service runs the background worker via `npm run start:queue:dev`.
- The `valkey` service provides a Redis-compatible queue backend.
- The `object-storage` service provides a local MinIO instance for S3-compatible storage.

The application container will install dependencies, generate the Prisma client, run pending migrations, and then start in watch mode. A healthy Postgres instance is required before the app starts.

You can override `REDIS_*` variables in `.env` to point to a managed Valkey instance on DigitalOcean.

## Object storage configuration

The AI image pipeline saves generated images to an S3-compatible bucket. The service is configured to work with [DigitalOcean Spaces](https://docs.digitalocean.com/reference/api/#spaces) in production and ships with a local [MinIO](https://min.io/) stack for development.

### Required environment variables

Configure the following variables in your `.env` file (see `.env.example` for defaults):

- `SPACES_ENDPOINT` – The S3 endpoint (e.g. `https://nyc3.digitaloceanspaces.com` in production or `http://localhost:9000` for the local stack).
- `SPACES_REGION` – Region/cluster for your space (e.g. `nyc3`).
- `SPACES_BUCKET` – The bucket/space name that will hold generated recipe images.
- `SPACES_ACCESS_KEY_ID` and `SPACES_SECRET_ACCESS_KEY` – API credentials that can read/write the bucket.
- `SPACES_FORCE_PATH_STYLE` – Use `false` for DigitalOcean Spaces and `true` when working with the bundled MinIO server.
- `SPACES_OBJECT_ACL` – Optional ACL to apply when uploading objects (defaults to `public-read`).

### Local development

Running `docker compose up` launches an additional `object-storage` service (MinIO) plus a short-lived setup container that creates the configured bucket and marks it as publicly readable. The MinIO UI is available at [http://localhost:9001](http://localhost:9001) using the access and secret keys defined above.

The application container automatically points to the in-cluster endpoint (`http://object-storage:9000`) and forces path-style URLs so you can test uploads locally without extra configuration.

To work against DigitalOcean Spaces instead, update the environment variables with your production credentials, disable `SPACES_FORCE_PATH_STYLE`, and ensure the bucket exists with the desired permissions.

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
