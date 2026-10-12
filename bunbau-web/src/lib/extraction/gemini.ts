import { normalizeExtraction, ExtractionHints } from './normalize';
import { ExtractionResult } from '../portfolio/types';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface ImageInput {
  mimeType: string;
  /** base64 without the data: prefix */
  data: string;
}

export const EXTRACTION_PROMPT = `You are a precise financial-data extraction engine. Read the brokerage or bank screenshot(s) and return ONE JSON object.
Rules:
- institution: the brokerage or bank name (e.g. Fidelity, Schwab, WeBull, Vanguard, Citi, Citigold, Chase, Bank of America, Wells Fargo, Marcus, Ally, Capital One, E*TRADE). If screen shows WeBull headers like "< Individual Cash" or "< Rollover IRA", set institution to "WeBull". If screen shows Citigold or Citibank, set institution to "Citi".
- account: masked account id exactly as shown (e.g. ***-6238, CUX5XLW4, CVS8QSX4, -3703, *******3703). Never invent digits.
- accountType: the account type if visible in the header (e.g. "Certificate of Deposit", "Individual Cash", "Rollover IRA", "Brokerage", "Roth IRA", "Checking", "Savings").
- positions: one entry per holding row, including bank deposits, cash / money-market line (symbol "USD" or "CASH", category "Cash").
- category must be one of: Cash, CD, Treasury, BondETF, Stock, ETF, CSP, Covered Call, Crypto.
  For Certificates of Deposit (CD) or time deposits, use category 'CD'. For US Treasuries, T-Bills, and government notes, use 'Treasury'. For savings, checking, or money market cash sweeps, use 'Cash'.
  Short puts are CSP; short calls are Covered Call. Mutual funds and every exchange-traded fund (including crypto/gold ETFs such as FBTC, IBIT, GLDM) are ETF. Use Crypto only for directly held coins.
- value: current market value or deposit amount in USD as a plain number (no $ or commas). Short options are negative.
- quantity: shares / contracts / units (quantity 1 for bank deposit/CD if not specified, negative for short options). Accurately preserve fractional share quantities (e.g. 59.15845, 20.58465, 8.16611, 14.11157).
- For options: fill underlyingSymbol (e.g. "AAPL", "SOFI"), strikePrice (number, e.g. 21.5, 310), and expiry (ISO format "YYYY-MM-DD", e.g. "2026-10-09").
  IMPORTANT FOR BROKERAGES LIKE FIDELITY: In the Symbol column, the option symbol is on line 1 and the expiration date is directly below on line 2 (e.g. "Oct-23-2026"). Convert to YYYY-MM-DD.
  IMPORTANT FOR WEBULL: WeBull displays covered options in a multi-line hierarchy:
  1. Bold expandable group headers (e.g. "SOFI ^" with chevron and total value): SKIP this line (it is an expandable folder total).
  2. Regular unhedged stock rows (e.g. "SOFI", 14.11157 shares): extract as category "Stock".
  3. Strategy combo container lines (e.g. "SOFI [Covered Option]" with order count e.g. 1 or 10): SKIP this line (it is a combo group header).
  4. Collateral stock leg (labeled "Stock", e.g. 100 shares): extract as category "Stock".
  5. Short Call contract leg (e.g. "SOFI $21.5 Call", -1 contract): extract as category "Covered Call" (negative value, underlyingSymbol, strikePrice, expiry).
  CRITICAL: For option value, ALWAYS use the Mkt Value column (e.g. -1.00 or -10.00), NEVER the Last Price per share (e.g. 0.01). Do NOT extract phantom/cut-off option lines lacking expiration.
- For CDs, Treasuries, and yield-bearing accounts: fill apy (percent as number, e.g. 3.00, 4.50, 5.10) and maturityDate (ISO format "YYYY-MM-DD", e.g. "2027-02-15") when visible. Extract APY whenever labeled "Annual Percentage Yield", "APY", "Interest Rate", or "Yield".
- accountTotal: the "Net Account Value" / "Account total" / "On Deposit" figure printed for THIS account (plain number), if visible. Do not include it as a duplicate position if it is the total of the CD/account.
- Skip totals/summary rows. If several screenshots are given they are pages of the same account: combine them without duplicates.
- Option contracts are NOT stocks: use category CSP (put) or Covered Call (call), value negative, and fill underlyingSymbol, strikePrice, expiry.
- If the image is not a brokerage holdings/positions screen or bank deposit screen, set institution to "UNKNOWN" and return an empty positions array. Never invent data.
- Do not guess values that are not visible; omit optional fields instead.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    institution: { type: 'STRING' },
    account: { type: 'STRING' },
    accountType: { type: 'STRING' },
    accountTotal: { type: 'NUMBER' },
    positions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          symbol: { type: 'STRING' },
          name: { type: 'STRING' },
          category: { type: 'STRING' },
          value: { type: 'NUMBER' },
          quantity: { type: 'NUMBER' },
          costBasis: { type: 'NUMBER' },
          apy: { type: 'NUMBER' },
          maturityDate: { type: 'STRING' },
          underlyingSymbol: { type: 'STRING' },
          strikePrice: { type: 'NUMBER' },
          expiry: { type: 'STRING' },
        },
        required: ['symbol', 'category', 'value'],
      },
    },
  },
  required: ['institution', 'account', 'positions'],
};

export class LlmHttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function friendly(status: number, body: string): string {
  if (status === 400 && /API key/i.test(body)) return 'The Gemini API key is invalid.';
  if (status === 401 || status === 403) return 'The Gemini API key was rejected (check it in LLM Settings).';
  if (status === 404) return 'The selected Gemini model is not available for this key.';
  if (status === 429) return 'Gemini rate limit / quota reached. Wait a minute or check your quota.';
  if (status >= 500) return 'Gemini is temporarily unavailable. Try again.';
  return `Gemini request failed (${status}).`;
}

export const DEFAULT_GEMINI_TIMEOUT_MS = 45000;

export async function extractWithGemini(opts: {
  apiKey: string;
  model: string;
  images: ImageInput[];
  userRules?: unknown[];
  hints?: ExtractionHints;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<ExtractionResult> {
  const f = opts.fetchImpl ?? fetch;
  if (!opts.apiKey || /[^\x00-\x7F]/.test(opts.apiKey)) {
    throw new LlmHttpError('Invalid or masked API key format. Please enter a valid Gemini API key.', 401);
  }
  const rules = opts.userRules?.length
    ? `\nUser-defined parsing rules (apply them): ${JSON.stringify(opts.userRules)}`
    : '';
  const hintText = opts.hints
    ? `\nContext hints from file metadata: Institution=${opts.hints.institution || 'Unknown'}, Account=${opts.hints.account || 'Unknown'}, AccountType=${opts.hints.accountType || 'Unknown'}`
    : '';
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: EXTRACTION_PROMPT + rules + hintText },
          ...opts.images.map((i) => ({ inline_data: { mime_type: i.mimeType, data: i.data } })),
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_GEMINI_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  let text = '';
  try {
    res = await f(`${BASE}/models/${encodeURIComponent(opts.model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': opts.apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    text = await res.text();
  } catch (err: any) {
    if (controller.signal.aborted || err?.name === 'AbortError') {
      throw new LlmHttpError(`Gemini vision extraction request timed out after ${Math.round(timeoutMs / 1000)}s. Check network connection.`, 504);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new LlmHttpError(friendly(res.status, text), res.status);
  let payload: any;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new LlmHttpError('Gemini returned an unreadable response.', 502);
  }
  const out = payload?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
  if (!out) {
    const reason = payload?.promptFeedback?.blockReason || payload?.candidates?.[0]?.finishReason;
    throw new LlmHttpError(`Gemini returned no content${reason ? ` (${reason})` : ''}.`, 502);
  }
  let json: any;
  try {
    json = JSON.parse(out.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    throw new LlmHttpError('Gemini returned malformed JSON. Try again.', 502);
  }
  return normalizeExtraction(json, opts.hints);
}

/** Lists models usable for generateContent; also proves the key works. */
export async function listGeminiModels(apiKey: string, fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const res = await fetchImpl(`${BASE}/models?pageSize=200`, { headers: { 'x-goog-api-key': apiKey } });
  const text = await res.text();
  if (!res.ok) throw new LlmHttpError(friendly(res.status, text), res.status);
  const data = JSON.parse(text);
  const names: string[] = (data.models ?? [])
    .filter((m: any) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
    .map((m: any) => String(m.name).replace(/^models\//, ''))
    .filter((n: string) => /^gemini-/.test(n) && !/embedding|aqa|tts|image|live/.test(n));
  return Array.from(new Set(names)).sort().reverse();
}
