/**
 * BunBau Multi-Year Tax Comparison & Anomaly Engine (v2.8.1 / Milestone v6.42)
 * Compares 2024 vs 2025 tax returns (or any pair of returns) line-by-line across:
 * - 1040 Income, Schedules A, B, D, E, Forms 8582, 8960, 8995, and CA Form 540.
 * Dynamically computes variances, percentage deltas, trends, and detects strategic anomalies.
 */

import { CompleteTaxYearReturn, LineItemComparison, MultiYearTaxComparison } from './models';
import { DEMO_TAX_RETURN_2024, DEMO_TAX_RETURN_2025 } from './seedData';

export function generateTaxComparison(
  returnPrev: CompleteTaxYearReturn = DEMO_TAX_RETURN_2024,
  returnLatest: CompleteTaxYearReturn = DEMO_TAX_RETURN_2025
): MultiYearTaxComparison {
  const return2024 = returnPrev;
  const return2025 = returnLatest;
  const prevYear = returnPrev.taxYear;
  const latestYear = returnLatest.taxYear;

  const f24 = return2024.federal;
  const f25 = return2025.federal;
  const ca24 = return2024.california;
  const ca25 = return2025.california;

  const employerName =
    return2025.profile.spouseTaxpayer?.employerName ||
    return2025.profile.primaryTaxpayer.employerName ||
    'primary employer';

  const rentalProp = return2025.federal.rentalProperties?.[0];
  const rentalAddress = rentalProp?.address || 'residential rental property';

  const partnershipName = return2025.federal.partnerships?.[0]?.entityName || 'passive business partnerships';

  const mkItem = (
    key: string,
    label: string,
    category: LineItemComparison['category'],
    formRef: string,
    y24: number,
    y25: number,
    insight: string,
    p24?: number,
    p25?: number
  ): LineItemComparison => {
    const diffAmount = y25 - y24;
    const diffPercent = y24 !== 0 ? (diffAmount / Math.abs(y24)) * 100 : y25 > 0 ? 100 : 0;
    const trend: LineItemComparison['trend'] = diffAmount > 0 ? 'up' : diffAmount < 0 ? 'down' : 'neutral';

    return {
      key,
      label,
      category,
      formRef,
      year2024: y24,
      year2025: y25,
      previousYearVal: y24,
      latestYearVal: y25,
      diffAmount,
      diffPercent,
      trend,
      impactInsight: insight,
      sourceDocPage2024: p24,
      sourceDocPage2025: p25,
      sourceDocPagePrev: p24,
      sourceDocPageLatest: p25,
    };
  };

  const lossCarryover = f25.capitalLossCarryoverToNextYear;
  const suspendedPassiveLoss = f25.form8582.unallowedSuspendedLossCarryforward;
  const qbiLoss = f25.form8995.qbiLossCarryforward;

  const lineItems: LineItemComparison[] = [
    // 1. Income
    mkItem(
      'w2_wages',
      'W-2 Wages & Salaries',
      'Income',
      'Form 1040 Line 1z',
      f24.w2Wages,
      f25.w2Wages,
      `Reflects shift in ${employerName} base compensation (${f25.w2Wages < f24.w2Wages ? '-' : '+'}${Math.abs(((f25.w2Wages - f24.w2Wages) / f24.w2Wages) * 100).toFixed(1)}%).`,
      15,
      6
    ),
    mkItem(
      'taxable_interest',
      'Taxable Interest',
      'Income',
      'Form 1040 Line 2b / Sch B',
      f24.taxableInterest,
      f25.taxableInterest,
      'Interest from high-yield savings, cash deposits, and money market reserves.',
      15,
      6
    ),
    mkItem(
      'ordinary_dividends',
      'Ordinary Dividends',
      'Income',
      'Form 1040 Line 3b / Sch B',
      f24.ordinaryDividends,
      f25.ordinaryDividends,
      'Dividend yield across taxable index funds and dividend-paying equities.',
      15,
      6
    ),
    mkItem(
      'qualified_dividends',
      'Qualified Dividends',
      'Income',
      'Form 1040 Line 3a',
      f24.qualifiedDividends,
      f25.qualifiedDividends,
      'Eligible for preferential 15% long-term capital gains tax rate.',
      15,
      6
    ),
    mkItem(
      'pensions_annuities',
      'Pensions and Annuities',
      'Income',
      'Form 1040 Line 5b',
      f24.pensionsAndAnnuities,
      f25.pensionsAndAnnuities,
      'Scheduled taxable annuity distribution.',
      15,
      6
    ),
    mkItem(
      'capital_gain_loss',
      'Capital Gain or (Loss)',
      'Income',
      'Form 1040 Line 7 / Sch D',
      f24.capitalGainLossLine7,
      f25.capitalGainLossLine7,
      `Net capital gains/losses capped at IRS ordinary limit; creates $${lossCarryover.toLocaleString()} carryover shield.`,
      15,
      6
    ),
    mkItem(
      'schedule_1_additions',
      'Additional Income / (Loss)',
      'Income',
      'Form 1040 Line 8 / Sch 1',
      f24.schedule1AdditionalIncome,
      f25.schedule1AdditionalIncome,
      'Reflects Schedule E net income/loss combined with other additions.',
      15,
      6
    ),
    mkItem(
      'total_income',
      'Total Income',
      'Income',
      'Form 1040 Line 9',
      f24.totalIncome,
      f25.totalIncome,
      `Gross income before deductions dropped by $${Math.abs(f25.totalIncome - f24.totalIncome).toLocaleString()}.`,
      15,
      6
    ),
    mkItem(
      'agi',
      'Adjusted Gross Income (AGI)',
      'Income',
      'Form 1040 Line 11',
      f24.agi,
      f25.agi,
      `Critical benchmark: ${return2025.taxYear} AGI ($${f25.agi.toLocaleString()}) compared to $${f24.agi.toLocaleString()} in ${return2024.taxYear}.`,
      15,
      6
    ),

    // 2. Deductions
    mkItem(
      'salt_deduction',
      'State & Local Tax (SALT)',
      'Deductions',
      'Schedule A Line 5e',
      f24.itemizedDeductions?.deductibleSalt || 10000,
      f25.itemizedDeductions?.deductibleSalt || 40000,
      `SALT deduction limit: $${(f24.itemizedDeductions?.deductibleSalt || 10000).toLocaleString()} vs $${(f25.itemizedDeductions?.deductibleSalt || 40000).toLocaleString()}.`,
      53,
      11
    ),
    mkItem(
      'charitable_gifts',
      'Charitable Contributions',
      'Deductions',
      'Schedule A Line 14',
      f24.itemizedDeductions?.totalCharitableGifts || 0,
      f25.itemizedDeductions?.totalCharitableGifts || 0,
      'Cash gifts and noncash donations reported on Schedule A.',
      53,
      11
    ),
    mkItem(
      'gambling_losses',
      'Gambling Losses',
      'Deductions',
      'Schedule A Line 16',
      f24.itemizedDeductions?.gamblingLosses || 0,
      f25.itemizedDeductions?.gamblingLosses || 0,
      'Deductible to the exact extent of reported gambling winnings.',
      53,
      11
    ),
    mkItem(
      'total_itemized',
      'Total Itemized Deductions',
      'Deductions',
      'Schedule A Line 17',
      f24.itemizedDeductions?.totalItemizedDeductions || 0,
      f25.itemizedDeductions?.totalItemizedDeductions || 0,
      'Total itemized deductions allowable on Schedule A.',
      53,
      11
    ),
    mkItem(
      'qbi_deduction',
      'QBI Deduction (Form 8995)',
      'Deductions',
      'Form 1040 Line 13 / 8995',
      f24.qbiDeduction,
      f25.qbiDeduction,
      `Section 199A Qualified Business Income deduction claimed.`,
      15,
      7
    ),
    mkItem(
      'taxable_income',
      'Taxable Income',
      'Deductions',
      'Form 1040 Line 15',
      f24.taxableIncome,
      f25.taxableIncome,
      `Base taxable amount shifted by $${Math.abs(f25.taxableIncome - f24.taxableIncome).toLocaleString()}.`,
      15,
      7
    ),

    // 3. Taxes
    mkItem(
      'regular_tax',
      'Regular Federal Income Tax',
      'Taxes',
      'Form 1040 Line 16',
      f24.regularFederalTax,
      f25.regularFederalTax,
      'Calculated via IRS Qualified Dividends and Capital Gain Tax Worksheet.',
      16,
      7
    ),
    mkItem(
      'niit_tax',
      'Net Investment Income Tax (NIIT)',
      'Taxes',
      'Form 1040 Line 23 / 8960',
      f24.niitTax,
      f25.niitTax,
      `3.8% NIIT liability (${f25.niitTax === 0 ? 'eliminated' : `$${f25.niitTax.toLocaleString()}`}).`,
      19,
      7
    ),
    mkItem(
      'total_federal_tax',
      'Total Federal Tax Liability',
      'Taxes',
      'Form 1040 Line 24',
      f24.totalFederalTax,
      f25.totalFederalTax,
      `Total federal burden changed by $${Math.abs(f25.totalFederalTax - f24.totalFederalTax).toLocaleString()}.`,
      16,
      7
    ),
    mkItem(
      'ca_tax',
      'California State Tax (Form 540)',
      'California',
      'Form 540 Line 64',
      ca24.caTaxAfterCredits,
      ca25.caTaxAfterCredits,
      `California state liability shifted by $${Math.abs(ca25.caTaxAfterCredits - ca24.caTaxAfterCredits).toLocaleString()}.`,
      38,
      36
    ),
    mkItem(
      'combined_tax',
      'Total Combined Tax (Fed + CA)',
      'Taxes',
      'Consolidated',
      return2024.totalCombinedTax,
      return2025.totalCombinedTax,
      `Combined tax changed from $${return2024.totalCombinedTax.toLocaleString()} to $${return2025.totalCombinedTax.toLocaleString()}.`,
      16,
      7
    ),

    // 4. Payments & Refunds
    mkItem(
      'withholding_fed',
      'Federal Tax Withheld (W-2)',
      'Payments',
      'Form 1040 Line 25d',
      f24.federalWithholding,
      f25.federalWithholding,
      'W-2 withholdings plus Additional Medicare Tax withholding reconciliation.',
      16,
      7
    ),
    mkItem(
      'estimated_payments',
      'Estimated Tax Payments',
      'Payments',
      'Form 1040 Line 26',
      f24.estimatedTaxPaymentsApplied,
      f25.estimatedTaxPaymentsApplied,
      'Prepayments applied from previous year overpayments and quarterly vouchers.',
      16,
      7
    ),
    mkItem(
      'fed_overpayment',
      'Federal Overpayment (Refund)',
      'Payments',
      'Form 1040 Line 34',
      f24.federalOverpayment,
      f25.federalOverpayment,
      `Federal overpayment: $${f25.federalOverpayment.toLocaleString()} in ${return2025.taxYear}.`,
      16,
      7
    ),
    mkItem(
      'ca_overpayment',
      'California Overpayment',
      'California',
      'Form 540 Line 97',
      ca24.caOverpayment,
      ca25.caOverpayment,
      `California overpayment: $${ca25.caOverpayment.toLocaleString()} in ${return2025.taxYear}.`,
      39,
      37
    ),
    mkItem(
      'underpayment_penalty',
      'Estimated Tax Penalty',
      'Payments',
      'Form 1040 Line 38',
      f24.estimatedTaxPenalty,
      f25.estimatedTaxPenalty,
      `IRS penalty assessed: $${f24.estimatedTaxPenalty.toLocaleString()} in ${return2024.taxYear} vs $${f25.estimatedTaxPenalty.toLocaleString()} in ${return2025.taxYear}.`,
      16,
      7
    ),

    // 5. Carryovers & Shields
    mkItem(
      'capital_loss_carryover',
      'Capital Loss Carryover to Next Year',
      'Carryovers',
      'Schedule D Line 14',
      f24.capitalLossCarryoverToNextYear,
      f25.capitalLossCarryoverToNextYear,
      `$${lossCarryover.toLocaleString()} capital loss shield available to offset option/equity gains.`,
      22,
      13
    ),
    mkItem(
      'suspended_passive_loss',
      'Suspended Rental Loss (Form 8582)',
      'Carryovers',
      'Form 8582 Line 1c',
      f24.form8582.unallowedSuspendedLossCarryforward,
      f25.form8582.unallowedSuspendedLossCarryforward,
      `$${suspendedPassiveLoss.toLocaleString()} unallowed passive rental loss from ${rentalAddress} carried forward.`,
      29,
      26
    ),
    mkItem(
      'qbi_loss_carryforward',
      'Suspended QBI Loss (Form 8995)',
      'Carryovers',
      'Form 8995 Line 16',
      f24.form8995.qbiLossCarryforward,
      f25.form8995.qbiLossCarryforward,
      `$${qbiLoss.toLocaleString()} qualified business net loss carryforward.`,
      26,
      17
    ),
  ];

  const safeHarborNeeded = Math.round(f25.totalFederalTax * 1.10);
  const safeHarborRemaining = Math.max(0, safeHarborNeeded - f25.overpaymentAppliedToNextYear);
  const irmaaBuffer = 206000 - f25.agi;
  const eff24 = return2024.blendedEffectiveTaxRatePct ?? return2024.effectiveCombinedTaxRate ?? (f24.agi > 0 ? (return2024.totalCombinedTax / f24.agi) * 100 : 0);
  const eff25 = return2025.blendedEffectiveTaxRatePct ?? return2025.effectiveCombinedTaxRate ?? (f25.agi > 0 ? (return2025.totalCombinedTax / f25.agi) * 100 : 0);

  return {
    years: [prevYear, latestYear],
    latestYear,
    previousYear: prevYear,
    lineItems,
    kpis: {
      latestYear,
      previousYear: prevYear,
      agi: {
        latest: f25.agi,
        previous: f24.agi,
        year2024: f24.agi,
        year2025: f25.agi,
        diff: f25.agi - f24.agi,
        diffPct: f24.agi !== 0 ? ((f25.agi - f24.agi) / Math.abs(f24.agi)) * 100 : 0,
      },
      taxableIncome: {
        latest: f25.taxableIncome,
        previous: f24.taxableIncome,
        year2024: f24.taxableIncome,
        year2025: f25.taxableIncome,
        diff: f25.taxableIncome - f24.taxableIncome,
        diffPct: f24.taxableIncome !== 0 ? ((f25.taxableIncome - f24.taxableIncome) / Math.abs(f24.taxableIncome)) * 100 : 0,
      },
      totalTax: {
        latest: return2025.totalCombinedTax,
        previous: return2024.totalCombinedTax,
        year2024: return2024.totalCombinedTax,
        year2025: return2025.totalCombinedTax,
        diff: return2025.totalCombinedTax - return2024.totalCombinedTax,
        diffPct: return2024.totalCombinedTax !== 0 ? ((return2025.totalCombinedTax - return2024.totalCombinedTax) / Math.abs(return2024.totalCombinedTax)) * 100 : 0,
      },
      effectiveRatePct: {
        latest: eff25,
        previous: eff24,
        year2024: eff24,
        year2025: eff25,
        diff: eff25 - eff24,
      },
      totalLossShields2026: lossCarryover + suspendedPassiveLoss,
      totalLossShieldsNextYear: lossCarryover + suspendedPassiveLoss,
      nextLossShieldYear: latestYear + 1,
      capitalLossShield: lossCarryover,
      passiveLossShield: suspendedPassiveLoss,
    },
    anomalies: [
      {
        id: 'anomaly-loss-carryover',
        severity: 'opportunity',
        title: `Active Capital Loss Shield: $${lossCarryover.toLocaleString()}`,
        description: `You carry a $${lossCarryover.toLocaleString()} capital loss carryover into the subsequent tax year. This can shelter option premium gains and equity profits dollar-for-dollar without paying federal or state capital gains tax.`,
        actionAdvice: `In your active trading accounts, prioritize harvesting realized short-term gains up to $${lossCarryover.toLocaleString()} tax-free.`,
      },
      {
        id: 'anomaly-passive-loss',
        severity: 'opportunity',
        title: `Suspended Passive Rental Loss: $${suspendedPassiveLoss.toLocaleString()} from ${rentalAddress}`,
        description: `Under IRC Section 469 (Form 8582), $${suspendedPassiveLoss.toLocaleString()} of rental losses were suspended due to the $150,000 modified AGI phase-out rule.`,
        actionAdvice: `Passive income distributions from ${partnershipName} or other passive entities can absorb these suspended losses dollar-for-dollar.`,
      },
      {
        id: 'anomaly-safe-harbor',
        severity: 'info',
        title: `Estimated Tax Safe Harbor: $${safeHarborRemaining.toLocaleString()} Remaining`,
        description: `Your federal safe harbor requirement is $${safeHarborNeeded.toLocaleString()} (110% of prior year total tax $${f25.totalFederalTax.toLocaleString()}). You applied $${f25.overpaymentAppliedToNextYear.toLocaleString()} from prior refund, leaving only $${safeHarborRemaining.toLocaleString()} needed.`,
        actionAdvice: 'You are protected against IRS underpayment penalties as long as safe harbor prepayment minimums are satisfied.',
      },
      {
        id: 'anomaly-irmaa-cliff',
        severity: 'warning',
        title: `IRMAA Tier 1 Cliff Buffer: $${irmaaBuffer.toLocaleString()} Below Threshold`,
        description: `Your ${return2025.taxYear} AGI ($${f25.agi.toLocaleString()}) sits $${irmaaBuffer.toLocaleString()} below the $206,000 Married Filing Jointly IRMAA Tier 1 cliff. An income spike above $206k would add ~$2,000/year to future Medicare Part B and Part D premiums.`,
        actionAdvice: 'Keep MAGI below $206,000 by managing taxable CD interest and utilizing capital loss offsets.',
      },
    ],
  };
}
