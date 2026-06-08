/**
 * Property-based tests for imageCompressionService
 *
 * Property 3: Compression output is always a valid Blob
 * Validates: Requirements 3.2
 *
 * For any valid image file (JPEG or PNG, ≤ 5 MB), calling
 * imageCompressionService.compressImage(file) SHALL resolve to a
 * CompressionResult whose `blob` field is a Blob instance with size > 0.
 */
import * as fc from 'fast-check';
import { imageCompressionService } from '../services/imageCompressionService';

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------

/**
 * Set up global mocks that allow the service to run end-to-end inside jsdom.
 * - FileReader: resolves immediately with a fake data-URL.
 * - Image: resolves immediately with the provided width/height.
 * - HTMLCanvasElement.getContext: returns a minimal stub (jsdom has no canvas).
 * - HTMLCanvasElement.toBlob: produces a real Blob so the property "size > 0" holds.
 */
function setupMocksForDimensions(width: number, height: number): void {
  const mockCtx = { drawImage: jest.fn() };
  jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);

  jest
    .spyOn(HTMLCanvasElement.prototype, 'toBlob')
    .mockImplementation(function (
      this: HTMLCanvasElement,
      callback: BlobCallback,
      _type?: string,
      _quality?: number
    ) {
      // Produce a Blob with at least 1 byte so size > 0 is verifiable
      const data = new Uint8Array(Math.max(1, Math.min(width * height, 10000)));
      data.fill(0xff);
      callback(new Blob([data], { type: 'image/jpeg' }));
    });

  jest.spyOn(global, 'FileReader' as any).mockImplementation(() => ({
    readAsDataURL: jest.fn(function (this: FileReader) {
      const event = {
        target: { result: 'data:image/jpeg;base64,/9j/4A==' },
      } as ProgressEvent<FileReader>;
      this.onload && this.onload(event);
    }),
    onload: null,
    onerror: null,
  }));

  jest.spyOn(global, 'Image' as any).mockImplementation(() => ({
    set src(_: string) {
      this.onload && this.onload();
    },
    onload: null,
    onerror: null,
    naturalWidth: width,
    naturalHeight: height,
  }));
}

// ---------------------------------------------------------------------------
// Arbitrary generators
// ---------------------------------------------------------------------------

/** Generates a valid image dimension in the range [1, 3000] */
const dimensionArb = fc.integer({ min: 1, max: 3000 });

/** Generates a synthetic JPEG or PNG File with valid size (1 byte – 5 MB) */
const syntheticImageFileArb = fc
  .tuple(
    dimensionArb,                                    // width
    dimensionArb,                                    // height
    fc.constantFrom('image/jpeg', 'image/png'),      // mime type
    fc.integer({ min: 1, max: 1024 * 100 })          // file payload size (≤ 100 KB for speed)
  )
  .map(([width, height, mimeType, payloadSize]) => {
    const data = new Uint8Array(payloadSize);
    data.fill(0xab);
    const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
    return {
      file: new File([data], `test-${width}x${height}.${extension}`, { type: mimeType }),
      width,
      height,
    };
  });

// ---------------------------------------------------------------------------
// Property 3
// ---------------------------------------------------------------------------

describe('Property 3: Compression output is always a valid Blob (Validates: Requirements 3.2)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('compressImage always resolves to a Blob with size > 0 for valid synthetic images', async () => {
    await fc.assert(
      fc.asyncProperty(syntheticImageFileArb, async ({ file, width, height }) => {
        setupMocksForDimensions(width, height);

        const result = await imageCompressionService.compressImage(file);

        // Property: result.blob must be a Blob instance
        expect(result.blob).toBeInstanceOf(Blob);
        // Property: result.blob must have size > 0
        expect(result.blob.size).toBeGreaterThan(0);

        jest.restoreAllMocks();
      }),
      { numRuns: 100 }
    );
  });
});
