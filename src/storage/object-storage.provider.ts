import type { Provider } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';

export const objectStorageProvider: Provider<S3Client> = {
  provide: S3Client,
  useFactory: () => {
    const endpoint = process.env.SPACES_ENDPOINT;
    const region = process.env.SPACES_REGION;
    const accessKeyId = process.env.SPACES_ACCESS_KEY_ID;
    const secretAccessKey = process.env.SPACES_SECRET_ACCESS_KEY;
    const forcePathStyle = process.env.SPACES_FORCE_PATH_STYLE === 'true';

    if (
      endpoint == null ||
      region == null ||
      accessKeyId == null ||
      secretAccessKey == null
    ) {
      throw new Error(
        'DigitalOcean Spaces configuration is missing. Please set SPACES_ENDPOINT, SPACES_REGION, SPACES_ACCESS_KEY_ID, and SPACES_SECRET_ACCESS_KEY.',
      );
    }

    return new S3Client({
      endpoint,
      region,
      forcePathStyle,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  },
};
