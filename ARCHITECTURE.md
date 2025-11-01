📘 System Architecture Summary (v4 – Final)

1. Overview
   • Frontend: Swift iOS (Apollo iOS) + optional Web demo (same-origin only)
   • API: NestJS (TypeScript) + GraphQL (Apollo driver) with Queries/Mutations and Subscriptions (graphql-ws)
   • Auth: JWT + Sign in with Apple
   • Background jobs: BullMQ on Valkey (Redis API) + worker service
   • DB: Postgres (Prisma)
   • Images: DO Spaces (S3)
   • Hosting: DigitalOcean App Platform (api, worker)
   • Observability: Sentry (errors/perf) + PostHog (product analytics)
   • Local dev: Docker Compose (Postgres, Valkey, MinIO, API, Worker)
   • Public demo: unauthenticated mutation gated by CORS, rate limits, and a feature flag

⸻

2. High-level data flow

[iOS (JWT) or Web Demo (no JWT)]
| GraphQL over HTTPS (CORS-allowed origin only for demo)
v
[API (NestJS GraphQL)]

- Auth mutations (appleSignIn) → issue JWT
- Auth’d mutation generateRecipe → enqueue job
- Public demo mutation generateRecipeDemo (if ENABLE_DEMO=true)
- Query job(id) → DB snapshot
- Subscription jobUpdated(id) via graphql-ws
  |
  Valkey (BullMQ)
  ^
  | consume + publish
  [Worker] — steps → DB + Spaces — publishes jobUpdated events

⸻

3. GraphQL API (core SDL)

scalar DateTime
enum JobState { queued processing recipe_generated image_generated succeeded failed }

type JobResult { recipeId: ID!, imageUrl: String! }
type Job { id: ID!, state: JobState!, result: JobResult, error: String, createdAt: DateTime!, updatedAt: DateTime! }

input GenerateRecipeInput { ingredients: [String!]! }

type Query { job(id: ID!): Job }

type Mutation {

# Auth’d

generateRecipe(input: GenerateRecipeInput!): Job!
appleSignIn(identityToken: String!, authorizationCode: String): AuthPayload!

# Public demo (no auth) — only registered when ENABLE_DEMO=true

generateRecipeDemo(input: GenerateRecipeInput!): Job!
}

type User { id: ID!, email: String, role: String! }
type AuthPayload { accessToken: String!, user: User! }

type Subscription { jobUpdated(id: ID!): Job }

Patterns
• generateRecipe: JWT-protected; enqueue + return.
• generateRecipeDemo: public, rate-limited, only available if ENABLE_DEMO=true.
• job(id): polling read from DB.
• jobUpdated(id): subscriptions via graphql-ws + PubSub (in-memory initially; Redis PubSub when horizontally scaling API).

⸻

4. CORS & Public Demo Controls
   • Same-origin restriction for the demo: only allow your web demo domain(s).
   • Feature flag to expose/disable the demo mutation.
   • Rate limiting to prevent abuse (IP-based; consider CAPTCHA if you surface publicly).

CORS bootstrap (NestJS main.api.ts)

const app = await NestFactory.create(AppModule);

// Whitelist origins (prod + local dev)
const allowed = (process.env.CORS_ORIGINS || '')
.split(',')
.map(s => s.trim())
.filter(Boolean);

// Strict CORS — same-origin only
app.enableCors({
origin: (origin, cb) => {
if (!origin) return cb(null, false); // block non-browser tools by default for public routes
return allowed.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'));
},
methods: 'GET,HEAD,POST',
credentials: false,
});

.env examples

ENABLE_DEMO=true
CORS_ORIGINS=https://demo.example.com,http://localhost:5173

Resolver registration

@Resolver(() => Job)
export class JobsResolver {
constructor(private readonly jobs: JobsService) {}

// Auth’d mutation
@UseGuards(GqlAuthGuard)
@Mutation(() => Job)
generateRecipe(@Args('input') input: GenerateRecipeInput) {
return this.jobs.createAndEnqueue(input);
}

// Public demo mutation — registered only when flag is set
@Mutation(() => Job, { nullable: true })
generateRecipeDemo(@Args('input') input: GenerateRecipeInput) {
if (process.env.ENABLE_DEMO !== 'true') return null;
return this.jobs.createAndEnqueue(input, { demo: true });
}
}

