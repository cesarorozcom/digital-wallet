import express from 'express';
import { S3Service } from '../services/S3Service';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Construct S3Service from env
const s3 = new S3Service({ region: process.env.AWS_REGION, bucket: process.env.S3_BUCKET_NAME || 'family-ledger-receipts-dev', defaultExpirySec: Number(process.env.S3_PRESIGN_EXPIRY || 900) });

// Require authentication for all upload routes
router.use(authenticateToken);

router.post('/presign', async (req, res) => {
  try {
    const { filename, contentType } = req.body;
    if (!filename) return res.status(400).json({ error: 'filename required' });

    const transactionId = req.body.transactionId || require('uuid').v4();
    const userId = req.user!.sub; // always from JWT — never from body
    const key = s3.buildReceiptKey({ userId, transactionId, filename });

    const { url } = await s3.getPresignedPutUrl({ key, contentType });
    res.json({ url, key });
  } catch (err: any) {
    console.error('Error generating presign', err);
    res.status(500).json({ error: 'presign_failed' });
  }
});

router.get('/view', async (req, res) => {
  try {
    const rawKey = req.query.key as string | undefined;
    if (!rawKey || rawKey.trim() === '') {
      return res.status(400).json({ error: 'key required' });
    }

    // Normalise: strip full s3:// URI down to just the object key.
    // Stored values may be "s3://bucket-name/path/to/object" — extract only the path.
    let key = rawKey.trim();
    const s3UriMatch = key.match(/^s3:\/\/[^/]+\/(.+)$/);
    if (s3UriMatch) {
      key = s3UriMatch[1];
    }

    const url = await s3.getPresignedGetUrl(key);
    res.json({ url });
  } catch (err: any) {
    console.error('Error generating view presign', err);
    res.status(500).json({ error: 'view_presign_failed' });
  }
});

export default router;
