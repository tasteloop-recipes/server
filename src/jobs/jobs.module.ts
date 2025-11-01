import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JobsService } from './jobs.service';
import { JobsResolver } from './jobs.resolver';
import { JobsProcessor } from './jobs.processor';
import { PrismaService } from '../common/prisma.service';
import { GqlModule } from '../graphql/gql.module';
import { ImagesModule } from '../images/images.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'recipes',
    }),
    GqlModule,
    ImagesModule,
  ],
  providers: [JobsService, JobsResolver, JobsProcessor, PrismaService],
  exports: [JobsService],
})
export class JobsModule {}
