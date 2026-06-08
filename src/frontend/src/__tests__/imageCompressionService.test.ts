/**
 * Unit tests for imageCompressionService
 * Covers tasks 3.1 and 3.2
 */
import { imageCompressionService } from '../services/imageCompressionService';

// ---------------------------------------------------------------------------
// Canvas context mock — jsdom does not implement canvas.getContext('2d')
// ---------------------------------------------------------------------------

const mockCtx = {
  drawImage: jest.fn(),
};

function mockCanvasContext(): void {
  jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);
}

// ---------------------------------------------------------------------------
// Helpers to mock FileReader and Image
// ---------------------------------------------------------------------------

function mockFileReaderAndImage(): void {
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
    naturalWidth: 100,
    naturalHeight: 100,
  }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSyntheticImageFile(
  name = 'test.jpg',
  type = 'image/jpeg'
): File {
  const data = new Uint8Array(1024);
  data.fill(0xab);
  return new File([data], name, { type });
}

// ---------------------------------------------------------------------------
// Task 3.1 — compressImage resolves to a Blob
// Requirements: 3.2
// ---------------------------------------------------------------------------

describe('imageCompressionService — compressImage resolves to a Blob', () => {
  beforeEach(() => {
    mockCanvasContext();
    mockFileReaderAndImage();

    // toBlob calls back with a real Blob
    jest
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation(function (
        _callback: BlobCallback,
        _type?: string,
        _quality?: number
      ) {
        const blob = new Blob(['compressed-image-data'], { type: 'image/jpeg' });
        _callback(blob);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('result.blob should be a Blob instance', async () => {
    const file = createSyntheticImageFile();
    const result = await imageCompressionService.compressImage(file);
    expect(result.blob).toBeInstanceOf(Blob);
  });

  it('result.blob.size should be greater than 0', async () => {
    const file = createSyntheticImageFile();
    const result = await imageCompressionService.compressImage(file);
    expect(result.blob.size).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Task 3.2 — compressImageCanvas rejects when toBlob returns null
// Requirements: 3.3
// ---------------------------------------------------------------------------

describe('imageCompressionService — rejects when toBlob returns null', () => {
  beforeEach(() => {
    mockCanvasContext();
    mockFileReaderAndImage();

    // toBlob calls back with null — simulates canvas failure
    jest
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation(function (
        callback: BlobCallback,
        _type?: string,
        _quality?: number
      ) {
        callback(null);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should reject with message "Failed to compress image" when toBlob returns null', async () => {
    const file = createSyntheticImageFile();
    await expect(imageCompressionService.compressImage(file)).rejects.toThrow(
      'Failed to compress image'
    );
  });
});
