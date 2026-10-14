/**
 * BunBau N-Year Longitudinal Tax Comparison & Scalability Engine (v2.9 / Milestone v6.5)
 * Analyzes up to 10 years of tax return history (2016 - 2026+).
 * Computes multi-year macro trends, cumulative loss shield ledgers, and multi-column line-item matrices in <30ms.
 */

import { CompleteTaxYearReturn } from './models';

export interface MultiYearMacroTrendItem {
  year: number;
  w2Wages: number;
  taxableInterest: number;
  dividends: number;
  capitalGains: number;
  scheduleERental: number;
  agi: number;
  taxableIncome: number;
  federalTax: number;
  californiaTax: number;
  totalCombinedTax: number;
  effectiveCombinedRatePct: number;
  yearOverYearAgiGrowthPct: number;
}

export interface CumulativeLossShieldItem {
  year: number;
  capitalLossCarryover: number;
  suspendedPassiveRentalLoss: number;
  totalAvailableShield: number;
}

export interface LongitudinalLineItem {
  key: string;
  label: string;
  category: 'Income' | 'Deductions' | 'Taxes' | 'Payments' | 'Carryovers' | 'California';
  formRef: string;
  valuesByYear: Record<number, number>;
  latestAmount: number;
  earliestAmount: number;
  overallTrend: 'up' | 'down' | 'neutral';
  cagrPct: number;
  impactInsight?: string;
  sourceDocPage2024?: number;
  sourceDocPage2025?: number;
  formLine?: string;
  targetSchedule?: '1040_p1' | '1040_p2' | 'schedule_b' | 'schedule_d' | 'schedule_e' | 'form_8582' | 'ca_540';
}

export interface LongitudinalAnalysisResult {
  years: number[];
  latestYear: number;
  earliestYear: number;
  macroTrends: MultiYearMacroTrendItem[];
  lossShieldLedger: CumulativeLossShieldItem[];
  lineItemMatrix: LongitudinalLineItem[];
  kpis: {
    averageAnnualAgi: number;
    peakAgiYear: number;
    peakAgiAmount: number;
    lowestAgiYear: number;
    lowestAgiAmount: number;
    cumulativeTotalTaxesPaid: number;
    averageEffectiveRatePct: number;
    activeLossShieldsUpcomingYear: number;
  };
}

