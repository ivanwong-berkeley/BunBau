import { describe, it, expect } from 'vitest';
import { sample2024Return, sample2025Return, samplePortfolioTaxShields } from '../../../src/lib/tax/seedData';
import { generateTaxComparison } from '../../../src/lib/tax/taxComparisonEngine';

describe('Tax Expert: Multi-Year Tax Return Calculations & Anomaly Engine', () => {
  it('1. Verifies 2024 Filed Tax Return dollar-for-dollar integrity', () => {
    expect(sample2024Return.taxYear).toBe(2024);
    expect(sample2024Return.profile.primaryTaxpayer.name).toBe('Alex Taylor');
    expect(sample2024Return.profile.spouseTaxpayer?.name).toBe('Jordan Taylor');
    expect(sample2024Return.profile.filingStatus).toBe('MFJ');

    // Income
    const fed = sample2024Return.federal;
    expect(fed.w2Wages).toBe(215000);
    expect(fed.taxableInterest).toBe(18500);
    expect(fed.ordinaryDividends).toBe(5200);
    expect(fed.qualifiedDividends).toBe(5000);
    expect(fed.capitalGainLossLine7).toBe(3500);
    expect(fed.schedule1AdditionalIncome).toBe(50300);
    expect(fed.agi).toBe(292000);

    // Deductions & Tax
    expect(fed.deductionTypeUsed).toBe('standard');
    expect(fed.standardDeduction).toBe(29200);
    expect(fed.qbiDeduction).toBe(11500);
    expect(fed.taxableIncome).toBe(251300);

    // Total Federal Tax & Payments
    expect(fed.totalFederalTax).toBe(47200);
    expect(fed.niitTax).toBe(1596);
    expect(fed.estimatedTaxPenalty).toBe(450);
    expect(fed.totalFederalPayments).toBe(49500);
    expect(fed.federalOverpayment).toBe(2300);
  });

  it('2. Verifies 2025 Filed Tax Return dollar-for-dollar integrity', () => {
    expect(sample2025Return.taxYear).toBe(2025);
    const fed = sample2025Return.federal;
    expect(fed.w2Wages).toBe(188000); // Reduced W-2
    expect(fed.taxableInterest).toBe(16200);
    expect(fed.ordinaryDividends).toBe(6400);
    expect(fed.capitalGainLossLine7).toBe(-3000); // Max allowable ordinary deduction
    expect(fed.agi).toBe(204100);

    // Expanded SALT cap itemization
    expect(fed.deductionTypeUsed).toBe('itemized');
    expect(fed.itemizedDeductions?.deductibleSalt).toBe(40000); // Expanded SALT cap
    expect(fed.itemizedDeductions?.totalCharitableGifts).toBe(5500);
    expect(fed.itemizedDeductions?.gamblingLosses).toBe(3000);
    expect(fed.totalDeductionsClaimed).toBe(48500);
    expect(fed.taxableIncome).toBe(155600);

    // Total Federal Tax & Overpayment
    expect(fed.totalFederalTax).toBe(23400);
    expect(fed.niitTax).toBe(0); // Eliminated under $250k
    expect(fed.federalOverpayment).toBe(23800);
    expect(fed.overpaymentAppliedToNextYear).toBe(23800);
  });

  it('3. Verifies Capital Loss and Suspended Passive Rental Loss Carryovers', () => {
    const fed25 = sample2025Return.federal;
    expect(fed25.capitalLossCarryoverToNextYear).toBe(28500);
    expect(fed25.form8582.unallowedSuspendedLossCarryforward).toBe(36000);
    expect(fed25.form8995.qbiLossCarryforward).toBe(9445);

    // Live portfolio tax shields
    expect(samplePortfolioTaxShields.capitalLossCarryover).toBe(28500);
    expect(samplePortfolioTaxShields.suspendedRentalLoss).toBe(36000);
    expect(samplePortfolioTaxShields.qbiLossCarryover).toBe(9445);
    expect(samplePortfolioTaxShields.unrealizedLosses).toBe(14250);
    expect(samplePortfolioTaxShields.totalLossShieldUtilization).toBe(88195);
  });

  it('4. Verifies TaxComparisonEngine calculations, variances, and anomalies', () => {
    const comparison = generateTaxComparison(sample2024Return, sample2025Return);

    expect(comparison.years).toEqual([2024, 2025]);

    // AGI variance
    expect(comparison.kpis.agi.year2024).toBe(292000);
    expect(comparison.kpis.agi.year2025).toBe(204100);
    expect(comparison.kpis.agi.diff).toBe(-87900);
    expect(comparison.kpis.agi.diffPct).toBeCloseTo(-30.1, 1);

    // Tax variance
    expect(comparison.kpis.totalTax.diff).toBe(-28800);

    // Anomaly detection
    expect(comparison.anomalies.length).toBeGreaterThanOrEqual(4);
    const lossAnomaly = comparison.anomalies.find((a) => a.id === 'anomaly-loss-carryover');
    expect(lossAnomaly).toBeDefined();
    expect(lossAnomaly?.severity).toBe('opportunity');

    const passiveLossAnomaly = comparison.anomalies.find((a) => a.id === 'anomaly-passive-loss');
    expect(passiveLossAnomaly).toBeDefined();

    const safeHarborAnomaly = comparison.anomalies.find((a) => a.id === 'anomaly-safe-harbor');
    expect(safeHarborAnomaly).toBeDefined();

    const irmaaAnomaly = comparison.anomalies.find((a) => a.id === 'anomaly-irmaa-cliff');
    expect(irmaaAnomaly).toBeDefined();
  });
});
