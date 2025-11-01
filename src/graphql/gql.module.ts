import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { PubSubService } from './pubsub.service';
import { DateTimeScalar } from './scalars/datetime.scalar';

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useFactory: (pubSubService: PubSubService) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        playground: process.env.NODE_ENV === 'development',
        subscriptions: {
          'graphql-ws': {
            onConnect: (context: any) => {
              const { connectionParams, extra } = context;
              // Extract user from JWT in connectionParams.Authorization
              return { user: connectionParams?.user };
            },
          },
        },
        context: ({ req, connection, extra }) => {
          if (connection) {
            // WebSocket connection context
            return { req: connection.context, user: connection.context.user };
          }
          // HTTP request context
          return { req };
        },
      }),
      inject: [PubSubService],
    }),
  ],
  providers: [PubSubService, DateTimeScalar],
  exports: [PubSubService],
})
export class GqlModule {}
