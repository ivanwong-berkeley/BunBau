import { describe, it, expect } from 'vitest';
import { normalizeExtraction, mergeExtractions, ExtractionError } from '../../src/lib/extraction/normalize';
import { extractWithGemini, listGeminiModels, LlmHttpError } from '../../src/lib/extraction/gemini';

const raw = {
  institution: 'Fidelity',
  account: '***-6238',
  positions: [
    { symbol: 'CASH', category: 'cash', value: '$100,008.97' },
    { symbol: 'AAPL 310 Put', category: 'put', value: 103, quantity: 1, strikePrice: 310, expiry: '2026-12-18' },
    { symbol: 'T 28 Call', category: 'Covered Call', value: -8, quantity: -1, underlyingSymbol: 'T', strikePrice: 28 },
    { symbol: 'UNH', category: 'Stock', value: 37190, quantity: 100 },
    { symbol: '', category: 'Stock', value: 5 },
    { symbol: 'BAD', category: 'Stock', value: 'n/a' },
  ],
};

describe('normalizeExtraction', () => {
  it('cleans numbers, categories, option signs and drops junk rows', () => {
    const r = normalizeExtraction(raw);
    expect(r.positions.map((p) => p.symbol)).toEqual(['CASH', 'AAPL 310 Put', 'T 28 Call', 'UNH']);
    expect(r.positions[0]).toMatchObject({ category: 'Cash', value: 100008.97 });
    expect(r.positions[1]).toMatchObject({ category: 'CSP', value: -103, quantity: -1 });
    expect(r.positions[1].metadata).toMatchObject({ underlyingSymbol: 'AAPL', strikePrice: 310, expiry: '2026-12-18' });
    expect(r.positions[2].metadata?.underlyingSymbol).toBe('T');
  });
  it('rejects empty / unidentifiable results', () => {
    expect(() => normalizeExtraction(null)).toThrow(ExtractionError);
    expect(() => normalizeExtraction({ ...raw, institution: '' })).toThrow(/institution/);
    expect(() => normalizeExtraction({ ...raw, institution: 'BunBau Not Visible' })).toThrow(/institution/);
    expect(() => normalizeExtraction({ ...raw, institution: 'UNKNOWN' })).toThrow(/institution/);
    expect(() => normalizeExtraction({ ...raw, account: '' })).toThrow(/account/);
    expect(() => normalizeExtraction({ ...raw, positions: [] })).toThrow(/No positions/);
  });
  it('merges pages of the same account without duplicates', () => {
    const a = normalizeExtraction(raw);
    const m = mergeExtractions([a, a]);
    expect(m.positions).toHaveLength(a.positions.length);
  });
});

const okFetch = (body: any, status = 200) =>
  (async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('extractWithGemini', () => {
  it('parses a structured response', async () => {
    const f = okFetch({ candidates: [{ content: { parts: [{ text: JSON.stringify(raw) }] } }] });
    const r = await extractWithGemini({ apiKey: 'k', model: 'gemini-2.5-flash', images: [{ mimeType: 'image/png', data: 'AAAA' }], fetchImpl: f });
    expect(r.institution).toBe('Fidelity');
    expect(r.positions.length).toBe(4);
  });
  it('sends the key in a header, not the URL', async () => {
    let seen: { url?: string; headers?: any } = {};
    const f = (async (url: string, init: any) => {
      seen = { url, headers: init.headers };
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(raw) }] } }] }));
    }) as unknown as typeof fetch;
    await extractWithGemini({ apiKey: 'SECRET', model: 'm', images: [{ mimeType: 'image/png', data: 'A' }], fetchImpl: f });
    expect(seen.url).not.toContain('SECRET');
    expect(seen.headers['x-goog-api-key']).toBe('SECRET');
  });
  it.each([
    [401, /rejected/],
    [403, /rejected/],
    [404, /not available/],
    [429, /rate limit/i],
    [503, /temporarily/],
  ])('maps HTTP %i to a friendly message', async (status, re) => {
    await expect(
      extractWithGemini({ apiKey: 'k', model: 'm', images: [{ mimeType: 'image/png', data: 'A' }], fetchImpl: okFetch('x', status as number) })
    ).rejects.toThrow(re as RegExp);
  });
  it('handles blocked / empty and malformed output', async () => {
    const img = [{ mimeType: 'image/png', data: 'A' }];
    await expect(extractWithGemini({ apiKey: 'k', model: 'm', images: img, fetchImpl: okFetch({ promptFeedback: { blockReason: 'SAFETY' } }) })).rejects.toThrow(/SAFETY/);
    await expect(extractWithGemini({ apiKey: 'k', model: 'm', images: img, fetchImpl: okFetch({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] }) })).rejects.toThrow(/malformed/);
    await expect(extractWithGemini({ apiKey: 'k', model: 'm', images: img, fetchImpl: okFetch({ candidates: [{ content: { parts: [{ text: '{"institution":"X","account":"1","positions":[]}' }] } }] }) })).rejects.toThrow(ExtractionError);
  });
});

describe('listGeminiModels', () => {
  it('keeps only generateContent gemini models', async () => {
    const f = okFetch({
      models: [
        { name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
        { name: 'models/gemini-embedding-001', supportedGenerationMethods: ['generateContent'] },
      ],
    });
    expect(await listGeminiModels('k', f)).toEqual(['gemini-2.5-pro', 'gemini-2.5-flash']);
  });
  it('throws LlmHttpError on bad key', async () => {
    await expect(listGeminiModels('bad', okFetch('no', 403))).rejects.toBeInstanceOf(LlmHttpError);
  });
});
