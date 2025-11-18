import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import type { Request, Response } from 'express';
import { GraphqlThrottlerGuard } from './common/guards/graphql-throttler.guard';
import { AppResolver } from './app.resolver';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RecipesModule } from './recipes/recipes.module';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { AiModule } from './ai/ai.module';
import { RecipeWorkerModule } from './recipe-worker/recipe-worker.module';
import { QueueModule } from './queue/queue.module';
import { RecipeLogsModule } from './recipe-logs/recipe-logs.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      sortSchema: true,
      playground: false,
      introspection: process.env.NODE_ENV !== 'production',
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      context: ({ req, res }: { req: Request; res: Response }) => ({
        req,
        res,
      }),
    }),
    // Register the named throttler buckets that the @Throttle decorators use.
    // See https://github.com/nestjs/throttler#multiple-throttler-definitions for details.
    // - The default bucket enforces the per-IP query ceilings.
    // - The queryGlobal bucket applies a constant key via generateKey to enforce
    //   a shared global query allowance on top of the per-IP budget.
    // - The mutation buckets mirror the query behaviour but with much stricter
    //   limits because of the AI-related costs.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
      {
        name: 'queryGlobal',
        ttl: 60_000,
        limit: 1500,
        generateKey: (_context, _tracker, name): string => name,
      },
      {
        name: 'mutation',
        ttl: 60_000,
        limit: 1,
      },
      {
        name: 'mutationGlobal',
        ttl: 60_000,
        limit: 15,
        generateKey: (_context, _tracker, name): string => name,
      },
    ]),
    PrismaModule,
    QueueModule,
    AiModule,
    RecipeLogsModule,
    RecipesModule,
    RecipeWorkerModule,
  ],
  providers: [
    AppService,
    AppResolver,
    {
      provide: APP_GUARD,
      useClass: GraphqlThrottlerGuard,
    },
  ],
})
export class AppModule {}
