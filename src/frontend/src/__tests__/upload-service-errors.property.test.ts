/**
 * Property-based tests for uploadService error propagation
 *
 * Property 2: Upload service error propagation for non-2xx responses
 * Validates: Requirements 2.3, 2.4
 *
 * For any HTTP status code in the range 400–599, calling either
 * uploadService.getPresignUrl(...) or uploadService.uploadToS3(...) when the
 * backing request returns that status SHALL cause the function to throw an Error.
 */
import * as fc from 'fast-check';
import axios from 'axios';
import { uploadService, apiClient } from '../services/api';

// ---------------------------------------------------------------------------
// Arbitrary generators
// ---------------------------------------------------------------------------

/** Generates HTTP error status codes in the range [400, 599] */
const errorStatusArb = fc.integer({ min: 400, max: 599 });

// ---------------------------------------------------------------------------
// Property 2: Upload service error propagation for non-2xx responses
// Validates: Requirements 2.3, 2.4
// ---------------------------------------------------------------------------

describe('Property 2: Upload service error propagation for non-2xx responses (Validates: Requirements 2.3, 2.4)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getPresignUrl throws an Error for any HTTP status code in [400, 599]', async () => {
    await fc.assert(
      fc.asyncProperty(errorStatusArb, async (status) => {
        const axiosError = new axios.AxiosError(
          `Request failed with status code ${status}`,
          'ERR_BAD_RESPONSE',
          undefined,
          undefined,
          {
            status,
            data: { error: `Error ${status}` },
            headers: {},
            config: {} as any,
            statusText: String(status),
          } as any,
        );
        jest.spyOn(apiClient, 'post').mockRejectedValueOnce(axiosError);

        await expect(
          uploadService.getPresignUrl('receipt.jpg', 'image/jpeg', 'tx-test'),
        ).rejects.toThrow(Error);

        jest.restoreAllMocks();
      }),
      { numRuns: 100 },
    );
  });

  it('uploadToS3 throws an Error for any HTTP status code in [400, 599]', async () => {
    const blob = new Blob(['fake-image-data'], { type: 'image/jpeg' });

    await fc.assert(
      fc.asyncProperty(errorStatusArb, async (status) => {
        global.fetch = jest.fn().mockResolvedValueOnce({
          ok: false,
          status,
          statusText: `Error ${status}`,
        });

        await expect(
          uploadService.uploadToS3('https://s3.example.com/presigned', blob, 'image/jpeg'),
        ).rejects.toThrow(Error);

        jest.restoreAllMocks();
      }),
      { numRuns: 100 },
    );
  });
});
