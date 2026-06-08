/**
 * Property 1: JWT sub is the source of truth for userId in presign keys
 * Validates: Requirements 1.2, 1.4
 *
 * For any authenticated request to POST /api/uploads/presign, regardless of
 * what value (if any) is present in req.body.userId, the S3 key returned SHALL
 * contain the user ID from req.user.sub and SHALL NOT contain "anonymous".
 */

import * as fc from 'fast-check';
import request from 'supertest';
import express from 'express';
import jwtService from '../../src/services/JWTService';
import uploadRoutes from '../../src/routes/uploadRoutes';

// Mock S3Service to avoid real AWS calls; key always starts with userId
jest.mock('../../src/services/S3Service', () => {
  return {
    S3Service: jest.fn().mockImplementation(() => ({
      buildReceiptKey: ({ userId, transactionId, filename }: any) =>
        `${userId}/2024-01/${transactionId}/${filename}`,
      getPresignedPutUrl: async ({ key }: any) => ({
        url: `https://s3.example.com/${key}?presigned=true`,
        key,
      }),
    })),
  };
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/uploads', uploadRoutes);
  return app;
}

// Arbitrary for non-empty alphanumeric-ish user ID strings (safe for path segments)
const subArb = fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/).filter(s => s.length > 0);

// Arbitrary for body.userId values including "anonymous" and other strings
const bodyUserIdArb = fc.oneof(
  fc.constant('anonymous'),
  fc.constant(''),
  subArb,
  fc.string({ minLength: 0, maxLength: 50 }),
);

describe('Property 1: JWT sub is the source of truth for userId in presign keys', () => {
  const app = buildApp();

  it('returned key always starts with the JWT sub path segment, regardless of body.userId', async () => {
    await fc.assert(
      fc.asyncProperty(subArb, bodyUserIdArb, async (sub, bodyUserId) => {
        const token = jwtService.generateAccessToken(sub, `${sub}@example.com`, 0);

        const res = await request(app)
          .post('/api/uploads/presign')
          .set('Authorization', `Bearer ${token}`)
          .send({
            filename: 'receipt.jpg',
            contentType: 'image/jpeg',
            userId: bodyUserId,
            transactionId: 'txn-prop-test',
          });

        // Must succeed
        expect(res.status).toBe(200);

        const key: string = res.body.key;

        // Key must start with the JWT sub (first path segment)
        expect(key.startsWith(`${sub}/`)).toBe(true);

        // Key must never contain the string "anonymous"
        expect(key).not.toContain('anonymous');
      }),
      { numRuns: 100 },
    );
  });
});
