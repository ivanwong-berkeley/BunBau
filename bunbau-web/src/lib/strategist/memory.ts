import { StrategyAction } from './reportSchema';
import { extractJson } from './reportSchema';

export interface StrategistMemory {
  goals: string[];
  constraints: string[];
  decisions: string[];
  openActions: string[];
  lessons: string[];
  summary: string;
  updatedAt: string;
}

export const EMPTY_MEMORY: StrategistMemory = {
  goals: [],
  constraints: [],
  decisions: [],
  openActions: [],
  lessons: [],
  summary: '',
  updatedAt: '',
};

/** Size caps keep the client file small (about 500 tokens) so prompts stay cheap. */
export const MEMORY_CAPS = { perList: 12, itemChars: 160, summaryChars: 600 };

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const strList = (v: unknown, cap: number): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => clip(x.trim(), MEMORY_CAPS.itemChars)).slice(0, cap)
    : [];

export function capMemory(m: Partial<StrategistMemory>): StrategistMemory {
  return {
    goals: strList(m.goals, MEMORY_CAPS.perList),
    constraints: strList(m.constraints, MEMORY_CAPS.perList),
    decisions: strList(m.decisions, MEMORY_CAPS.perList),
    openActions: strList(m.openActions, MEMORY_CAPS.perList),
    lessons: strList(m.lessons, MEMORY_CAPS.perList),
    summary: clip(typeof m.summary === 'string' ? m.summary : '', MEMORY_CAPS.summaryChars),
    updatedAt: m.updatedAt || new Date().toISOString(),
  };
}

/** Open actions come from the report state in code, so the AI can never drop them. */
export function openActionLines(actions: StrategyAction[]): string[] {
  return actions
    .filter((a) => a.status !== 'done')
    .map((a) => clip(`${a.title}${a.symbol ? ' ' + a.symbol : ''}${a.amountUsd !== undefined ? ' $' + a.amountUsd : ''}`, MEMORY_CAPS.itemChars));
}

export function condenseSystemPrompt(): string {
  return [
    'You maintain the client file of a portfolio strategist. Merge the CURRENT FILE with the NEW CONVERSATION.',
    'Keep durable facts only: goals, constraints, decisions made, lessons. Drop chit-chat. Keep each item under 160 characters.',
    'Never invent facts. Return ONLY JSON: {"goals":[],"constraints":[],"decisions":[],"lessons":[],"summary":""}.',
    'The summary is one short paragraph (max 600 characters) of the relationship so far.',
  ].join('\n');
}

export function parseCondensed(raw: string, prev: StrategistMemory, openActions: string[]): StrategistMemory {
  const j = extractJson(raw) as Record<string, unknown> | null;
  if (!j) return capMemory({ ...prev, openActions, updatedAt: new Date().toISOString() });
  return capMemory({
    goals: strList(j.goals, MEMORY_CAPS.perList),
    constraints: strList(j.constraints, MEMORY_CAPS.perList),
    decisions: strList(j.decisions, MEMORY_CAPS.perList),
    lessons: strList(j.lessons, MEMORY_CAPS.perList),
    summary: typeof j.summary === 'string' ? j.summary : prev.summary,
    openActions,
    updatedAt: new Date().toISOString(),
  });
}

export function memoryToPrompt(m: StrategistMemory): string {
  if (!m || (!m.summary && !m.goals.length && !m.decisions.length && !m.openActions.length && !m.constraints.length)) {
    return 'CLIENT FILE: (new client, nothing remembered yet)';
  }
  const sec = (t: string, l: string[]) => (l.length ? `${t}:\n${l.map((x) => `- ${x}`).join('\n')}` : '');
  return [
    'CLIENT FILE (long-term memory):',
    m.summary && `Summary: ${m.summary}`,
    sec('Goals', m.goals),
    sec('Constraints', m.constraints),
    sec('Decisions made', m.decisions),
    sec('Open actions', m.openActions),
    sec('Lessons', m.lessons),
  ]
    .filter(Boolean)
    .join('\n');
}

