import { NextRequest, NextResponse } from 'next/server';
import { AuthError, requireUid } from '../../../lib/strategist/serverAuth';
import { generate, ChatMsg } from '../../../lib/strategist/gateway';
import { Power, StrategistTask, TierConfig, classifyTurn, taskPower } from '../../../lib/strategist/tierRouter';
import { isByteStringSafeApiKey } from '../../../lib/utils/cryptoVault';

export const dynamic = 'force-dynamic';

const MAX_BODY_MESSAGES = 30;
const MAX_TEXT = 12000;

/**
 * POST /api/strategist
 * Requires `Authorization: Bearer <Firebase ID token>`. The uid comes only from the verified token.
 * The BYOK key arrives per request, is used once and is never logged or stored.
 * Nothing is persisted here; the signed-in browser stores data under owner-only Firestore rules.
 */
export async function POST(req: NextRequest) {
  try {
    await requireUid(req);
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ success: false, error: e.message || 'Unauthorized' }, { status });
  }

  try {
    const body = await req.json();
    const task: StrategistTask = body.task || 'chat';
    const tiers: TierConfig[] = Array.isArray(body.tiers) ? body.tiers : [];
    const messages: ChatMsg[] = (Array.isArray(body.messages) ? body.messages : [])
      .slice(-MAX_BODY_MESSAGES)
      .map((m: any) => ({ role: m?.role === 'assistant' ? 'assistant' : 'user', text: String(m?.text ?? '').slice(0, MAX_TEXT) }))
      .filter((m: ChatMsg) => m.text);
    if (messages.length === 0) return NextResponse.json({ success: false, error: 'No message' }, { status: 400 });

    const onlyEnvVendor = tiers.length > 0 && tiers.every((t) => t.vendor === 'Gemini');
    const apiKey = isByteStringSafeApiKey(body.apiKey) ? body.apiKey : onlyEnvVendor ? process.env.GEMINI_API_KEY || '' : '';
    const vendorNeedsKey = tiers.some((t) => t.vendor !== 'Ollama');
    if (vendorNeedsKey && !apiKey) {
      return NextResponse.json({ success: false, error: 'No API key available. Add your key in LLM Settings.' }, { status: 400 });
    }

    let power: Power = taskPower(task);
    if (task === 'chat') power = classifyTurn(messages[messages.length - 1].text);

    const result = await generate({
      tiers,
      power,
      apiKey,
      system: typeof body.system === 'string' ? body.system.slice(0, MAX_TEXT) : undefined,
      messages,
      json: !!body.json,
    });

    return NextResponse.json({
      success: true,
      text: result.text,
      tier: { rank: result.tier.rank, vendor: result.tier.vendor, model: result.tier.model },
      power,
      attempts: result.attempts.map((a) => ({ tier: a.tier, ok: !a.error })),
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e?.message || e).slice(0, 300) }, { status: 502 });
  }
}
