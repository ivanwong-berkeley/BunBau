import { describe, it, expect } from 'vitest';
import { generateTaxComparison } from '../../../src/lib/tax/taxComparisonEngine';
import { DEMO_TAX_RETURN_2024, DEMO_TAX_RETURN_2025, generateSyntheticTaxReturnForYear } from '../../../src/lib/tax/seedData';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '../../../src');

describe('Milestone v7.0: Chronological Dynamic Tax Return Processing & Latest Year (2025) KPI Focus', () => {
  const cardsCode = fs.readFileSync(path.join(SRC, 'components/tax/TaxExecutiveSummaryCards.tsx'), 'utf8');
  const expertViewCode = fs.readFileSync(path.join(SRC, 'components/tax/TaxExpertView.tsx'), 'utf8');

  it('1. Generates comparison with latestYear (2025) and previousYear (2024) dynamically', () => {
    const comparison = generateTaxComparison(DEMO_TAX_RETURN_2024, DEMO_TAX_RETURN_2025);
    expect(comparison.latestYear).toBe(2025);
    expect(comparison.previousYear).toBe(2024);
    expect(comparison.years).toEqual([2024, 2025]);

    // Latest year AGI focus
    expect(comparison.kpis.agi.latest).toBe(204100);
    expect(comparison.kpis.agi.previous).toBe(292000);
    expect(comparison.kpis.latestYear).toBe(2025);
    expect(comparison.kpis.previousYear).toBe(2024);
  });

  it('2. Evaluates chronological sorting across multi-year history (e.g. 2016..2025)', () => {
    // Generate synthetic returns from 2016 through 2025
    const multiYearReturns = [2020, 2018, 2024, 2016, 2025, 2021].map((yr) =>
      generateSyntheticTaxReturnForYear(yr)
    );

    const sorted = [...multiYearReturns].sort((a, b) => a.taxYear - b.taxYear);
    expect(sorted[0].taxYear).toBe(2016);
    expect(sorted[sorted.length - 1].taxYear).toBe(2025);
    expect(sorted[sorted.length - 2].taxYear).toBe(2024);

    const latest = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];

    const comparison = generateTaxComparison(previous, latest);
    expect(comparison.latestYear).toBe(2025);
    expect(comparison.previousYear).toBe(2024);
    expect(comparison.kpis.agi.latest).toBe(243200);
    expect(comparison.kpis.agi.previous).toBe(230000);
  });

  it('3. Supports future year upload (e.g. 2026) advancing focus to 2026 vs 2025 with 2027 loss shields', () => {
    const ret2025 = generateSyntheticTaxReturnForYear(2025);
    const ret2026 = generateSyntheticTaxReturnForYear(2026);

    const comparison = generateTaxComparison(ret2025, ret2026);
    expect(comparison.latestYear).toBe(2026);
    expect(comparison.previousYear).toBe(2025);
    expect(comparison.kpis.nextLossShieldYear).toBe(2027);
  });

  it('4. Enforces explicit latest year header titles and Latest Filing badges in TaxExecutiveSummaryCards.tsx', () => {
    expect(cardsCode).toContain('{latestYear} Adjusted Gross Income');
    expect(cardsCode).toContain('{latestYear} Total Tax (Fed + CA)');
    expect(cardsCode).toContain('{latestYear} Effective Tax Rate');
    expect(cardsCode).toContain('{nextShieldYear} Loss Shields');
    expect(cardsCode).toContain('Latest Filing ({latestYear})');
    expect(cardsCode).toContain('vs {previousYear}');
    expect(cardsCode).toContain('data-testid="kpi-agi-latest"');
    expect(cardsCode).toContain('data-testid="kpi-totaltax-latest"');
    expect(cardsCode).toContain('data-testid="kpi-rate-latest"');
    expect(cardsCode).toContain('data-testid="kpi-shields-latest"');
  });

  it('5. Enforces chronological pipeline wiring in TaxExpertView.tsx', () => {
    expect(expertViewCode).toContain('resolvedSortedReturns');
    expect(expertViewCode).toContain('currentLatestReturn');
    expect(expertViewCode).toContain('currentPreviousReturn');
    expect(expertViewCode).toContain('generateTaxComparison(currentPreviousReturn, currentLatestReturn)');
  });
});
