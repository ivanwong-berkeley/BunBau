/**
 * Vendor adapters + gateway. This is the ONLY strategist module that may contain vendor names.
 * Adding a vendor = adding an entry to ADAPTERS. Model names are never hard-coded here.
 */
import { TierConfig, Power, fallbackOrder } from './tierRouter';

export interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
}

export interface GenerateRequest {
  model: string;
  apiKey: string;
  system?: string;
  messages: ChatMsg[];
  json?: boolean;
}

export type Adapter = (req: GenerateRequest, fetchImpl: typeof fetch) => Promise<string>;

async function failIfBad(res: Response, vendor: string): Promise<void> {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${vendor} error (${res.status}): ${body.slice(0, 160)}`);
  }
}

const gemini: Adapter = async (r, f) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(r.model)}:generateContent`;
  const res = await f(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': r.apiKey },
    body: JSON.stringify({
      ...(r.system ? { systemInstruction: { parts: [{ text: r.system }] } } : {}),
      contents: r.messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] })),
      ...(r.json ? { generationConfig: { responseMimeType: 'application/json' } } : {}),
    }),
  });
  await failIfBad(res, 'Gemini');
  const d = await res.json();
  return d?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
};

const anthropic: Adapter = async (r, f) => {
  const res = await f('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': r.apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: r.model,
      max_tokens: 4096,
      ...(r.system ? { system: r.system } : {}),
      messages: r.messages.map((m) => ({ role: m.role, content: m.text })),
    }),
  });
  await failIfBad(res, 'Anthropic');
  const d = await res.json();
  return (d?.content || []).map((c: any) => c.text || '').join('');
};

function openAiCompatible(vendor: string, baseUrl: () => string, needsKey: boolean): Adapter {
  return async (r, f) => {
    const res = await f(`${baseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(needsKey ? { Authorization: `Bearer ${r.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: r.model,
        messages: [
          ...(r.system ? [{ role: 'system', content: r.system }] : []),
          ...r.messages.map((m) => ({ role: m.role, content: m.text })),
        ],
        ...(r.json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    await failIfBad(res, vendor);
    const d = await res.json();
    return d?.choices?.[0]?.message?.content || '';
  };
}

export const ADAPTERS: Record<string, Adapter> = {
  Gemini: gemini,
  Anthropic: anthropic,
  OpenAI: openAiCompatible('OpenAI', () => 'https://api.openai.com/v1', true),
  Ollama: openAiCompatible(
    'Ollama',
    () => (process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434') + '/v1',
    false
  ),
};

export interface GatewayInput {
  tiers: TierConfig[];
  power: Power;
  apiKey: string;
  system?: string;
  messages: ChatMsg[];
  json?: boolean;
}

export interface GatewayResult {
  text: string;
  tier: TierConfig;
  attempts: { tier: number; model: string; error?: string }[];
}

/** Tries the preferred tier first, then falls back by power distance. Never loses the caller's messages. */
export async function generate(input: GatewayInput, fetchImpl: typeof fetch = fetch): Promise<GatewayResult> {
  const order = fallbackOrder(input.tiers, input.power);
  if (order.length === 0) throw new Error('No model tiers are configured. Open LLM Settings and choose Tier 1 and Tier 2 models.');
  const attempts: GatewayResult['attempts'] = [];
  for (const tier of order) {
    const adapter = ADAPTERS[tier.vendor];
    if (!adapter) {
      attempts.push({ tier: tier.rank, model: tier.model, error: `Unsupported vendor "${tier.vendor}"` });
      continue;
    }
    try {
      const text = await adapter(
        { model: tier.model, apiKey: input.apiKey, system: input.system, messages: input.messages, json: input.json },
        fetchImpl
      );
      if (!text.trim()) throw new Error('Empty response');
      attempts.push({ tier: tier.rank, model: tier.model });
      return { text, tier, attempts };
    } catch (e: any) {
      attempts.push({ tier: tier.rank, model: tier.model, error: String(e?.message || e).slice(0, 200) });
    }
  }
  const last = attempts[attempts.length - 1];
  throw new Error(
    `All configured models failed. Last: ${order[order.length - 1].vendor} ${last?.model} (${last?.error || 'unknown'})`
  );
}
