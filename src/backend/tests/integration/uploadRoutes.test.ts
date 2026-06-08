/**
 * Integration tests for the secured presign endpoint
 * Requirements: 1.3, 1.4
 */

import request from 'supertest';
import express from 'express';
import jwtService from '../../src/services/JWTService';
import uploadRoutes from '../../src/routes/uploadRoutes';

// Mock S3Service so we don't need AWS credentials in tests
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

function makeToken(sub: string, email = 'test@example.com') {
  return jwtService.generateAccessToken(sub, email, 0);
}

describe('POST /api/uploads/presign — authentication', () => {
  const app = buildApp();

  it('returns 401 with correct error body when no Bearer token is provided', async () => {
    const res = await request(app)
      .post('/api/uploads/presign')
      .send({ filename: 'receipt.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Access token required' });
  });

  it('returns 401 when an invalid token is provided', async () => {
    const res = await request(app)
      .post('/api/uploads/presign')
      .set('Authorization', 'Bearer totally.invalid.token')
      .send({ filename: 'receipt.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(401);
  });

  it('returns 200 and a key containing the JWT sub when a valid token is supplied', async () => {
    const token = makeToken('user-abc-123');

    const res = await request(app)
      .post('/api/uploads/presign')
      .set('Authorization', `Bearer ${token}`)
      .send({ filename: 'receipt.jpg', contentType: 'image/jpeg', transactionId: 'txn-1' });

    expect(res.status).toBe(200);
    expect(res.body.key).toContain('user-abc-123');
    expect(res.body.url).toBeDefined();
  });

  it('does NOT include "anonymous" in the returned key even when body.userId is "anonymous"', async () => {
    // Requirements 1.4: UploadRoutes SHALL NOT accept "anonymous" as userId
    const token = makeToken('real-user-id');

    const res = await request(app)
      .post('/api/uploads/presign')
      .set('Authorization', `Bearer ${token}`)
      .send({ filename: 'receipt.jpg', contentType: 'image/jpeg', userId: 'anonymous', transactionId: 'txn-2' });

    expect(res.status).toBe(200);
    expect(res.body.key).not.toContain('anonymous');
    expect(res.body.key).toContain('real-user-id');
  });

  it('uses JWT sub over any body.userId, when they differ', async () => {
    const token = makeToken('jwt-sub-user');

    const res = await request(app)
      .post('/api/uploads/presign')
      .set('Authorization', `Bearer ${token}`)
      .send({ filename: 'receipt.jpg', contentType: 'image/jpeg', userId: 'body-user', transactionId: 'txn-3' });

    expect(res.status).toBe(200);
    expect(res.body.key).toContain('jwt-sub-user');
    expect(res.body.key).not.toContain('body-user');
  });

  it('returns 400 when filename is missing', async () => {
    const token = makeToken('some-user');

    const res = await request(app)
      .post('/api/uploads/presign')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'filename required' });
  });
});
