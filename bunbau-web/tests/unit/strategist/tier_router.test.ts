import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { pickTier, fallbackOrder, classifyTurn, taskPower, tiersFromProfile, TierConfig } from '../../../src/lib/strategist/tierRouter';

const t = (rank: number, model = `m${rank}`, vendor = 'V'): TierConfig => ({ rank, vendor, model });

describe('tier router (rank based)', () => {
  it('T24: light picks lowest rank, heavy picks highest, regardless of model names', () => {
    const tiers = [t(2, 'zzz-future-ultra'), t(1, 'aaa-tiny')];
    expect(pickTier(tiers, 'light')?.model).toBe('aaa-tiny');
    expect(pickTier(tiers, 'heavy')?.model).toBe('zzz-future-ultra');
  });

  it('T25: three tiers map low/mid/high, one tier serves everything', () => {
    const three = [t(1), t(2), t(3)];
    expect(pickTier(three, 'light')?.rank).toBe(1);
    expect(pickTier(three, 'medium')?.rank).toBe(2);
    expect(pickTier(three, 'heavy')?.rank).toBe(3);
    const one = [t(1)];
    expect(pickTier(one, 'light')?.rank).toBe(1);
    expect(pickTier(one, 'heavy')?.rank).toBe(1);
    expect(pickTier([], 'heavy')).toBeNull();
  });

  it('T16: tasks route to the right power and escalation works', () => {
    expect(taskPower('chat')).toBe('light');
    expect(taskPower('condense_memory')).toBe('light');
    expect(taskPower('full_report')).toBe('heavy');
    expect(taskPower('revise_plan')).toBe('heavy');
    expect(classifyTurn('What does SGOV stand for?')).toBe('light');
    expect(classifyTurn('Please revise the plan with less cash')).toBe('heavy');
    expect(classifyTurn('Can you rebalance my CDs?')).toBe('heavy');
  });

  it('fallback order starts with the preferred tier then nearest power', () => {
    const tiers = [t(1), t(2), t(3)];
    expect(fallbackOrder(tiers, 'heavy').map((x) => x.rank)).toEqual([3, 2, 1]);
    expect(fallbackOrder(tiers, 'light').map((x) => x.rank)).toEqual([1, 2, 3]);
  });

  it('builds tiers from the vault, falling back to legacy llmConfig', () => {
    const v = tiersFromProfile({ llmTierVersion: 2, llmVault: { activeVendor: 'X', vendors: { X: { tier1Model: 'a', tier2Model: 'b' } } } });
    expect(v).toEqual([{ rank: 1, vendor: 'X', model: 'a' }, { rank: 2, vendor: 'X', model: 'b' }]);
    const l = tiersFromProfile({ llmTierVersion: 2, llmConfig: { tier1: { vendor: 'Y', model: 'c' }, tier2: { vendor: 'Y', model: 'd' } } });
    expect(l.map((x) => x.model)).toEqual(['c', 'd']);
    expect(tiersFromProfile(null)).toEqual([]);
  });

  it('T29: legacy (unconfirmed) profiles keep the old meaning: old Tier 1 is the stronger one', () => {
    const legacy = tiersFromProfile({ llmVault: { activeVendor: 'X', vendors: { X: { tier1Model: 'old-strong', tier2Model: 'old-weak' } } } });
    expect(pickTier(legacy, 'heavy')?.model).toBe('old-strong');
    expect(pickTier(legacy, 'light')?.model).toBe('old-weak');
    const confirmed = tiersFromProfile({ llmTierVersion: 2, llmVault: { activeVendor: 'X', vendors: { X: { tier1Model: 'old-weak', tier2Model: 'old-strong' } } } });
    expect(pickTier(confirmed, 'heavy')?.model).toBe('old-strong');
  });
});

describe('T18/T26: no vendor or model names outside adapters', () => {
  const dir = path.resolve(__dirname, '../../../src/lib/strategist');
  const banned = /(gemini|claude|anthropic|openai|gpt-|llama|mistral|ollama|haiku|sonnet)/i;
  const allowed = ['gateway.ts']; // the adapter module is the only place vendor names may live
  const files = fs.readdirSync(dir).filter((f) => /\.(ts|tsx)$/.test(f) && !allowed.includes(f));

  it.each(files)('%s has no vendor/model name', (f) => {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    // vendor name in a type position from profile (e.g. "Gemini") is not allowed either
    expect(banned.test(src)).toBe(false);
  });

  it('the strategist API route has no model names (vendor key fallback is the only vendor mention)', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../../src/app/api/strategist/route.ts'), 'utf8');
    expect(/(gemini-|claude-|gpt-|(?<![a-z])llama|mistral)/i.test(src)).toBe(false);
  });
});
