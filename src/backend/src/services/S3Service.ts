import { S3Client, PutObjectCommand, PutObjectCommandInput, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type PresignOptions = {
  bucket?: string;
  key: string;
  expiresIn?: number; // seconds
  contentType?: string;
  contentLength?: number;
};

export class S3Service {
  private client: S3Client;
  private bucket: string;
  private defaultExpirySec: number;

  constructor({ region, bucket, defaultExpirySec = 900, credentials }: { region?: string; bucket: string; defaultExpirySec?: number; credentials?: any }) {
    this.client = new S3Client({ region, credentials });
    this.bucket = bucket;
    this.defaultExpirySec = defaultExpirySec;
  }

  // Generate a presigned PUT URL for direct upload (browser -> S3)
  async getPresignedPutUrl(opts: PresignOptions): Promise<{ url: string; key: string }>{
    const expiresIn = opts.expiresIn ?? this.defaultExpirySec;
    const input: PutObjectCommandInput = {
      Bucket: opts.bucket ?? this.bucket,
      Key: opts.key,
      ContentType: opts.contentType,
    };

    const command = new PutObjectCommand(input);
    const url = await getSignedUrl(this.client, command, { expiresIn });
    return { url, key: opts.key };
  }

  // Convenience for POST-style presigned form (not implemented fully here)
  // If callers need browser multi-part form uploads with fields, implement separately.

  // Generate a presigned GET URL for downloading an object
  async getPresignedGetUrl(key: string, expiresInSec?: number): Promise<string>{
    const expiresIn = expiresInSec ?? this.defaultExpirySec;
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return await getSignedUrl(this.client, cmd, { expiresIn });
  }

  // Helper to build S3 object key by user and transaction context
  buildReceiptKey({ userId, transactionId, filename }: { userId: string; transactionId: string; filename: string }): string{
    const safeFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    return `${userId}/${year}-${month}/${transactionId}/${safeFilename}`;
  }
}
