/**
 * BunBau Shared RAG Semantic Knowledge Chunker (v2.8.1 / Milestone v6.42)
 * Slices multi-year tax returns (1040, 540, Schedules A/B/D/E/8582/8995/8960),
 * forward-looking lifecycle strategies, and active live portfolio holdings
 * into semantically indexed knowledge units with rich metadata tags.
 */

import { CompleteTaxYearReturn, SemanticKnowledgeChunk } from '../tax/models';
import { DEMO_TAX_RETURNS } from '../tax/seedData';
import { computeLifecyclePlanningPackage } from '../tax/lifecyclePlanningEngine';

export interface PortfolioHoldingInput {
  symbol: string;
  name?: string;
  quantity?: number;
  value: number;
  assetClass?: string;
  institution?: string;
}

export function chunkTaxReturnsAndPortfolio(
  taxReturns: CompleteTaxYearReturn[] = DEMO_TAX_RETURNS,
  liveHoldings: PortfolioHoldingInput[] = []
): SemanticKnowledgeChunk[] {
  const chunks: SemanticKnowledgeChunk[] = [];

  // Helper to sanitize any accidental raw SSNs
  const sanitize = (text: string) => text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****');

  for (const ret of taxReturns) {
    const yr = ret.taxYear;
    const f = ret.federal;
    const ca = ret.california;
    const p = ret.profile;

    const primaryName = p.primaryTaxpayer.name;
    const spouseName = p.spouseTaxpayer?.name ? ` and ${p.spouseTaxpayer.name}` : '';
    const employerName = p.spouseTaxpayer?.employerName || p.primaryTaxpayer.employerName || 'Group Employer';
    const location = `${p.address.city}, ${p.address.state}`;

    // 1. Form 1040 Executive Summary
    chunks.push({
      chunkId: `tax_${yr}_1040_summary`,
      category: '1040_summary',
      taxYear: yr,
      title: `${yr} Form 1040 Income & Tax Summary`,
      text: sanitize(
        `In tax year ${yr}, taxpayers ${primaryName}${spouseName} filed ${p.filingStatus} residing in ${location}. ` +
        `Total W-2 wages: $${f.w2Wages.toLocaleString()} (${employerName}). Taxable interest: $${f.taxableInterest.toLocaleString()}. ` +
        `Ordinary dividends: $${f.ordinaryDividends.toLocaleString()} (Qualified: $${f.qualifiedDividends.toLocaleString()}). ` +
        `Capital gain/loss: $${f.capitalGainLossLine7.toLocaleString()} (Line 7). Schedule 1 additional income: $${f.schedule1AdditionalIncome.toLocaleString()}. ` +
        `Adjusted Gross Income (AGI): $${f.agi.toLocaleString()}. Deductions claimed: $${f.totalDeductionsClaimed.toLocaleString()} (${f.deductionTypeUsed}). ` +
        `Taxable income: $${f.taxableIncome.toLocaleString()}. Total federal tax: $${f.totalFederalTax.toLocaleString()} (Regular tax: $${f.regularFederalTax.toLocaleString()}). ` +
        `Total federal payments: $${f.totalFederalPayments.toLocaleString()} (Withholding: $${f.federalWithholding.toLocaleString()}, Estimated: $${f.estimatedTaxPaymentsApplied.toLocaleString()}). ` +
        `Overpayment: $${f.federalOverpayment.toLocaleString()} ($${f.overpaymentAppliedToNextYear.toLocaleString()} applied to next year's estimated tax). ` +
        `Estimated tax penalty: $${f.estimatedTaxPenalty.toLocaleString()}.`
      ),
      metadata: {
        form: '1040',
        lineItems: ['1z', '2b', '3a', '3b', '7', '8', '11', '12', '15', '16', '24', '34', '38'],
        dollarAmounts: [f.w2Wages, f.taxableInterest, f.ordinaryDividends, f.agi, f.totalFederalTax, f.federalOverpayment],
        topics: ['agi', 'w2_wages', 'income', 'federal_tax', 'withholding', 'overpayment', 'penalty'],
      },
    });

    // 2. Schedule B Yield Sources
    if (f.scheduleBInterest.length > 0 || f.scheduleBDividends.length > 0) {
      const interestSources = f.scheduleBInterest.map((i) => `${i.payer}: $${i.amount.toLocaleString()}`).join('; ');
      const dividendSources = f.scheduleBDividends.map((d) => `${d.payer}: $${d.amount.toLocaleString()}`).join('; ');
      chunks.push({
        chunkId: `tax_${yr}_schedule_b`,
        category: 'schedule_b_yield',
        taxYear: yr,
        title: `${yr} Schedule B Interest & Ordinary Dividends Breakdown`,
        text: sanitize(
          `In ${yr}, taxable interest of $${f.taxableInterest.toLocaleString()} was reported from: [${interestSources}]. ` +
          `Ordinary dividends of $${f.ordinaryDividends.toLocaleString()} (qualified: $${f.qualifiedDividends.toLocaleString()}) were reported from: [${dividendSources}].`
        ),
        metadata: {
          schedule: 'Schedule B',
          dollarAmounts: [f.taxableInterest, f.ordinaryDividends, f.qualifiedDividends],
          topics: ['interest', 'dividends', 'schedule_b', 'cash_yield', 'fixed_income'],
        },
      });
    }

    // 3. Schedule D Capital Gains & Carryovers
    chunks.push({
      chunkId: `tax_${yr}_schedule_d`,
      category: 'schedule_d_gains',
      taxYear: yr,
      title: `${yr} Schedule D Capital Gains, Losses & Carryovers`,
      text: sanitize(
        `In ${yr}, net short-term capital gain/loss was $${f.netShortTermGainLoss.toLocaleString()} and net long-term capital gain/loss was $${f.netLongTermGainLoss.toLocaleString()}. ` +
        `Net capital gain/loss allowed on Form 1040 Line 7 was $${f.capitalGainLossLine7.toLocaleString()}. ` +
        `Capital loss carryover into the subsequent tax year is $${f.capitalLossCarryoverToNextYear.toLocaleString()}. ` +
        (f.capitalLossCarryoverToNextYear > 0
          ? `CRITICAL TAX SHIELD: The $${f.capitalLossCarryoverToNextYear.toLocaleString()} short-term loss carryforward can shelter dollar-for-dollar trading profits from option trading and stock sales.`
          : 'Zero capital loss carryforward into next year.')
      ),
      metadata: {
        schedule: 'Schedule D',
        dollarAmounts: [f.netShortTermGainLoss, f.netLongTermGainLoss, f.capitalLossCarryoverToNextYear],
        topics: ['capital_gains', 'capital_losses', 'schedule_d', 'loss_carryover', 'tax_shield'],
      },
    });

    // 4. Schedule E Rental Real Estate & Form 8582
    const rental = f.rentalProperties?.[0];
    if (rental) {
      chunks.push({
        chunkId: `tax_${yr}_schedule_e_rental`,
        category: 'schedule_e_rental',
        taxYear: yr,
        title: `${yr} Schedule E Rental Real Estate (${rental.address}) & Passive Losses`,
        text: sanitize(
          `In ${yr}, residential rental property located at ${rental.address} generated $${rental.rentsReceived.toLocaleString()} in gross rent. ` +
          `Total operating expenses and depreciation totaled $${rental.expenses.totalExpenses.toLocaleString()} (Mortgage interest: $${rental.expenses.mortgageInterest.toLocaleString()}, ` +
          `Property taxes: $${rental.expenses.taxes.toLocaleString()}, Depreciation: $${rental.expenses.depreciation.toLocaleString()}, Repairs: $${rental.expenses.repairs.toLocaleString()}). ` +
          `Gross rental operating loss was $${rental.netIncomeLoss.toLocaleString()}. ` +
          (f.form8582.unallowedSuspendedLossCarryforward > 0
            ? `Under Form 8582 Passive Activity Loss Limitations, modified AGI exceeded the phase-out limit ($${f.agi.toLocaleString()}). ` +
              `CRITICAL PASSIVE LOSS SHIELD: $${f.form8582.unallowedSuspendedLossCarryforward.toLocaleString()} of rental loss is suspended and carried forward into subsequent years under Form 8582. ` +
              `Future passive business distributions can absorb this loss tax-free.`
            : `Rental loss was absorbed by passive business and partnership income.`)
        ),
        metadata: {
          schedule: 'Schedule E',
          form: 'Form 8582',
          dollarAmounts: [rental.rentsReceived, rental.expenses.totalExpenses, rental.expenses.depreciation, rental.netIncomeLoss, f.form8582.unallowedSuspendedLossCarryforward],
          topics: ['rental_real_estate', 'depreciation', 'passive_loss', 'form_8582'],
        },
      });
    }

    // 5. Schedule A Itemized Deductions & SALT Cap
    if (f.itemizedDeductions) {
      const it = f.itemizedDeductions;
      chunks.push({
        chunkId: `tax_${yr}_schedule_a`,
        category: 'deductions_salt',
        taxYear: yr,
        title: `${yr} Schedule A Itemized Deductions & SALT Cap`,
        text: sanitize(
          `In ${yr}, the taxpayers itemized deductions totaling $${it.totalItemizedDeductions.toLocaleString()}. ` +
          `State and Local Taxes (SALT) paid totaled $${it.totalSaltPaid.toLocaleString()} (CA income tax $${it.stateAndLocalIncomeOrSalesTax.toLocaleString()}, Real estate taxes $${it.realEstateTaxes.toLocaleString()}). ` +
          `Allowable deductible SALT was $${it.deductibleSalt.toLocaleString()}. ` +
          `Charitable donations totaled $${it.totalCharitableGifts.toLocaleString()} ($${it.charitableGiftsCash.toLocaleString()} cash, $${it.charitableGiftsNoncash.toLocaleString()} noncash Form 8283). ` +
          `Gambling losses of $${it.gamblingLosses.toLocaleString()} offset winnings.`
        ),
        metadata: {
          schedule: 'Schedule A',
          dollarAmounts: [it.totalItemizedDeductions, it.totalSaltPaid, it.deductibleSalt, it.totalCharitableGifts],
          topics: ['itemized_deductions', 'salt_cap', 'property_taxes', 'charity', 'schedule_a'],
        },
      });
    }

    // 6. California Form 540
    chunks.push({
      chunkId: `tax_${yr}_california_540`,
      category: 'state_ca',
      taxYear: yr,
      title: `${yr} California Resident Form 540 Tax Summary`,
      text: sanitize(
        `In ${yr}, California adjusted gross income was $${ca.caAgi.toLocaleString()} (State wages: $${ca.stateWages.toLocaleString()}). ` +
        `California itemized deductions totaled $${ca.caItemizedDeductions.toLocaleString()}, resulting in California taxable income of $${ca.caTaxableIncome.toLocaleString()}. ` +
        `California total tax after exemption credits was $${ca.caTaxAfterCredits.toLocaleString()}. ` +
        `Total California payments were $${ca.totalCaPayments.toLocaleString()} (Withholding: $${ca.caWithholding.toLocaleString()}, Estimated: $${ca.caEstimatedPayments.toLocaleString()}). ` +
        `California overpayment was $${ca.caOverpayment.toLocaleString()}, with $${ca.caOverpaymentAppliedToNextYear.toLocaleString()} applied to next year's estimated tax.`
      ),
      metadata: {
        form: 'Form 540',
        dollarAmounts: [ca.caAgi, ca.caTaxAfterCredits, ca.totalCaPayments, ca.caOverpayment],
        topics: ['california_tax', 'ca_540', 'franchise_tax_board', 'state_tax', 'ca_overpayment'],
      },
    });
  }

  // 7. Forward-Looking Strategic Life Planning Chunks
  const latestReturn = taxReturns.find((r) => r.taxYear === 2025) || taxReturns[taxReturns.length - 1];
  if (latestReturn) {
    const life = computeLifecyclePlanningPackage(latestReturn);
    const ssEarner = life.socialSecurity.ivan; // earner
    const ssSpouse = life.socialSecurity.harmony; // non-earner

    chunks.push({
      chunkId: 'lifecycle_social_security_strategy',
      category: 'forward_lifecycle',
      title: 'Forward-Looking Social Security Claiming Strategy & Age 62 Clawback Trap',
      text: sanitize(
        `Taxpayer ${ssEarner.taxpayer} reaches age 62 eligibility. While eligible for early Social Security benefits at ~70% of PIA ($${ssEarner.monthlyAt62.toLocaleString()}/mo), ` +
        `${ssEarner.taxpayer} earns $${ssEarner.annualW2Earnings.toLocaleString()} in active W-2 wages. Under the 2026 IRS earnings test (limit $${ssEarner.earningsTestLimit2026.toLocaleString()}), ` +
        `$1 is clawed back for every $2 earned above the limit. This creates a $${Math.round(ssEarner.earningsClawbackAmount).toLocaleString()} annual clawback, causing 100% of benefits ($${(ssEarner.monthlyAt62 * 12).toLocaleString()}/yr) ` +
        `to be withheld. Recommendation: Defer filing until Full Retirement Age (67) or Age 70 to receive a guaranteed 8% annual inflation-adjusted ` +
        `delayed retirement credit, increasing monthly payout by +77% to $${ssEarner.monthlyAt70.toLocaleString()}/month and maximizing survivor benefits for ${ssSpouse.taxpayer}.`
      ),
      metadata: {
        topics: ['social_security', 'age_62', 'earnings_test', 'clawback', 'fra_67', 'age_70', 'delayed_credits'],
        dollarAmounts: [ssEarner.annualW2Earnings, ssEarner.earningsTestLimit2026, Math.round(ssEarner.earningsClawbackAmount), ssEarner.monthlyAt70],
      },
    });

    chunks.push({
      chunkId: 'lifecycle_medicare_employer_coordination',
      category: 'forward_lifecycle',
      title: 'Forward-Looking Medicare & Employer Health Coordination (The Age-Gap Dynamic)',
      text: sanitize(
        `Older spouse ${life.medicare.olderSpouse.name} approaches Medicare age 65 (Initial Enrollment Period: ${life.medicare.olderSpouse.iepWindowStart} to ${life.medicare.olderSpouse.iepWindowEnd}). ` +
        `Spouse ${life.medicare.youngerSpouse.name} is ${life.medicare.youngerSpouse.ageWhenOlderSpouse65} years old and maintains active employer-sponsored group health insurance at ${life.medicare.youngerSpouse.employerName} ($${life.medicare.youngerSpouse.employerGroupPlanVal.toLocaleString()} annual value). ` +
        `Because the employer employs 20+ workers and maintains primary active group health coverage, ${life.medicare.olderSpouse.name} can legally enroll in premium-free Part A and ` +
        `delay Part B and Part D without incurring late enrollment penalties. Once the working spouse retires, an 8-month Special Enrollment Period (SEP) opens. ` +
        `${life.medicare.pre65BridgeAdvice}`
      ),
      metadata: {
        topics: ['medicare', 'age_65', 'part_b', 'part_d', 'employer_group_health', 'special_enrollment_period', 'creditable_coverage'],
        dollarAmounts: [life.medicare.youngerSpouse.employerGroupPlanVal],
      },
    });

    chunks.push({
      chunkId: 'lifecycle_irmaa_cliff_monitor',
      category: 'forward_lifecycle',
      title: `Forward-Looking IRMAA Cliff 2-Year Lookback Monitoring ($${life.irmaa.tier1Threshold.toLocaleString()} Threshold)`,
      text: sanitize(
        `Medicare Part B and Part D premiums are subject to Income-Related Monthly Adjustment Amount (IRMAA) surcharges using tax returns from 2 years prior. ` +
        `The ${life.irmaa.filingStatus} Tier 1 threshold is $${life.irmaa.tier1Threshold.toLocaleString()}. Actual AGI is $${life.irmaa.actualMagi.toLocaleString()} — placing the household $${life.irmaa.bufferRemaining.toLocaleString()} below the cliff! ` +
        `Realizing discretionary short-term gains or high interest could trigger Tier 1 IRMAA, costing approximately $${life.irmaa.estimatedAnnualHouseholdSurchargeIfTriggered.toLocaleString()}/year in extra Medicare premiums. ` +
        `${life.irmaa.mitigationStrategy}`
      ),
      metadata: {
        topics: ['irmaa', 'medicare_surcharges', 'lookback_2_year', 'capital_loss_offset'],
        dollarAmounts: [life.irmaa.tier1Threshold, life.irmaa.actualMagi, life.irmaa.bufferRemaining, life.irmaa.estimatedAnnualHouseholdSurchargeIfTriggered],
      },
    });

    chunks.push({
      chunkId: 'lifecycle_rmd_roth_valley',
      category: 'forward_lifecycle',
      title: 'SECURE 2.0 Mandatory RMD Age 75 & 10-Year Roth Conversion Tax Valley',
      text: sanitize(
        `Under the SECURE Act 2.0, taxpayers born in 1960 or later have an RMD age of 75 (${life.rmdRoth.olderSpouseRmdAge75Year} for older spouse, ${life.rmdRoth.youngerSpouseRmdAge75Year} for younger spouse). ` +
        `The window between retirement and age 75 creates a historic "Tax Valley" where taxable income drops after W-2 wages cease. ` +
        `Strategy: Execute annual partial Roth conversions of ~$${life.rmdRoth.recommendedAnnualRothConversion.toLocaleString()}/year from pre-tax IRAs/401ks ` +
        `to fill the 12% and 22% federal tax brackets while keeping MAGI below the IRMAA cliff. ` +
        `This permanently shields future retirement distributions from high California state taxes and prevents mandatory RMD tax spikes at age 75.`
      ),
      metadata: {
        topics: ['rmd', 'secure_act_2_0', 'age_75', 'roth_conversion', 'tax_valley', 'retirement_withdrawals'],
        dollarAmounts: [75, life.rmdRoth.recommendedAnnualRothConversion, life.rmdRoth.targetBracketCeilingMfj],
      },
    });
  }

  // 8. Live Active Portfolio Holdings Chunks
  if (liveHoldings.length > 0) {
    const totalVal = liveHoldings.reduce((sum, h) => sum + (h.value || 0), 0);
    const topAssets = liveHoldings.slice(0, 10).map((h) => `${h.symbol}: $${(h.value || 0).toLocaleString()}`).join(', ');
    const activeCarryover = latestReturn?.federal.capitalLossCarryoverToNextYear || 0;
    chunks.push({
      chunkId: 'live_portfolio_active_holdings',
      category: 'live_portfolio',
      title: 'Current Live Portfolio Holdings & Tax Drag Sensitivity',
      text: sanitize(
        `Current connected portfolio holdings total $${totalVal.toLocaleString()} across taxable and tax-deferred accounts. ` +
        `Top holdings include: ${topAssets}. ` +
        `Tax sensitivity notes: Income from Cash Secured Puts and Covered Calls is characterized as short-term capital gains, ` +
        `taxable at ordinary federal rates plus California top brackets, yielding a combined ~44.3% marginal rate. ` +
        (activeCarryover > 0
          ? `These gains can be shielded by the active $${activeCarryover.toLocaleString()} capital loss carryover.`
          : 'Manage taxable trading gains to avoid bracket creep.')
      ),
      metadata: {
        topics: ['live_portfolio', 'tax_drag', 'covered_calls', 'cash_secured_puts', 'marginal_tax_rate'],
        dollarAmounts: [totalVal],
      },
    });
  }

  return chunks;
}