export function computeLongitudinalTaxAnalysis(
  returns: CompleteTaxYearReturn[]
): LongitudinalAnalysisResult {
  if (!returns || returns.length === 0) {
    throw new Error('At least one tax return is required for longitudinal analysis.');
  }

  // Sort returns chronologically
  const sorted = [...returns].sort((a, b) => a.taxYear - b.taxYear);
  const years = sorted.map((r) => r.taxYear);
  const latestReturn = sorted[sorted.length - 1];
  const earliestReturn = sorted[0];

  // 1. Build Macro Trends
  let previousAgi: number | null = null;
  const macroTrends: MultiYearMacroTrendItem[] = sorted.map((ret) => {
    const f = ret.federal;
    const ca = ret.california;
    const agi = f.agi;
    const fedTax = f.totalFederalTax;
    const caTax = ca.caTaxAfterCredits;
    const combinedTax = ret.totalCombinedTax || fedTax + caTax;
    const effectiveRate =
      ret.blendedEffectiveTaxRatePct ??
      ret.effectiveCombinedTaxRate ??
      (agi > 0 ? Number(((combinedTax / agi) * 100).toFixed(2)) : 0);

    const yoyGrowth =
      previousAgi !== null && previousAgi > 0
        ? Number((((agi - previousAgi) / previousAgi) * 100).toFixed(2))
        : 0;
    previousAgi = agi;

    return {
      year: ret.taxYear,
      w2Wages: f.w2Wages,
      taxableInterest: f.taxableInterest,
      dividends: f.ordinaryDividends,
      capitalGains: f.capitalGainLossLine7,
      scheduleERental: f.scheduleETotalIncomeLoss,
      agi,
      taxableIncome: f.taxableIncome,
      federalTax: fedTax,
      californiaTax: caTax,
      totalCombinedTax: combinedTax,
      effectiveCombinedRatePct: effectiveRate,
      yearOverYearAgiGrowthPct: yoyGrowth,
    };
  });

  // 2. Build Cumulative Loss Shield Ledger
  const lossShieldLedger: CumulativeLossShieldItem[] = sorted.map((ret) => {
    const capLoss = ret.federal.capitalLossCarryoverToNextYear || 0;
    const passiveLoss =
      (ret.federal.form8582 as any)?.unallowedSuspendedLossCarryforward ||
      (ret.federal.form8582 as any)?.unallowedSuspendedLoss ||
      0;
    return {
      year: ret.taxYear,
      capitalLossCarryover: capLoss,
      suspendedPassiveRentalLoss: passiveLoss,
      totalAvailableShield: capLoss + passiveLoss,
    };
  });

  const return2024 = sorted.find((r) => r.taxYear === 2024);
  const return2025 = sorted.find((r) => r.taxYear === 2025);

  const getPageForSchedule = (
    ret: CompleteTaxYearReturn | undefined,
    schedule: LongitudinalLineItem['targetSchedule']
  ): number => {
    const bm = ret?.pdfDocumentMetadata?.pageBookmarks || {};
    switch (schedule) {
      case '1040_p1':
        return bm.form_1040_p1 || 1;
      case '1040_p2':
        return bm.form_1040_p2 || 2;
      case 'schedule_b':
        return bm.schedule_b || 6;
      case 'schedule_d':
        return bm.schedule_d || 8;
      case 'schedule_e':
        return bm.schedule_e_p1 || 12;
      case 'form_8582':
        return bm.form_8582 || 20;
      case 'ca_540':
        return bm.ca_form_540 || 32;
      default:
        return 1;
    }
  };

  // 3. Helper to build matrix row
  const buildMatrixRow = (
    key: string,
    label: string,
    category: LongitudinalLineItem['category'],
    formRef: string,
    extractor: (r: CompleteTaxYearReturn) => number,
    insight?: string,
    overrideP24?: number,
    overrideP25?: number,
    formLine?: string,
    targetSchedule?: LongitudinalLineItem['targetSchedule']
  ): LongitudinalLineItem => {
    const valuesByYear: Record<number, number> = {};
    for (const r of sorted) {
      valuesByYear[r.taxYear] = extractor(r);
    }
    const earliest = valuesByYear[earliestReturn.taxYear] || 0;
    const latest = valuesByYear[latestReturn.taxYear] || 0;
    const span = Math.max(1, latestReturn.taxYear - earliestReturn.taxYear);
    const overallTrend = latest > earliest ? 'up' : latest < earliest ? 'down' : 'neutral';
    const cagrPct =
      earliest > 0 && latest > 0
        ? Number(((Math.pow(latest / earliest, 1 / span) - 1) * 100).toFixed(1))
        : 0;

    const p24 = overrideP24 ?? getPageForSchedule(return2024, targetSchedule);
    const p25 = overrideP25 ?? getPageForSchedule(return2025, targetSchedule);

    return {
      key,
      label,
      category,
      formRef,
      valuesByYear,
      latestAmount: latest,
      earliestAmount: earliest,
      overallTrend,
      cagrPct,
      impactInsight: insight,
      sourceDocPage2024: p24,
      sourceDocPage2025: p25,
      formLine,
      targetSchedule,
    };
  };

  // 4. Multi-Year Line Item Comparison Matrix
  const lineItemMatrix: LongitudinalLineItem[] = [
    // Income
    buildMatrixRow('w2_wages', 'W-2 Wages & Salaries', 'Income', 'Form 1040, Line 1z', (r) => r.federal.w2Wages, 'Primary active employment compensation from Form W-2.', undefined, undefined, 'Line 1z', '1040_p1'),
    buildMatrixRow('taxable_interest', 'Taxable Interest', 'Income', 'Schedule B, Line 4', (r) => r.federal.taxableInterest, 'Taxable interest income from cash deposits, high-yield accounts, and money market funds.', undefined, undefined, 'Line 2b / Sch B', 'schedule_b'),
    buildMatrixRow('ordinary_dividends', 'Ordinary Dividends', 'Income', 'Schedule B, Line 6', (r) => r.federal.ordinaryDividends, 'Ordinary corporate and ETF investment distributions reported on Form 1099-DIV.', undefined, undefined, 'Line 3b', 'schedule_b'),
    buildMatrixRow('qualified_dividends', 'Qualified Dividends', 'Income', 'Form 1040, Line 3a', (r) => r.federal.qualifiedDividends, 'Taxed at preferential long-term capital gains rates (0%, 15%, or 20%).', undefined, undefined, 'Line 3a', '1040_p1'),
    buildMatrixRow('capital_gains', 'Net Capital Gain or (Loss)', 'Income', 'Schedule D, Line 16', (r) => r.federal.capitalGainLossLine7, 'Net short-term and long-term capital transactions from Schedule D.', undefined, undefined, 'Line 7 / Sch D', 'schedule_d'),
    buildMatrixRow('rental_income', 'Schedule E Rental Real Estate', 'Income', 'Schedule E, Line 26', (r) => r.federal.scheduleETotalIncomeLoss, 'Passive rental real estate operating income and depreciation from Schedule E.', undefined, undefined, 'Schedule E Line 26', 'schedule_e'),
    buildMatrixRow('agi', 'Adjusted Gross Income (AGI)', 'Income', 'Form 1040, Line 11', (r) => r.federal.agi, 'Adjusted Gross Income (AGI) drives Medicare IRMAA cliffs, NIIT thresholds, and phase-outs.', undefined, undefined, 'Line 11', '1040_p1'),

    // Deductions
    buildMatrixRow('deductions_claimed', 'Deductions Claimed', 'Deductions', 'Form 1040, Line 12', (r) => r.federal.totalDeductionsClaimed, 'Standard or itemized deductions under Schedule A, including SALT cap expansion.', undefined, undefined, 'Line 12', '1040_p2'),
    buildMatrixRow('taxable_income', 'Taxable Income', 'Deductions', 'Form 1040, Line 15', (r) => r.federal.taxableIncome, 'AGI minus total deductions claimed; determines regular tax bracket.', undefined, undefined, 'Line 15', '1040_p2'),

    // Taxes
    buildMatrixRow('federal_tax', 'Total Federal Tax', 'Taxes', 'Form 1040, Line 24', (r) => r.federal.totalFederalTax, 'Total federal tax liability after credits, NIIT, and additional Medicare taxes.', undefined, undefined, 'Line 24', '1040_p2'),
    buildMatrixRow('california_tax', 'California State Tax', 'California', 'CA Form 540, Line 48', (r) => r.california.caTaxAfterCredits, 'California State Form 540 net liability after state personal and senior exemption credits.', undefined, undefined, 'Line 48', 'ca_540'),
    buildMatrixRow('total_combined_tax', 'Total Combined Tax Liability', 'Taxes', 'Fed + CA Tax', (r) => r.totalCombinedTax, 'Cumulative Federal and California income taxes paid across all filings.', undefined, undefined, 'Combined Total', '1040_p2'),

    // Payments & Safe Harbor
    buildMatrixRow('federal_withholding', 'Federal W-2 Withholding', 'Payments', 'Form 1040, Line 25d', (r) => r.federal.federalWithholding, 'W-2 income tax withheld; deemed paid equally across all 4 quarters under IRC §6513(b).', undefined, undefined, 'Line 25d', '1040_p2'),
    buildMatrixRow('estimated_payments', 'Estimated Tax Payments', 'Payments', 'Form 1040, Line 26', (r) => r.federal.estimatedTaxPaymentsApplied, 'Quarterly Form 1040-ES estimated payments and prior-year refund carryforwards applied.', undefined, undefined, 'Line 26', '1040_p2'),
    buildMatrixRow('overpayment_applied', 'Overpayment Applied to Next Year', 'Payments', 'Form 1040, Line 36', (r) => r.federal.overpaymentAppliedToNextYear, 'Tax refund elected to be credited to subsequent year estimated taxes.', undefined, undefined, 'Line 36', '1040_p2'),

    // Carryovers & Shields
    buildMatrixRow('capital_loss_carryover', 'Capital Loss Carryover to Next Year', 'Carryovers', 'Schedule D Line 21', (r) => r.federal.capitalLossCarryoverToNextYear || 0, 'Unused capital loss carryover to shelter future short/long-term capital gains 100% tax-free.', undefined, undefined, 'Schedule D Line 21', 'schedule_d'),
    buildMatrixRow('passive_loss_carryover', 'Suspended Passive Loss Carryover', 'Carryovers', 'Form 8582 Line 16', (r) => (r.federal.form8582 as any)?.unallowedSuspendedLossCarryforward || (r.federal.form8582 as any)?.unallowedSuspendedLoss || 0, 'Accumulated suspended passive rental losses carried forward under IRC §469.', undefined, undefined, 'Form 8582 Line 16', 'form_8582'),
  ];

  // 5. Aggregate KPIs
  const totalAgi = macroTrends.reduce((sum, item) => sum + item.agi, 0);
  const averageAgi = Math.round(totalAgi / macroTrends.length);
  const totalTaxesPaid = macroTrends.reduce((sum, item) => sum + item.totalCombinedTax, 0);
  const avgEffectiveRate = Number(
    (macroTrends.reduce((sum, item) => sum + item.effectiveCombinedRatePct, 0) / macroTrends.length).toFixed(2)
  );

  let peakAgiItem = macroTrends[0];
  let lowestAgiItem = macroTrends[0];
  for (const item of macroTrends) {
    if (item.agi > peakAgiItem.agi) peakAgiItem = item;
    if (item.agi < lowestAgiItem.agi) lowestAgiItem = item;
  }

  const latestLossShield = lossShieldLedger[lossShieldLedger.length - 1];

  return {
    years,
    latestYear: latestReturn.taxYear,
    earliestYear: earliestReturn.taxYear,
    macroTrends,
    lossShieldLedger,
    lineItemMatrix,
    kpis: {
      averageAnnualAgi: averageAgi,
      peakAgiYear: peakAgiItem.year,
      peakAgiAmount: peakAgiItem.agi,
      lowestAgiYear: lowestAgiItem.year,
      lowestAgiAmount: lowestAgiItem.agi,
      cumulativeTotalTaxesPaid: totalTaxesPaid,
      averageEffectiveRatePct: avgEffectiveRate,
      activeLossShieldsUpcomingYear: latestLossShield.totalAvailableShield,
    },
  };
}