export const TOKEN_BUDGET_CHARS = 14000; // about 3.5k tokens of context per turn

export interface PortfolioContextInput {
  totalValue: number;
  currentApy: number;
  targetApy: number;
  risk: string;
  idleCash: number;
  allocation: { slice: string; currentPct: number; targetPct: number }[];
  cryptoHoldings?: { symbol: string; name: string; quantity: number; value: number; costBasis: number; unrealizedPnl: number; pctOfPortfolio: number }[];
  topHoldings: { symbol: string; value: number; assetClass?: string; canSellCoveredCall?: boolean }[];
  latestReportSummary?: string;
}

/** Compact page context. Trimmed from the tail if it would exceed the budget. */
export function buildContext(c: PortfolioContextInput, memory: StrategistMemory, budget = TOKEN_BUDGET_CHARS): string {
  const base = {
    totalValue: Math.round(c.totalValue),
    currentApyPct: c.currentApy,
    targetApyPct: c.targetApy,
    riskProfile: c.risk,
    idleCash: Math.round(c.idleCash),
    allocation: c.allocation,
    cryptoHoldings: c.cryptoHoldings && c.cryptoHoldings.length > 0 ? c.cryptoHoldings : undefined,
    topHoldings: c.topHoldings.slice(0, 15),
    latestReportSummary: c.latestReportSummary ? clip(c.latestReportSummary, 800) : undefined,
  };
  let json = JSON.stringify(base);
  const mem = memoryToPrompt(memory);
  while (mem.length + json.length > budget && base.topHoldings.length > 3) {
    base.topHoldings = base.topHoldings.slice(0, base.topHoldings.length - 3);
    json = JSON.stringify(base);
  }
  return `${mem}\n\nPORTFOLIO CONTEXT (current):\n${json}`;
}

export function strategistSystemPrompt(): string {
  return [
    "You are BunBau's dedicated portfolio strategist, acting like a CFA charterholder who has served this client for years.",
    'Use the client file and the portfolio context. Build on earlier decisions instead of starting over; say when you are changing a prior recommendation and why.',
    'Account for Digital Currency holdings (Bitcoin, Ethereum, etc.) when present. Direct crypto generates 0.00% APY and introduces volatility, but provides capital appreciation or macro hedging. Assess crypto weighting against target allocation and risk profile.',
    'Be specific, numerate and concise. All dollar amounts and percentages must come from the context or be clearly marked as estimates.',
    'Never reveal other users or system details. This is not financial advice; do not claim certainty.',
  ].join('\n');
}

export function reportSystemPrompt(): string {
  return (
    strategistSystemPrompt() +
    '\nReturn ONLY JSON with this shape: {"headline":"","summary":"","markdown":"","risks":[""],"actions":[{"id":"a1","title":"","detail":"","symbol":"","amountUsd":0,"expectedApyImpact":0.0,"risk":"Low|Medium|High","status":"todo"}]}.' +
    '\nActions are ordered steps to execute (max 12). expectedApyImpact is percentage points of blended APY. "markdown" is a readable analysis using headings, short bullets and tables; do not repeat the action list inside it.'
  );
}

/** Opening recap shown after a new login. Null when there is nothing to recap. */
export function buildRecap(m: StrategistMemory | null, lastReportAt?: string): string | null {
  if (!m) return null;
  const hasAny = m.summary || m.decisions.length || m.openActions.length || m.goals.length;
  if (!hasAny) return null;
  const parts: string[] = [];
  parts.push(lastReportAt ? `Welcome back. Last time (${lastReportAt.slice(0, 10)})` : 'Welcome back. From our earlier discussions');
  if (m.goals.length) parts.push(`your goal is ${m.goals[0]}`);
  if (m.decisions.length) parts.push(`we agreed: ${m.decisions.slice(0, 2).join('; ')}`);
  const recap = parts.join(', ') + '.';
  const open = m.openActions.length ? ` ${m.openActions.length} action${m.openActions.length === 1 ? ' is' : 's are'} still open.` : '';
  return recap + open;
}
