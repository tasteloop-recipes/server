<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Environment Configuration

### Local Development (without Docker)

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your database credentials:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
   NODE_ENV=development
   ```

3. Ensure PostgreSQL is running locally on port 5432

### Docker Development

1. Set up Docker secrets:
   ```bash
   # Create the secrets directory (if not exists)
   mkdir -p secrets

   # Create secret files with your credentials
   echo -n "your_db_user" > secrets/db_user.txt
   echo -n "your_db_password" > secrets/db_password.txt
   echo -n "your_db_name" > secrets/db_name.txt
   ```

   **Note:** Use `echo -n` to avoid adding newlines. See `secrets/README.md` for more details.

2. Start the application with Docker:
   ```bash
   docker compose up
   ```

3. The application will be available at `http://localhost:3000`

## Database Migrations

### Running Migrations Locally

When developing without Docker, run migrations from your terminal:

```bash
# Create a new migration
npm run prisma:migrate

# Deploy migrations (production)
npm run prisma:migrate:prod

# Generate Prisma Client
npm run prisma:generate

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Format Prisma schema file
npm run prisma:format
```

### Running Migrations in Docker

When using Docker, you have two options:

**Option 1: From host machine (recommended for development)**
```bash
# Ensure your .env file has DATABASE_URL pointing to localhost:5432
npm run prisma:migrate
```

**Option 2: Inside the Docker container**
```bash
# Execute migration inside the running container
docker exec -it tasteloop-server npm run prisma:migrate
```

### Migration Workflow

1. **Development:**
   - Create and edit your Prisma models in `prisma/schema.prisma`
   - Run `npm run prisma:migrate` to create and apply migrations
   - The migration files will be created in `prisma/migrations/`
   - Prisma Client will be automatically regenerated

2. **Production:**
   - Migrations should be run during deployment, not during Docker build
   - Use `npm run prisma:migrate:prod` to apply pending migrations
   - Never run `prisma migrate dev` in production

3. **Best Practices:**
   - Always review generated migration SQL before applying
   - Test migrations on a staging environment first
   - Keep migration files in version control
   - Never edit migration files after they've been applied

## Docker Commands

### Starting the application

```bash
# Start all services
docker compose up

# Start in detached mode (background)
docker compose up -d

# Rebuild and start
docker compose up --build

# View logs
docker compose logs -f
```

### Stopping the application

```bash
# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes database data)
docker compose down -v
```

### Accessing containers

```bash
# Access the app container
docker exec -it tasteloop-server sh

# Access the postgres container
docker exec -it tasteloop-postgres sh

# Connect to PostgreSQL database
docker exec -it tasteloop-postgres psql -U $(cat secrets/db_user.txt) -d $(cat secrets/db_name.txt)
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

### Unit Tests

Unit tests mock external dependencies (like database connections) and test individual components in isolation:

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:cov

# Debug tests
npm run test:debug
```

### Integration Tests (E2E)

Integration tests verify the application works with real database connections. Ensure your database is running before executing these tests:

```bash
# Start the database with Docker
docker compose up -d postgres

# Run integration tests
npm run test:e2e
```

**Note:** Integration tests require:
- A running PostgreSQL database
- Valid `DATABASE_URL` in your `.env` file
- Database migrations applied: `npm run prisma:migrate`

### Test Structure

- **Unit Tests**: Located alongside source files (e.g., `*.spec.ts`)
  - Mock external dependencies
  - Fast execution
  - Test business logic in isolation

- **Integration Tests**: Located in `/test` directory (e.g., `*.e2e-spec.ts`)
  - Test with real database
  - Verify end-to-end workflows
  - Test database connectivity and queries

### PrismaService Tests

The PrismaService includes comprehensive tests:

**Unit Tests** (`src/prisma/prisma.service.spec.ts`):
- Connection lifecycle (onModuleInit, onModuleDestroy)
- Error handling for failed connections
- Logging verification

**Integration Tests** (`test/prisma.e2e-spec.ts`):
- Real database connectivity
- Query execution
- Transaction support
- Error handling with actual database

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
