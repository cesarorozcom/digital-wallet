import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';

const region = process.env.AWS_REGION || 'us-east-1';
const bucketName = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || '';
const endpoint = process.env.S3_ENDPOINT;
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';

const credentials =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined;

export const s3Config: S3ClientConfig = {
  region,
  ...(endpoint ? { endpoint } : {}),
  ...(forcePathStyle ? { forcePathStyle } : {}),
  ...(credentials ? { credentials } : {}),
};

export const s3Client = new S3Client(s3Config);
export const s3BucketName = bucketName;

export function getS3BucketName(): string {
  if (!s3BucketName) {
    throw new Error('S3 bucket name is not configured. Set S3_BUCKET_NAME or S3_BUCKET.');
  }

  return s3BucketName;
}

