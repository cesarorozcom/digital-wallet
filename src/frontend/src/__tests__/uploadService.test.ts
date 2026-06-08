/**
 * Unit tests for uploadService
 * Covers tasks 4.1 (getPresignUrl) and 4.2 (uploadToS3)
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import axios from 'axios';
import { uploadService, apiClient } from '../services/api';

// ---------------------------------------------------------------------------
// Task 4.1 — uploadService.getPresignUrl
// Requirements: 2.1, 2.3
// ---------------------------------------------------------------------------

describe('uploadService.getPresignUrl', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls apiClient.post with correct endpoint and payload, and returns url + key', async () => {
    const mockData = { url: 'https://s3.example.com/presigned', key: 'user123/2024-01/tx-abc/receipt.jpg' };
    jest.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: mockData });

    const result = await uploadService.getPresignUrl('receipt.jpg', 'image/jpeg', 'tx-abc');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/uploads/presign',
      { filename: 'receipt.jpg', contentType: 'image/jpeg', transactionId: 'tx-abc' },
    );
    expect(result).toEqual(mockData);
  });

  it('throws an Error when apiClient.post rejects with an Axios error', async () => {
    const axiosError = new axios.AxiosError(
      'Request failed with status code 500',
      'ERR_BAD_RESPONSE',
      undefined,
      undefined,
      {
        status: 500,
        data: { error: 'Internal Server Error' },
        headers: {},
        config: {} as any,
        statusText: 'Internal Server Error',
      } as any,
    );
    jest.spyOn(apiClient, 'post').mockRejectedValueOnce(axiosError);

    await expect(
      uploadService.getPresignUrl('receipt.jpg', 'image/jpeg', 'tx-abc'),
    ).rejects.toThrow(Error);
  });

  it('error message contains descriptive text when apiClient.post fails', async () => {
    const axiosError = new axios.AxiosError(
      'Network Error',
      'ERR_NETWORK',
    );
    jest.spyOn(apiClient, 'post').mockRejectedValueOnce(axiosError);

    await expect(
      uploadService.getPresignUrl('receipt.jpg', 'image/jpeg', 'tx-abc'),
    ).rejects.toThrow(/presigned URL|Network Error/i);
  });
});

// ---------------------------------------------------------------------------
// Task 4.2 — uploadService.uploadToS3
// Requirements: 2.2, 2.4
// ---------------------------------------------------------------------------

describe('uploadService.uploadToS3', () => {
  const presignedUrl = 'https://s3.example.com/presigned?X-Amz-Signature=abc';
  const blob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
  const contentType = 'image/jpeg';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls fetch with method PUT, correct Content-Type, and no Authorization header', async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    });
    global.fetch = mockFetch;

    await uploadService.uploadToS3(presignedUrl, blob, contentType);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = mockFetch.mock.calls[0] as [string, RequestInit];

    expect(calledUrl).toBe(presignedUrl);
    expect(calledInit.method).toBe('PUT');
    expect((calledInit.headers as Record<string, string>)['Content-Type']).toBe(contentType);
    // Must NOT include an Authorization header
    expect((calledInit.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('passes the blob as the request body', async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    });
    global.fetch = mockFetch;

    await uploadService.uploadToS3(presignedUrl, blob, contentType);

    const [, calledInit] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(calledInit.body).toBe(blob);
  });

  it('throws an Error when fetch returns a non-2xx response (403)', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    });

    await expect(
      uploadService.uploadToS3(presignedUrl, blob, contentType),
    ).rejects.toThrow(Error);
  });

  it('error message contains the status code when fetch returns non-2xx', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    });

    await expect(
      uploadService.uploadToS3(presignedUrl, blob, contentType),
    ).rejects.toThrow(/403/);
  });
});
