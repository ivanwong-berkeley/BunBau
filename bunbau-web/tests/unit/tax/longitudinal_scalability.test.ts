import { describe, it, expect } from 'vitest';
import { computeLongitudinalTaxAnalysis } from '../../../src/lib/tax/longitudinalEngine';
import { DEMO_TAX_RETURNS, generateSyntheticTaxReturnForYear } from '../../../src/lib/tax/seedData';
import { CompleteTaxYearReturn } from '../../../src/lib/tax/models';

describe('BunBau v6.5 Longitudinal Scalability Engine', () => {
  it('analyzes the 6 standard demo returns (2020-2025) with accurate macro trends and KPIs', () => {
    expect(DEMO_TAX_RETURNS.length).toBe(6);

    const result = computeLongitudinalTaxAnalysis(DEMO_TAX_RETURNS);

    expect(result.years).toEqual([2020, 2021, 2022, 2023, 2024, 2025]);
    expect(result.earliestYear).toBe(2020);
    expect(result.latestYear).toBe(2025);
    expect(result.macroTrends.length).toBe(6);

    // Verify KPIs
    expect(result.kpis.averageAnnualAgi).toBeGreaterThan(0);
    expect(result.kpis.cumulativeTotalTaxesPaid).toBeGreaterThan(0);
    expect(result.kpis.peakAgiYear).toBeGreaterThanOrEqual(2020);
    expect(result.kpis.lowestAgiYear).toBeGreaterThanOrEqual(2020);
    expect(result.kpis.averageEffectiveRatePct).toBeGreaterThan(0);

    // Verify Cumulative Loss Shield Ledger
    expect(result.lossShieldLedger.length).toBe(6);
    const ledger2025 = result.lossShieldLedger.find((l) => l.year === 2025);
    expect(ledger2025).toBeDefined();
    expect(ledger2025!.capitalLossCarryover).toBe(28500);
    expect(ledger2025!.suspendedPassiveRentalLoss).toBe(36000);
    expect(ledger2025!.totalAvailableShield).toBe(64500);
  });

  it('scales to 10 consecutive years (2016-2025) and executes in < 50ms', () => {
    const tenYearReturns: CompleteTaxYearReturn[] = [];
    for (let yr = 2016; yr <= 2025; yr++) {
      tenYearReturns.push(generateSyntheticTaxReturnForYear(yr));
    }
    expect(tenYearReturns.length).toBe(10);

    const startTime = performance.now();
    const result = computeLongitudinalTaxAnalysis(tenYearReturns);
    const executionDurationMs = performance.now() - startTime;

    // Strict performance requirement: sub-50ms execution
    expect(executionDurationMs).toBeLessThan(50);
    expect(result.years.length).toBe(10);
    expect(result.years[0]).toBe(2016);
    expect(result.years[9]).toBe(2025);

    // Verify matrix rows contain all 10 years
    expect(result.lineItemMatrix.length).toBeGreaterThan(10);
    for (const row of result.lineItemMatrix) {
      expect(Object.keys(row.valuesByYear).length).toBe(10);
      expect(row.valuesByYear[2016]).toBeDefined();
      expect(row.valuesByYear[2025]).toBeDefined();
    }
  });

  it('correctly categorizes line items and computes multi-year CAGR', () => {
    const returns = [
      generateSyntheticTaxReturnForYear(2020),
      generateSyntheticTaxReturnForYear(2025),
    ];

    const result = computeLongitudinalTaxAnalysis(returns);
    const w2Row = result.lineItemMatrix.find((r) => r.key === 'w2_wages');

    expect(w2Row).toBeDefined();
    expect(w2Row!.category).toBe('Income');
    expect(w2Row!.earliestAmount).toBeGreaterThan(0);
    expect(w2Row!.latestAmount).toBeGreaterThan(0);
    expect(w2Row!.overallTrend).toBeDefined();
    expect(typeof w2Row!.cagrPct).toBe('number');
  });

  it('throws a descriptive error when called with empty tax returns', () => {
    expect(() => computeLongitudinalTaxAnalysis([])).toThrow(
      'At least one tax return is required for longitudinal analysis.'
    );
  });
});
