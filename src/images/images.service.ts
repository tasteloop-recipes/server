import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class ImagesService {
  private s3Client: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'S3_SECRET_ACCESS_KEY',
    );
    const forcePathStyle =
      this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true';

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error('S3 configuration is incomplete');
    }

    this.bucket = this.configService.get<string>('S3_BUCKET', 'recipes');
    this.endpoint = endpoint;

    this.s3Client = new S3Client({
      endpoint,
      region: this.configService.get<string>('S3_REGION', 'us-east-1'),
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle,
    });
  }

  async uploadImage(
    buffer: Buffer,
    key: string,
    contentType: string = 'image/png',
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    });

    await this.s3Client.send(command);

    // Construct public URL
    // For DigitalOcean Spaces: https://{bucket}.{region}.digitaloceanspaces.com/{key}
    // For MinIO: http://{endpoint}/{bucket}/{key}
    const isLocalMinio =
      this.endpoint?.includes('localhost') || this.endpoint?.includes('minio');

    if (isLocalMinio) {
      return `${this.endpoint}/${this.bucket}/${key}`;
    }

    // DigitalOcean Spaces or AWS S3
    const region = this.configService.get<string>('S3_REGION', 'us-east-1');
    return `https://${this.bucket}.${region}.digitaloceanspaces.com/${key}`;
  }

  async deleteImage(key: string): Promise<void> {
    // TODO: Implement delete if needed
  }
}
