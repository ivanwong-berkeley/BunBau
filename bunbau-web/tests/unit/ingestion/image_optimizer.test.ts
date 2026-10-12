import { describe, it, expect } from 'vitest';
import {
  optimizeScreenshotForVision,
  MAX_DIMENSION,
  JPEG_QUALITY,
} from '../../../src/lib/extraction/imageOptimizer';

describe('Image Optimizer for Multimodal Vision Ingestion', () => {
  it('exports configuration constants matching performance standards', () => {
    expect(MAX_DIMENSION).toBe(1600);
    expect(JPEG_QUALITY).toBe(0.85);
  });

  it('safely handles non-browser / SSR environment and returns fallback base64 payload', async () => {
    // Create a mock File object
    const blobContent = 'mock-retina-image-bytes-abcdef123456';
    const mockFile = new File([blobContent], 'Webull_Individual-Cash_CUX5XLW4_IMG_6696_20261007.png', {
      type: 'image/png',
    });

    const result = await optimizeScreenshotForVision(mockFile);

    expect(result).toBeDefined();
    expect(result.mimeType).toBe('image/png');
    expect(typeof result.data).toBe('string');
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.originalSizeBytes).toBe(mockFile.size);
    expect(result.compressionRatio).toBeLessThanOrEqual(1.0);
  });
});
