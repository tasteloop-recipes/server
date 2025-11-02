import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaModule } from '../src/prisma/prisma.module';

/**
 * Integration tests for PrismaService
 *
 * These tests verify actual database connectivity and are designed to run
 * against a real database instance (e.g., in Docker or a test database).
 *
 * To run these tests:
 * - Ensure DATABASE_URL is set in .env
 * - Database should be running (e.g., via docker compose)
 * - Run: npm run test:e2e
 */
describe('PrismaService (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Database Connection', () => {
    it('should successfully connect to the database', async () => {
      // The connection is established in onModuleInit
      // This test verifies we can execute a raw query
      const result = await prismaService.$queryRaw`SELECT 1 as result`;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should be able to execute raw SQL queries', async () => {
      const result = await prismaService.$queryRaw`SELECT current_database() as db_name`;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should verify database connection using $connect', async () => {
      // Explicitly test connection
      await expect(prismaService.$connect()).resolves.not.toThrow();
    });

    it('should be able to check connection health', async () => {
      // Test that we can query database metadata
      const result = await prismaService.$queryRaw`
        SELECT version() as postgres_version
      `;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Transaction Support', () => {
    it('should support database transactions', async () => {
      // Test basic transaction functionality
      // Note: This uses Prisma's interactive transaction API
      const result = await prismaService.$transaction(async (tx) => {
        // Execute a simple query within transaction
        const queryResult = await tx.$queryRaw`SELECT 1 + 1 as sum`;
        return queryResult;
      });

      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid SQL queries gracefully', async () => {
      await expect(
        prismaService.$queryRaw`SELECT * FROM non_existent_table`,
      ).rejects.toThrow();
    });
  });

  describe('Connection Lifecycle', () => {
    it('should maintain connection throughout application lifecycle', async () => {
      // Test multiple queries in sequence
      const result1 = await prismaService.$queryRaw`SELECT 1 as test`;
      const result2 = await prismaService.$queryRaw`SELECT 2 as test`;
      const result3 = await prismaService.$queryRaw`SELECT 3 as test`;

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result3).toBeDefined();
    });
  });
});