Rate limiting (example)
• Use a lightweight guard/middleware (e.g., rate-limiter-flexible) keyed by IP.
• Apply only to generateRecipeDemo.

⸻

5. AuthN/Z
   • Apple Sign-In mutation verifies Apple JWT via JWKS → upsert user (appleId, email) → issue your JWT.
   • JWT guard on GraphQL context (HTTP + WebSocket connectionParams.Authorization).
   • Roles via decorator/guard (@Roles('admin')).

⸻

6. Jobs & Worker
   • State machine (checkpointed): queued → processing → recipe_generated → image_generated → succeeded|failed.
   • BullMQ with retries/backoff; lockDuration > longest step; idempotent writes.
   • Worker publishes jobUpdated via PubSub on each checkpoint.

⸻

7. Storage & DB
   • Spaces/S3 for images; public or signed URLs as needed.
   • Prisma/Postgres models: User, Job, Recipe; backups + migrations.

⸻

8. Observability
   • Sentry in API + Worker (errors & perf). Tag job_id, session_id.
   • PostHog in iOS app (product analytics + replay). Optionally send “recipe_succeeded” from worker.
   • DO Monitoring for infra; /queue/stats for backlog.

⸻

9. Local Dev (Docker)
   • Compose: api, worker, db (Postgres 16), valkey, minio.
   • One Dockerfile; two entrypoints.

⸻

10. DigitalOcean App Platform app.yaml

name: recipes-backend
services:

- name: api
  environment_slug: node-js
  run_command: "node dist/main.api.js"
  http_port: 8080
  instance_count: 1
  envs:
  - { key: DATABASE_URL, value: ${db.DATABASE_URL} }
  - { key: REDIS_URL, value: ${cache.REDIS_URL} }
  - { key: S3_ENDPOINT, value: ${space.ENDPOINT} }
  - { key: S3_BUCKET, value: ${space.BUCKET} }
  - { key: S3_ACCESS_KEY_ID, value: ${space.ACCESS_KEY} }
  - { key: S3_SECRET_ACCESS_KEY, value: ${space.SECRET_KEY} }
  - { key: JWT_SECRET, value: ${env.JWT_SECRET} }
  - { key: APPLE_CLIENT_ID, value: ${env.APPLE_CLIENT_ID} }
  - { key: APPLE_TEAM_ID, value: ${env.APPLE_TEAM_ID} }
  - { key: APPLE_KEY_ID, value: ${env.APPLE_KEY_ID} }
  - { key: APPLE_PRIVATE_KEY, value: ${env.APPLE_PRIVATE_KEY} }
  - { key: SENTRY_DSN, value: ${env.SENTRY_DSN} }
  - { key: ENABLE_DEMO, value: ${env.ENABLE_DEMO} }
  - { key: CORS_ORIGINS, value: ${env.CORS_ORIGINS} }

- name: worker
  environment_slug: node-js
  run_command: "node dist/main.worker.js"
  instance_count: 1
  envs:
  - { key: DATABASE_URL, value: ${db.DATABASE_URL} }
  - { key: REDIS_URL, value: ${cache.REDIS_URL} }
  - { key: SENTRY_DSN, value: ${env.SENTRY_DSN} }
  - { key: JWT_SECRET, value: ${env.JWT_SECRET} }

databases: [{ name: db, engine: PG }]
caches: [{ name: cache, engine: valkey }]
spaces: [{ name: space }]

⸻

⚙️ LLM Boilerplate Generation Prompt (Final, with Public APIs & CORS)

Goal: Generate a DigitalOcean-ready NestJS project with GraphQL (Apollo + graphql-ws), JWT + Apple Sign-In, BullMQ/Valkey, Prisma/Postgres, Spaces (S3), Sentry, and a public demo mutation protected by CORS + rate limits. Include Docker Compose for local dev.

Requirements 1. Packages

    •	NestJS, @nestjs/graphql, @nestjs/apollo, graphql, graphql-ws, graphql-subscriptions
    •	Optional Redis PubSub scaffold (graphql-redis-subscriptions, ioredis) behind a flag
    •	Prisma (prisma, @prisma/client)
    •	BullMQ (bullmq) + ioredis
    •	S3 SDK (@aws-sdk/client-s3)
    •	Auth: @nestjs/jwt, @nestjs/passport, passport-jwt, apple-signin-auth
    •	Sentry (@sentry/node)
    •	Rate limiting (rate-limiter-flexible) for demo mutation
    •	Validation/logging (class-validator or zod; pino optional)

    2.	Project structure

