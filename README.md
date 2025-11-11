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

## Prisma & Database

- Generate the Prisma client after updating the schema:

```bash
$ npm run prisma:generate
```

- Run development migrations (creates new migrations when schema changes):

```bash
$ npm run prisma:migrate
```

- Apply committed migrations without prompting (useful for CI/CD and Docker):

```bash
$ npm run prisma:migrate:prod
```

- Keep the schema formatting consistent:

```bash
$ npm run prisma:format      # writes changes
$ npm run prisma:format:check # fails if formatting is required
```

- Launch Prisma Studio while developing:

```bash
$ npm run prisma:studio
```

> The default `.env.example` is configured for the local Postgres instance declared in `docker-compose.yml`. Update `DATABASE_URL` if your database differs.

## Docker workflow

```bash
# start postgres and the NestJS app with hot reload + migrations
$ docker compose up --build
```

The application container will install dependencies, generate the Prisma client, run pending migrations, and then start in watch mode. A healthy Postgres instance is required before the app starts.

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

Running `docker compose up` now launches an additional `object-storage` service (MinIO) plus a short-lived setup container that creates the configured bucket and marks it as publicly readable. The MinIO UI is available at [http://localhost:9001](http://localhost:9001) using the access and secret keys defined above.

The application container automatically points to the in-cluster endpoint (`http://object-storage:9000`) and forces path-style URLs so you can test uploads locally without extra configuration.

To work against DigitalOcean Spaces instead, update the environment variables with your production credentials, disable `SPACES_FORCE_PATH_STYLE`, and ensure the bucket exists with the desired permissions.

## Compile and run the project locally

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

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
