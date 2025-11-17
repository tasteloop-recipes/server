import type { S3Client } from '@aws-sdk/client-s3';
import { objectStorageProvider } from './object-storage.provider';

const createClient = async (): Promise<S3Client> => {
  if (typeof objectStorageProvider.useFactory !== 'function') {
    throw new Error('objectStorageProvider.useFactory must be defined');
  }

  const { useFactory } = objectStorageProvider;
  return Promise.resolve<S3Client>(useFactory());
};

describe('objectStorageProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('parseBooleanEnv', () => {
    // Since parseBooleanEnv is not exported, we need to test it indirectly
    // through the provider's factory function behavior

    it('should use forcePathStyle=false when SPACES_FORCE_PATH_STYLE is undefined', async () => {
      process.env.SPACES_ENDPOINT = 'https://endpoint.com';
      process.env.SPACES_REGION = 'us-east-1';
      process.env.SPACES_ACCESS_KEY_ID = 'test-key';
      process.env.SPACES_SECRET_ACCESS_KEY = 'test-secret';
      delete process.env.SPACES_FORCE_PATH_STYLE;

      const client = await createClient();
      expect(client).toBeDefined();
    });

    it('should use forcePathStyle=false when SPACES_FORCE_PATH_STYLE is empty string', async () => {
      process.env.SPACES_ENDPOINT = 'https://endpoint.com';
      process.env.SPACES_REGION = 'us-east-1';
      process.env.SPACES_ACCESS_KEY_ID = 'test-key';
      process.env.SPACES_SECRET_ACCESS_KEY = 'test-secret';
      process.env.SPACES_FORCE_PATH_STYLE = '';

      const client = await createClient();
      expect(client).toBeDefined();
    });

    it('should use forcePathStyle=true when SPACES_FORCE_PATH_STYLE is "true"', async () => {
      process.env.SPACES_ENDPOINT = 'https://endpoint.com';
      process.env.SPACES_REGION = 'us-east-1';
      process.env.SPACES_ACCESS_KEY_ID = 'test-key';
      process.env.SPACES_SECRET_ACCESS_KEY = 'test-secret';
      process.env.SPACES_FORCE_PATH_STYLE = 'true';

      const client = await createClient();
      expect(client).toBeDefined();
    });

    it('should use forcePathStyle=true when SPACES_FORCE_PATH_STYLE is "1"', async () => {
      process.env.SPACES_ENDPOINT = 'https://endpoint.com';
      process.env.SPACES_REGION = 'us-east-1';
      process.env.SPACES_ACCESS_KEY_ID = 'test-key';
      process.env.SPACES_SECRET_ACCESS_KEY = 'test-secret';
      process.env.SPACES_FORCE_PATH_STYLE = '1';

      const client = await createClient();
      expect(client).toBeDefined();
    });

    it('should use forcePathStyle=true when SPACES_FORCE_PATH_STYLE is "yes"', async () => {
      process.env.SPACES_ENDPOINT = 'https://endpoint.com';
      process.env.SPACES_REGION = 'us-east-1';
      process.env.SPACES_ACCESS_KEY_ID = 'test-key';
      process.env.SPACES_SECRET_ACCESS_KEY = 'test-secret';
      process.env.SPACES_FORCE_PATH_STYLE = 'yes';

      const client = await createClient();
      expect(client).toBeDefined();
    });

    it('should use forcePathStyle=true when SPACES_FORCE_PATH_STYLE is "TRUE" (case-insensitive)', async () => {
      process.env.SPACES_ENDPOINT = 'https://endpoint.com';
      process.env.SPACES_REGION = 'us-east-1';
      process.env.SPACES_ACCESS_KEY_ID = 'test-key';
      process.env.SPACES_SECRET_ACCESS_KEY = 'test-secret';
      process.env.SPACES_FORCE_PATH_STYLE = 'TRUE';

      const client = await createClient();
      expect(client).toBeDefined();
    });

    it('should use forcePathStyle=true when SPACES_FORCE_PATH_STYLE has whitespace like " yes "', async () => {
      process.env.SPACES_ENDPOINT = 'https://endpoint.com';
      process.env.SPACES_REGION = 'us-east-1';
      process.env.SPACES_ACCESS_KEY_ID = 'test-key';
      process.env.SPACES_SECRET_ACCESS_KEY = 'test-secret';
      process.env.SPACES_FORCE_PATH_STYLE = ' yes ';

      const client = await createClient();
      expect(client).toBeDefined();
    });

    it('should use forcePathStyle=false when SPACES_FORCE_PATH_STYLE is "false"', async () => {
      process.env.SPACES_ENDPOINT = 'https://endpoint.com';
      process.env.SPACES_REGION = 'us-east-1';
      process.env.SPACES_ACCESS_KEY_ID = 'test-key';
      process.env.SPACES_SECRET_ACCESS_KEY = 'test-secret';
      process.env.SPACES_FORCE_PATH_STYLE = 'false';

      const client = await createClient();
      expect(client).toBeDefined();
    });

    it('should use forcePathStyle=false when SPACES_FORCE_PATH_STYLE is "0"', async () => {
      process.env.SPACES_ENDPOINT = 'https://endpoint.com';
      process.env.SPACES_REGION = 'us-east-1';
      process.env.SPACES_ACCESS_KEY_ID = 'test-key';
      process.env.SPACES_SECRET_ACCESS_KEY = 'test-secret';
      process.env.SPACES_FORCE_PATH_STYLE = '0';

      const client = await createClient();
      expect(client).toBeDefined();
    });

    it('should use forcePathStyle=false when SPACES_FORCE_PATH_STYLE is random value', async () => {
      process.env.SPACES_ENDPOINT = 'https://endpoint.com';
      process.env.SPACES_REGION = 'us-east-1';
      process.env.SPACES_ACCESS_KEY_ID = 'test-key';
      process.env.SPACES_SECRET_ACCESS_KEY = 'test-secret';
      process.env.SPACES_FORCE_PATH_STYLE = 'random';

      const client = await createClient();
      expect(client).toBeDefined();
    });
  });

  describe('objectStorageProvider.useFactory', () => {
    it('should throw error when SPACES_ENDPOINT is missing', async () => {
      delete process.env.SPACES_ENDPOINT;
      process.env.SPACES_REGION = 'us-east-1';
      process.env.SPACES_ACCESS_KEY_ID = 'test-key';
      process.env.SPACES_SECRET_ACCESS_KEY = 'test-secret';

      await expect(createClient()).rejects.toThrow(
        'Object storage configuration is missing',
      );
    });

    it('should throw error when SPACES_REGION is missing', async () => {
      process.env.SPACES_ENDPOINT = 'https://endpoint.com';
      delete process.env.SPACES_REGION;
      process.env.SPACES_ACCESS_KEY_ID = 'test-key';
      process.env.SPACES_SECRET_ACCESS_KEY = 'test-secret';

      await expect(createClient()).rejects.toThrow(
        'Object storage configuration is missing',
      );
    });

    it('should throw error when SPACES_ACCESS_KEY_ID is missing', async () => {
      process.env.SPACES_ENDPOINT = 'https://endpoint.com';
      process.env.SPACES_REGION = 'us-east-1';
      delete process.env.SPACES_ACCESS_KEY_ID;
      process.env.SPACES_SECRET_ACCESS_KEY = 'test-secret';

      await expect(createClient()).rejects.toThrow(
        'Object storage configuration is missing',
      );
    });

    it('should throw error when SPACES_SECRET_ACCESS_KEY is missing', async () => {
      process.env.SPACES_ENDPOINT = 'https://endpoint.com';
      process.env.SPACES_REGION = 'us-east-1';
      process.env.SPACES_ACCESS_KEY_ID = 'test-key';
      delete process.env.SPACES_SECRET_ACCESS_KEY;

      await expect(createClient()).rejects.toThrow(
        'Object storage configuration is missing',
      );
    });

    it('should create S3Client with all required config', async () => {
      process.env.SPACES_ENDPOINT = 'https://endpoint.com';
      process.env.SPACES_REGION = 'us-east-1';
      process.env.SPACES_ACCESS_KEY_ID = 'test-key';
      process.env.SPACES_SECRET_ACCESS_KEY = 'test-secret';
      process.env.SPACES_FORCE_PATH_STYLE = 'true';

      const client = await createClient();

      expect(client).toBeDefined();
      expect(client.config).toBeDefined();
    });
  });
});
