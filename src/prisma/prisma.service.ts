import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService provides database access throughout the application.
 *
 * This service extends PrismaClient and manages the database connection lifecycle.
 * It automatically connects to the database when the NestJS module is initialized
 * and disconnects when the module is destroyed.
 *
 * @example
 * ```typescript
 * // Inject PrismaService in any service or controller
 * constructor(private prisma: PrismaService) {}
 *
 * // Use Prisma Client methods
 * async getUsers() {
 *   return this.prisma.user.findMany();
 * }
 * ```
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Lifecycle hook called when the NestJS module is initialized.
   * Establishes connection to the database.
   *
   * @throws {Error} If database connection fails
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  /**
   * Lifecycle hook called when the NestJS module is destroyed.
   * Gracefully closes the database connection.
   *
   * @throws {Error} If database disconnection fails
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.log('Successfully disconnected from database');
    } catch (error) {
      this.logger.error('Failed to disconnect from database', error);
      throw error;
    }
  }
}
