import { describe, it, expect, vi } from 'vitest';
import { generate, ADAPTERS } from '../../../src/lib/strategist/gateway';
import { requireUid, AuthError, bearerToken } from '../../../src/lib/strategist/serverAuth';

const okFetch = (text: string) =>
  vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }], choices: [{ message: { content: text } }], content: [{ text }] }), { status: 200 }));

describe('gateway', () => {
  it('T15: each adapter builds a request and parses a response', async () => {
    for (const vendor of ['Gemini', 'Anthropic', 'OpenAI']) {
      const f = okFetch('hello');
      const out = await ADAPTERS[vendor]({ model: 'm', apiKey: 'k', messages: [{ role: 'user', text: 'hi' }], system: 's' }, f as any);
      expect(out).toBe('hello');
      expect(f).toHaveBeenCalledTimes(1);
    }
  });

  it('T15: unknown vendor gives a clear error', async () => {
    await expect(generate({ tiers: [{ rank: 1, vendor: 'Nope', model: 'x' }], power: 'light', apiKey: 'k', messages: [{ role: 'user', text: 'hi' }] }, okFetch('x') as any)).rejects.toThrow(/Unsupported vendor|All configured models failed/);
  });

  it('T17: heavy tier down falls back to the light tier', async () => {
    let n = 0;
    const f = vi.fn(async (url: any) => {
      n++;
      if (n === 1) return new Response('boom', { status: 500 });
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'fallback ok' }] } }] }), { status: 200 });
    });
    const r = await generate(
      { tiers: [{ rank: 1, vendor: 'Gemini', model: 'light' }, { rank: 2, vendor: 'Gemini', model: 'heavy' }], power: 'heavy', apiKey: 'k', messages: [{ role: 'user', text: 'plan' }] },
      f as any
    );
    expect(r.text).toBe('fallback ok');
    expect(r.tier.rank).toBe(1);
    expect(r.attempts[0].error).toBeTruthy();
  });

  it('T17: all tiers down -> error naming the vendor and model', async () => {
    const f = vi.fn(async () => new Response('x', { status: 500 }));
    await expect(generate({ tiers: [{ rank: 1, vendor: 'Gemini', model: 'only' }], power: 'light', apiKey: 'k', messages: [{ role: 'user', text: 'hi' }] }, f as any)).rejects.toThrow(/Gemini only/);
  });

  it('T22: the API key is sent as a header, never in the URL, and not echoed in errors', async () => {
    const f = vi.fn(async () => new Response('bad', { status: 401 }));
    await generate({ tiers: [{ rank: 1, vendor: 'Gemini', model: 'm' }], power: 'light', apiKey: 'SECRET-KEY-123', messages: [{ role: 'user', text: 'hi' }] }, f as any).catch((e) => {
      expect(String(e.message)).not.toContain('SECRET-KEY-123');
    });
    const call = (f.mock.calls as any[][])[0];
    expect(String(call[0])).not.toContain('SECRET-KEY-123');
  });
});

describe('server auth (project id only)', () => {
  const req = (h?: string) => ({ headers: new Headers(h ? { authorization: h } : {}) }) as any;

  it('T11: rejects missing, malformed and invalid tokens', async () => {
    const bad = async () => { throw new Error('expired'); };
    await expect(requireUid(req(), bad)).rejects.toBeInstanceOf(AuthError);
    await expect(requireUid(req('Basic abc'), bad)).rejects.toBeInstanceOf(AuthError);
    await expect(requireUid(req('Bearer tampered'), bad)).rejects.toBeInstanceOf(AuthError);
  });

  it('T12/T27: the uid comes only from the verified token', async () => {
    const ok = async (t: string) => ({ uid: t === 'good' ? 'user-A' : '' });
    expect(await requireUid(req('Bearer good'), ok)).toBe('user-A');
    await expect(requireUid(req('Bearer other'), ok)).rejects.toBeInstanceOf(AuthError);
    expect(bearerToken(req('bearer  xyz '))).toBe('xyz');
  });
});
