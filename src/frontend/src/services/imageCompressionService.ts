/**
 * Image Compression Service - T083
 *
 * Handles client-side image compression to 60-70% JPEG quality before S3 upload.
 * This reduces storage costs and bandwidth requirements while maintaining acceptable quality.
 *
 * Features:
 * - Compress images to specified JPEG quality (default 65%)
 * - Validate file types (JPEG, PNG only)
 * - Validate file size (max 5MB)
 * - Return compressed image as Blob for upload
 * - Generate human-readable compression statistics
 *
 * Usage:
 *   const compressed = await imageCompressionService.compressImage(file);
 *   console.log(`Original: ${compressed.originalSize} bytes, Compressed: ${compressed.compressedSize} bytes`);
 *   // Use compressed.blob for upload
 */

interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  originalDimensions: {
    width: number;
    height: number;
  };
  compressedDimensions: {
    width: number;
    height: number;
  };
  compressionRatio: number; // percentage of original size
  quality: number;
}

interface CompressionOptions {
  quality?: number; // 0-100, default 65 (60-70% range)
  maxWidth?: number; // default 2000px
  maxHeight?: number; // default 2000px
}

class ImageCompressionService {
  private readonly DEFAULT_QUALITY = 65;
  private readonly DEFAULT_MAX_WIDTH = 2000;
  private readonly DEFAULT_MAX_HEIGHT = 2000;
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png'];

  /**
   * Validates that the file is a supported image type
   */
  private validateFileType(file: File): void {
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error(
        `Invalid file type: ${file.type}. Allowed types: JPEG, PNG`
      );
    }
  }

  /**
   * Validates that the file is not larger than the maximum allowed size
   */
  private validateFileSize(file: File): void {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(
        `File size ${this.formatBytes(file.size)} exceeds maximum allowed size of ${this.formatBytes(this.MAX_FILE_SIZE)}`
      );
    }
  }

  /**
   * Loads an image file and returns its dimensions
   */
  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Calculates new dimensions maintaining aspect ratio within constraints
   */
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;

    // Scale down if exceeds max width
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }

    // Scale down if exceeds max height
    if (height > maxHeight) {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }

    return { width, height };
  }

  /**
   * Compresses image using canvas and returns blob
   */
  private compressImageCanvas(
    img: HTMLImageElement,
    newWidth: number,
    newHeight: number,
    quality: number
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality / 100
      );
    });
  }

  /**
   * Formats bytes to human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Compresses an image file to specified JPEG quality
   *
   * @param file The image file to compress
   * @param options Compression options (quality, maxWidth, maxHeight)
   * @returns CompressionResult with compressed blob and statistics
   */
  async compressImage(
    file: File,
    options: CompressionOptions = {}
  ): Promise<CompressionResult> {
    // Validate file
    this.validateFileType(file);
    this.validateFileSize(file);

    const quality = options.quality ?? this.DEFAULT_QUALITY;
    const maxWidth = options.maxWidth ?? this.DEFAULT_MAX_WIDTH;
    const maxHeight = options.maxHeight ?? this.DEFAULT_MAX_HEIGHT;

    // Load image to get dimensions
    const img = await this.loadImage(file);
    const originalDimensions = {
      width: img.naturalWidth,
      height: img.naturalHeight,
    };

    // Calculate new dimensions
    const compressedDimensions = this.calculateDimensions(
      img.naturalWidth,
      img.naturalHeight,
      maxWidth,
      maxHeight
    );

    // Compress image
    const compressedBlob = await this.compressImageCanvas(
      img,
      compressedDimensions.width,
      compressedDimensions.height,
      quality
    );

    const originalSize = file.size;
    const compressedSize = compressedBlob.size;
    const compressionRatio = Math.round((compressedSize / originalSize) * 100);

    return {
      blob: compressedBlob,
      originalSize,
      compressedSize,
      originalDimensions,
      compressedDimensions,
      compressionRatio,
      quality,
    };
  }

  /**
   * Gets compression statistics as human-readable string
   */
  getCompressionStats(result: CompressionResult): string {
    return (
      `Original: ${this.formatBytes(result.originalSize)} (${result.originalDimensions.width}x${result.originalDimensions.height}px) ` +
      `→ Compressed: ${this.formatBytes(result.compressedSize)} (${result.compressedDimensions.width}x${result.compressedDimensions.height}px, ${result.quality}% quality) ` +
      `→ ${result.compressionRatio}% of original size`
    );
  }
}

export const imageCompressionService = new ImageCompressionService();
export type { CompressionResult, CompressionOptions };
