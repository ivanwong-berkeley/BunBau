/**
 * Strategist tier routing.
 *
 * Tiers are identified ONLY by power rank (1 = lightest, higher = more powerful).
 * This module must never branch on a vendor or model name (enforced by
 * tests/unit/strategist/tier_router.test.ts).
 */

export interface TierConfig {
  /** 1 = lightest. Higher = more powerful. */
  rank: number;
  vendor: string;
  model: string;
}

export type Power = 'light' | 'medium' | 'heavy';

export type StrategistTask =
  | 'chat'
  | 'summarize'
  | 'condense_memory'
  | 'title'
  | 'json_repair'
  | 'full_report'
  | 'revise_plan';

const TASK_POWER: Record<StrategistTask, Power> = {
  chat: 'light',
  summarize: 'light',
  condense_memory: 'light',
  title: 'light',
  json_repair: 'light',
  full_report: 'heavy',
  revise_plan: 'heavy',
};

export function taskPower(task: StrategistTask): Power {
  return TASK_POWER[task];
}

const ESCALATION = [
  /\b(revise|update|rework|redo|rebuild|rewrite)\b.*\b(plan|allocation|strategy|report)\b/i,
  /\bnew\s+(plan|allocation|strategy|numbers?)\b/i,
  /\b(recalculate|re-?calc|re-?allocate|rebalance)\b/i,
  /\bwhat\s+(allocation|mix)\b/i,
];

/** A light chat turn that asks for new numbers or a plan change is escalated to heavy. */
export function classifyTurn(text: string): Power {
  return ESCALATION.some((re) => re.test(text)) ? 'heavy' : 'light';
}

function sortByRank(tiers: readonly TierConfig[]): TierConfig[] {
  return [...tiers]
    .filter((t) => t && t.model)
    .sort((a, b) => a.rank - b.rank);
}

/** Picks the tier that matches the power level. One tier: it is used for everything. */
export function pickTier(tiers: readonly TierConfig[], power: Power): TierConfig | null {
  const s = sortByRank(tiers);
  if (s.length === 0) return null;
  if (power === 'light') return s[0];
  if (power === 'heavy') return s[s.length - 1];
  return s[Math.floor((s.length - 1) / 2)];
}

/**
 * Attempt order for a power level: the preferred tier first, then the remaining tiers,
 * nearest in power first (so a failing heavy tier falls back to the next strongest).
 */
export function fallbackOrder(tiers: readonly TierConfig[], power: Power): TierConfig[] {
  const s = sortByRank(tiers);
  const first = pickTier(s, power);
  if (!first) return [];
  const rest = s
    .filter((t) => t !== first)
    .sort((a, b) => Math.abs(a.rank - first.rank) - Math.abs(b.rank - first.rank));
  return [first, ...rest];
}

/** Builds the tier list from the profile (vault entry for the active vendor, else legacy llmConfig). */
export function tiersFromProfile(profile: {
  llmVault?: {
    activeVendor?: string;
    vendors?: Record<string, { tier1Model?: string; tier2Model?: string } | undefined>;
  };
  llmConfig?: { tier1?: { vendor: string; model: string }; tier2?: { vendor: string; model: string } };
  /** 2 = Tier 1 is the lighter model. Anything else = legacy (Tier 1 was the stronger one). */
  llmTierVersion?: number;
} | null | undefined): TierConfig[] {
  if (!profile) return [];
  // Legacy profiles (not yet confirmed in LLM Settings) keep their old meaning: Tier 1 was the stronger model.
  const legacy = profile.llmTierVersion !== 2;
  const rankOf = (tierNo: 1 | 2) => (legacy ? (tierNo === 1 ? 2 : 1) : tierNo);
  const vendor = profile.llmVault?.activeVendor;
  const v = vendor ? profile.llmVault?.vendors?.[vendor] : undefined;
  const out: TierConfig[] = [];
  if (vendor && v && (v.tier1Model || v.tier2Model)) {
    if (v.tier1Model) out.push({ rank: rankOf(1), vendor, model: v.tier1Model });
    if (v.tier2Model) out.push({ rank: rankOf(2), vendor, model: v.tier2Model });
    return out.sort((a, b) => a.rank - b.rank);
  }
  const l = profile.llmConfig;
  if (l?.tier1?.model) out.push({ rank: rankOf(1), vendor: l.tier1.vendor, model: l.tier1.model });
  if (l?.tier2?.model) out.push({ rank: rankOf(2), vendor: l.tier2.vendor, model: l.tier2.model });
  return out.sort((a, b) => a.rank - b.rank);
}
