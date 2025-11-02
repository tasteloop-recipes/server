import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaModule provides global access to the PrismaService.
 *
 * This module is marked as @Global(), so PrismaService is available
 * throughout the application without needing to import PrismaModule
 * in every feature module.
 *
 * @example
 * ```typescript
 * // Import in AppModule
 * @Module({
 *   imports: [PrismaModule],
 * })
 * export class AppModule {}
 *
 * // Then use PrismaService anywhere
 * @Injectable()
 * export class UserService {
 *   constructor(private prisma: PrismaService) {}
 * }
 * ```
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