src/
main.api.ts # enable CORS from env CORS_ORIGINS; GraphQL + graphql-ws
main.worker.ts # BullMQ processors; publishes subscription events
app.module.ts
graphql/gql.module.ts # ApolloDriver config; subscriptions (graphql-ws); context adds user from JWT or connectionParams
graphql/pubsub.service.ts # in-memory PubSub + optional Redis PubSub path
graphql/gql-auth.guard.ts # reads JWT from headers or ws connection
auth/...
users/...
jobs/
jobs.resolver.ts # Mutation.generateRecipe (auth’d), # Mutation.generateRecipeDemo (public, only if ENABLE_DEMO=true), # Query.job, Subscription.jobUpdated
jobs.service.ts # DB ops; enqueue
jobs.processor.ts # BullMQ processor; checkpoints; pubsub.publish on state changes
images/images.service.ts # Spaces/MinIO upload
common/rate-limit.guard.ts # IP-based rate limit for demo mutation
prisma/schema.prisma
Dockerfile
docker-compose.yml
.env.local.example
app.yaml
README.md

    3.	CORS & env

    •	In main.api.ts, enableCors with origin function that allows only origins in CORS_ORIGINS (comma-separated). Block *.
    •	.env.local.example:

ENABLE_DEMO=true
CORS_ORIGINS=http://localhost:5173,https://demo.example.com
NODE_ENV=development
PORT=8080
DATABASE_URL=postgres://app:app@db:5432/appdb
REDIS_URL=redis://valkey:6379
S3_ENDPOINT=http://minio:9000
S3_BUCKET=recipes-dev
S3_ACCESS_KEY_ID=minio
S3_SECRET_ACCESS_KEY=minio12345
S3_FORCE_PATH_STYLE=true
JWT_SECRET=devsecret
SENTRY_DSN=
APPLE_CLIENT_ID=com.your.bundleid
APPLE_TEAM_ID=XXXXXX
APPLE_KEY_ID=XXXXXX
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----

    4.	GraphQL resolvers

    •	Auth’d generateRecipe(input) → create job (state=queued) → enqueue → return job.
    •	Public generateRecipeDemo(input) → same logic, no guard, but:
    •	Only exposed if ENABLE_DEMO=true
    •	Protected by RateLimitGuard (e.g., 10 req/min/IP; configurable)
    •	job(id) query
    •	jobUpdated(id) subscription with filter by id

    5.	Auth

    •	appleSignIn(identityToken, authorizationCode) mutation → verify with apple-signin-auth → upsert user → issue JWT (Nest JwtService).
    •	GqlAuthGuard for protected resolvers & ws connections.

    6.	Prisma models

    •	User { id, appleId?, email?, role }
    •	Job { id, state, input Json, result Json?, error Json?, createdAt, updatedAt }
    •	Recipe { id, jobId unique, imageUrl }
    •	Enum JobState as above.

    7.	Worker & BullMQ

    •	Queue: recipes; retries/backoff; lockDuration (e.g., 90s); concurrency (e.g., 6).
    •	Processor checkpoints state + publishes subscription events.

    8.	Spaces/MinIO

    •	S3 client config; deterministic keys based on jobId.

    9.	Sentry

    •	Init in API + Worker; capture exceptions; tag job_id.
    •	(Optional) Apollo plugin for resolver perf.

    10.	Docker & Compose

    •	Postgres 16, Valkey, MinIO (ports 9000/9001), API, Worker.
    •	README with steps:
    •	docker compose up --build
    •	docker compose exec api npx prisma migrate dev --name init
    •	Open Apollo Sandbox at /graphql:
    •	Run appleSignIn (if testing auth)
    •	Run generateRecipeDemo (no auth) from allowed origin only
    •	Open a jobUpdated subscription and a second tab to trigger updates

    11.	Security

    •	CORS locked to CORS_ORIGINS
    •	Demo rate-limited + feature-flagged
    •	JWT for all non-demo mutations/queries/subscriptions

⸻

That’s everything wrapped up with public demo support and CORS nailed down to same-origin. Want me to generate the CORS + RateLimit guard snippets ready to paste into your Nest app?
