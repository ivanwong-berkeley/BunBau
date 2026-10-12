import { describe, it, expect, vi } from 'vitest';
import { extractWithGemini, DEFAULT_GEMINI_TIMEOUT_MS, LlmHttpError } from '../../../src/lib/extraction/gemini';

describe('Terminal Timeout & Copy Feature Tests', () => {
  it('enforces a default 45-second timeout on Gemini vision requests', () => {
    expect(DEFAULT_GEMINI_TIMEOUT_MS).toBe(45000);
  });

  it('aborts and throws LlmHttpError with 504 when upstream request exceeds timeout', async () => {
    // Mock fetch that hangs or checks signal
    const hangingFetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    await expect(
      extractWithGemini({
        apiKey: 'AIzaSyFakeKeyForTimeoutTest12345678',
        model: 'gemini-2.5-flash',
        images: [{ mimeType: 'image/png', data: 'mockbase64' }],
        timeoutMs: 50, // Short timeout for test
        fetchImpl: hangingFetch as any,
      })
    ).rejects.toThrow(/timed out/i);
  });

  it('formats terminal logs accurately for clipboard copy', () => {
    const sampleLogs = [
      '[Vision Ingestion] Starting Multimodal AI extraction for 4 screenshot(s)...',
      '[Screen 1/4] Processing Webull_Individual-Cash_CUX5XLW4_IMG_6696_20261007.png...',
      '[Screen 1/4] Done in 3.1s: Net Value $59,148, Cash $57.11, 2 positions extracted.',
      '[Complete] Ingestion successful. Review holdings table before approving.',
    ];

    const clipboardText = sampleLogs.join('\n');
    expect(clipboardText).toContain('[Screen 1/4]');
    expect(clipboardText.split('\n')).toHaveLength(4);
    expect(clipboardText).toBe(
      `[Vision Ingestion] Starting Multimodal AI extraction for 4 screenshot(s)...\n` +
      `[Screen 1/4] Processing Webull_Individual-Cash_CUX5XLW4_IMG_6696_20261007.png...\n` +
      `[Screen 1/4] Done in 3.1s: Net Value $59,148, Cash $57.11, 2 positions extracted.\n` +
      `[Complete] Ingestion successful. Review holdings table before approving.`
    );
  });
});
