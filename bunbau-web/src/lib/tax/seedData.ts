/**
 * BunBau Tax Expert Seed Data (v2.8.1 / Milestone v6.42)
 * High-fidelity, completely synthetic mock demo fixtures for Alex & Jordan Taylor.
 * ZERO personal data: realistic sanitized data demonstrating all CFA/CPA intelligence.
 */

import { CompleteTaxYearReturn, TaxFilingProfile, UserTaxFact } from './models';

export const CANONICAL_52_PAGE_BOOKMARKS: Record<string, number> = {
  form_1040_p1: 1,
  form_1040_p2: 2,
  schedule_1: 3,
  schedule_2: 4,
  schedule_3: 5,
  schedule_b: 6,
  schedule_d: 8,
  schedule_a: 10,
  schedule_e_p1: 12,
  schedule_e_p2: 16,
  form_8949: 18,
  form_8582: 20,
  form_8960: 30,
  ca_form_540: 32,
  ca_schedule_ca: 42,
  ca_schedule_d: 48,
};

export const DEMO_TAX_FILING_PROFILE_2024_2025: TaxFilingProfile = {
  taxYear: 2025,
  filingStatus: 'MFJ',
  primaryTaxpayer: {
    name: 'Alex Taylor',
    ssnMasked: '***-**-2481',
    dob: '1962-08-15',
    currentAge2026: 64,
    medicareAge65Year: 2027,
    fraAge67Year: 2029,
    maxDelayedAge70Year: 2032,
    rmdAge75Year: 2037,
    isEmployed: false,
    hasEmployerGroupHealth: false,
  },
  spouseTaxpayer: {
    name: 'Jordan Taylor',
    ssnMasked: '***-**-7193',
    dob: '1964-03-20',
    currentAge2026: 62,
    medicareAge65Year: 2029,
    fraAge67Year: 2031,
    maxDelayedAge70Year: 2034,
    rmdAge75Year: 2039,
    isEmployed: true,
    employerName: 'Pacific Cloud Systems Inc.',
    hasEmployerGroupHealth: true,
  },
  address: {
    street: '100 Pine Street #1500',
    city: 'San Francisco',
    state: 'CA',
    zip: '94111',
    county: 'San Francisco',
  },
  cpaPreparer: {
    name: 'Pacific Bay Tax Advisors',
    firm: 'San Francisco Wealth & Tax Advisory',
    phone: '(415) 555-0182',
    ptinMasked: 'P09988776',
  },
};

export const DEMO_TAX_RETURN_2024: CompleteTaxYearReturn = {
  taxYear: 2024,
  profile: { ...DEMO_TAX_FILING_PROFILE_2024_2025, taxYear: 2024 },
  federal: {
    taxYear: 2024,
    w2Wages: 215000,
    taxableInterest: 18500,
    scheduleBInterest: [
      { payer: 'CITIBANK DEMO DEPOSIT', accountSuffix: '3703', amount: 8000 },
      { payer: 'CHARLES SCHWAB CASH', accountSuffix: '9281', amount: 5500 },
      { payer: 'FIDELITY CORE MONEY MKT', accountSuffix: '6238', amount: 5000 },
    ],
    ordinaryDividends: 5200,
    qualifiedDividends: 5000,
    scheduleBDividends: [
      { payer: 'FIDELITY INDEX FUND', accountSuffix: '6238', amount: 4800 },
      { payer: 'VANGUARD TOTAL STOCK', amount: 400 },
    ],
    pensionsAndAnnuities: 4500,
    capitalGainLossLine7: 3500,
    netShortTermGainLoss: 500,
    netLongTermGainLoss: 3000,
    capitalLossCarryoverToNextYear: 0,
    scheduleDTransactions: [
      { description: 'Short-Term Covered Sales', term: 'short_term', proceeds: 10500, costBasis: 10000, gainLoss: 500 },
      { description: 'Long-Term Index ETF', term: 'long_term', proceeds: 23000, costBasis: 20000, gainLoss: 3000 },
    ],
    schedule1AdditionalIncome: 50300,
    gamblingWinnings: 0,
    scheduleETotalIncomeLoss: 50300,
    rentalProperties: [
      {
        address: '3343 Los Prados, San Mateo, CA 94403',
        propertyType: 'Single Family Residence',
        fairRentalDays: 365,
        personalUseDays: 0,
        rentsReceived: 30000,
        expenses: {
          cleaningMaintenance: 2000,
          insurance: 3000,
          legalProfessional: 1000,
          mortgageInterest: 18000,
          repairs: 5000,
          taxes: 16000,
          utilities: 200,
          depreciation: 21000,
          other: [{ description: 'HOA & Gardening', amount: 6800 }],
          totalExpenses: 73000,
        },
        netIncomeLoss: -43000,
        passiveLossAllowedAfterForm8582: -43000,
        suspendedLossCarriedForward: 0,
      },
    ],
    partnerships: [
      { entityName: 'Taylor Family Equity Partners LP', einMasked: '94-0000001', type: 'P', passiveIncome: 93300, nonpassiveIncome: 0, passiveLossAllowed: 0, nonpassiveLoss: 0, netIncomeLoss: 93300 },
    ],
    form8582: {
      taxYear: 2024,
      rentalRealEstateNetLoss: -43000,
      otherPassiveIncome: 93300,
      modifiedAgi: 241700,
      specialAllowanceLimit: 150000,
      specialAllowanceAllowed: 0,
      totalLossAllowedCurrentYear: 43000,
      unallowedSuspendedLossCarryforward: 0,
    },
    totalIncome: 292000,
    adjustmentsToIncome: 0,
    agi: 292000,
    deductionTypeUsed: 'standard',
    standardDeduction: 29200,
    totalDeductionsClaimed: 40700,
    qbiDeduction: 11500,
    form8995: {
      taxYear: 2024,
      qualifiedBusinessIncome: 57500,
      twentyPercentComponent: 11500,
      taxableIncomeBeforeQbi: 262800,
      netCapitalGainAndDividends: 8500,
      incomeLimitation: 50860,
      allowedQbiDeduction: 11500,
      qbiLossCarryforward: 0,
    },
    taxableIncome: 251300,
    regularFederalTax: 45604,
    niitTax: 1596,
    form8960: {
      taxYear: 2024,
      netInvestmentIncome: 87200,
      magi: 292000,
      threshold: 250000,
      excessMagi: 42000,
      niitTaxableAmount: 42000,
      niitTaxLiability: 1596,
    },
    additionalMedicareTax: 0,
    foreignTaxCredit: 0,
    totalFederalTax: 47200,
    federalWithholding: 28500,
    estimatedTaxPaymentsApplied: 21000,
    totalFederalPayments: 49500,
    federalOverpayment: 2300,
    overpaymentAppliedToNextYear: 1800,
    estimatedTaxPenalty: 450,
  },
  california: {
    taxYear: 2024,
    stateWages: 215000,
    federalAgi: 292000,
    caSubtractions: 12000,
    caAdditions: 0,
    caAgi: 280000,
    caDeductionType: 'itemized',
    caItemizedDeductions: 28500,
    caTaxableIncome: 251500,
    caTaxAfterCredits: 15800,
    caWithholding: 12000,
    caEstimatedPayments: 5000,
    totalCaPayments: 17000,
    caOverpayment: 1200,
    caOverpaymentAppliedToNextYear: 1200,
    caPenalty: 0,
  },
  totalCombinedTax: 63000,
  blendedEffectiveTaxRatePct: 21.58,
  effectiveCombinedTaxRate: 21.58,
  pdfDocumentMetadata: {
    fileName: 'Demo_2024_Tax_Return.pdf',
    totalPages: 52,
    fileSizeBytes: 2450000,
    sha256Hash: 'mock-sha256-demo-2024',
    uploadedAt: '2026-10-01T12:00:00Z',
    pageBookmarks: { ...CANONICAL_52_PAGE_BOOKMARKS },
  },
  sourceDocumentMetadata: {
    fileName: 'Demo_2024_Tax_Return.pdf',
    fileSizeBytes: 2450000,
    fileSha256: 'mock-sha256-demo-2024',
    uploadedAt: '2026-10-01T12:00:00Z',
    pageCount: 52,
    keyPageAnchors: { ...CANONICAL_52_PAGE_BOOKMARKS },
  },
};

export const DEMO_TAX_RETURN_2025: CompleteTaxYearReturn = {
  taxYear: 2025,
  profile: DEMO_TAX_FILING_PROFILE_2024_2025,
  federal: {
    taxYear: 2025,
    w2Wages: 188000,
    taxableInterest: 16200,
    scheduleBInterest: [
      { payer: 'CITIBANK DEMO DEPOSIT', accountSuffix: '3703', amount: 6500 },
      { payer: 'FIDELITY CORE MONEY MKT', accountSuffix: '6238', amount: 5800 },
      { payer: 'CHARLES SCHWAB CASH', accountSuffix: '9281', amount: 3700 },
      { payer: 'WEBULL HIGH YIELD CASH', accountSuffix: 'CUX5XLW4', amount: 200 },
    ],
    ordinaryDividends: 6400,
    qualifiedDividends: 6000,
    scheduleBDividends: [
      { payer: 'FIDELITY INDEX FUND', accountSuffix: '6238', amount: 5800 },
      { payer: 'VANGUARD TOTAL STOCK', amount: 500 },
      { payer: 'WEBULL DIVIDEND ETF', accountSuffix: 'CUX5XLW4', amount: 100 },
    ],
    pensionsAndAnnuities: 4800,
    capitalGainLossLine7: -3000,
    netShortTermGainLoss: -31500, // Capped at $3k ordinary deduction -> creates $28,500 carryover!
    netLongTermGainLoss: 0,
    capitalLossCarryoverToNextYear: 28500, // Active loss carryover to 2026!
    scheduleDTransactions: [
      { description: 'Short-Term Covered Options/Equity Trading', term: 'short_term', proceeds: 20000, costBasis: 51500, gainLoss: -31500, brokerageAccount: 'Fidelity 6238' },
    ],
    schedule1AdditionalIncome: -8300,
    gamblingWinnings: 3000,
    scheduleETotalIncomeLoss: -11300,
    rentalProperties: [
      {
        address: '3343 Los Prados, San Mateo, CA 94403',
        propertyType: 'Single Family Residence',
        fairRentalDays: 365,
        personalUseDays: 0,
        rentsReceived: 30000,
        expenses: {
          cleaningMaintenance: 1500,
          insurance: 4000,
          legalProfessional: 1000,
          mortgageInterest: 17500,
          repairs: 4000,
          taxes: 18000,
          utilities: 200,
          depreciation: 25000,
          other: [{ description: 'HOA & Gardening', amount: 6800 }],
          totalExpenses: 78000,
        },
        netIncomeLoss: -48000,
        passiveLossAllowedAfterForm8582: -12000,
        suspendedLossCarriedForward: 36000, // Carried forward to 2026 under Form 8582!
      },
    ],
    partnerships: [
      { entityName: 'Taylor Family Equity Partners LP', einMasked: '94-0000001', type: 'P', passiveIncome: 12000, nonpassiveIncome: 0, passiveLossAllowed: 0, nonpassiveLoss: 0, netIncomeLoss: 12000 },
    ],
    form8582: {
      taxYear: 2025,
      rentalRealEstateNetLoss: -48000,
      otherPassiveIncome: 12000,
      modifiedAgi: 204100,
      specialAllowanceLimit: 150000,
      specialAllowanceAllowed: 0,
      totalLossAllowedCurrentYear: 12000,
      unallowedSuspendedLossCarryforward: 36000,
    },
    totalIncome: 204100,
    adjustmentsToIncome: 0,
    agi: 204100,
    deductionTypeUsed: 'itemized',
    standardDeduction: 31500,
    itemizedDeductions: {
      medicalAndDental: 0,
      stateAndLocalIncomeOrSalesTax: 18500,
      realEstateTaxes: 24500,
      personalPropertyTaxes: 1200,
      totalSaltPaid: 44200,
      saltCapLimit: 40000, // 2025 SALT Cap
      deductibleSalt: 40000,
      homeMortgageInterest: 0,
      charitableGiftsCash: 1500,
      charitableGiftsNoncash: 4000,
      totalCharitableGifts: 5500,
      gamblingLosses: 3000,
      totalItemizedDeductions: 48500,
    },
    totalDeductionsClaimed: 48500,
    qbiDeduction: 0,
    form8995: {
      taxYear: 2025,
      qualifiedBusinessIncome: -11300,
      twentyPercentComponent: 0,
      taxableIncomeBeforeQbi: 155600,
      netCapitalGainAndDividends: 6000,
      incomeLimitation: 29920,
      allowedQbiDeduction: 0,
      qbiLossCarryforward: 9445,
    },
    taxableIncome: 155600,
    regularFederalTax: 23400,
    niitTax: 0,
    additionalMedicareTax: 0,
    foreignTaxCredit: 0,
    totalFederalTax: 23400,
    federalWithholding: 24200,
    estimatedTaxPaymentsApplied: 23000,
    totalFederalPayments: 47200,
    federalOverpayment: 23800,
    overpaymentAppliedToNextYear: 23800,
    estimatedTaxPenalty: 0,
  },
  california: {
    taxYear: 2025,
    stateWages: 188000,
    federalAgi: 204100,
    caSubtractions: 10000,
    caAdditions: 0,
    caAgi: 194100,
    caDeductionType: 'itemized',
    caItemizedDeductions: 28500,
    caTaxableIncome: 165600,
    caTaxAfterCredits: 10800,
    caWithholding: 11000,
    caEstimatedPayments: 4500,
    totalCaPayments: 15500,
    caOverpayment: 4700,
    caOverpaymentAppliedToNextYear: 4700,
    caPenalty: 0,
  },
  totalCombinedTax: 34200,
  blendedEffectiveTaxRatePct: 16.76,
  effectiveCombinedTaxRate: 16.76,
  pdfDocumentMetadata: {
    fileName: 'Demo_2025_Tax_Return.pdf',
    totalPages: 52,
    fileSizeBytes: 2580000,
    sha256Hash: 'mock-sha256-demo-2025',
    uploadedAt: '2026-10-02T12:00:00Z',
    pageBookmarks: { ...CANONICAL_52_PAGE_BOOKMARKS },
  },
  sourceDocumentMetadata: {
    fileName: 'Demo_2025_Tax_Return.pdf',
    fileSizeBytes: 2580000,
    fileSha256: 'mock-sha256-demo-2025',
    uploadedAt: '2026-10-02T12:00:00Z',
    pageCount: 52,
    keyPageAnchors: { ...CANONICAL_52_PAGE_BOOKMARKS },
  },
};

export function generateSyntheticTaxReturnForYear(
  year: number,
  fileName?: string,
  fileSizeBytes?: number,
  customProfile?: Partial<TaxFilingProfile>
): CompleteTaxYearReturn {
  const yearDelta = year - 2024;
  const wageBase = Math.round(215000 + yearDelta * 12000);
  const interestBase = Math.round(15000 + Math.abs(yearDelta) * 800);
  const divBase = Math.round(5000 + Math.abs(yearDelta) * 400);
  const agi = wageBase + interestBase + divBase - 5000;
  const standardDeduction = 25000 + (year >= 2024 ? (year - 2024) * 1000 : (year - 2020) * 800);
  const taxableIncome = Math.max(0, agi - standardDeduction);
  const totalTax = Math.round(taxableIncome * 0.22);
  const caTax = Math.round(taxableIncome * 0.08);
  const combinedTax = totalTax + caTax;
  const effectiveRate = agi > 0 ? Number(((combinedTax / agi) * 100).toFixed(2)) : 18.0;

  const baseProfile = { ...DEMO_TAX_FILING_PROFILE_2024_2025, taxYear: year };
  const mergedProfile: TaxFilingProfile = customProfile
    ? {
        ...baseProfile,
        ...customProfile,
        primaryTaxpayer: {
          ...baseProfile.primaryTaxpayer,
          ...(customProfile.primaryTaxpayer || {}),
        },
        spouseTaxpayer: customProfile.spouseTaxpayer
          ? {
              ...(baseProfile.spouseTaxpayer || ({} as any)),
              ...customProfile.spouseTaxpayer,
            }
          : baseProfile.spouseTaxpayer,
      }
    : baseProfile;

  return {
    taxYear: year,
    profile: mergedProfile,
    federal: {
      taxYear: year,
      w2Wages: wageBase,
      taxableInterest: interestBase,
      scheduleBInterest: [
        { payer: 'CITIBANK DEMO DEPOSIT', accountSuffix: '3703', amount: interestBase },
      ],
      ordinaryDividends: divBase,
      qualifiedDividends: Math.round(divBase * 0.9),
      scheduleBDividends: [
        { payer: 'FIDELITY INDEX FUND', accountSuffix: '6238', amount: divBase },
      ],
      pensionsAndAnnuities: 0,
      capitalGainLossLine7: year >= 2024 ? -3000 : 6000,
      netShortTermGainLoss: year >= 2024 ? -15000 : 4000,
      netLongTermGainLoss: year >= 2024 ? 0 : 2000,
      capitalLossCarryoverToNextYear: year >= 2024 ? 28500 : 0,
      scheduleDTransactions: [
        {
          description: 'Equity/ETF Investment Trading',
          term: year >= 2024 ? 'short_term' : 'long_term',
          proceeds: 50000,
          costBasis: year >= 2024 ? 65000 : 44000,
          gainLoss: year >= 2024 ? -15000 : 6000,
        },
      ],
      schedule1AdditionalIncome: 0,
      gamblingWinnings: 0,
      scheduleETotalIncomeLoss: -10000,
      rentalProperties: [
        {
          address: '3343 Los Prados, San Mateo, CA 94403',
          propertyType: 'Single Family Residence',
          fairRentalDays: 365,
          personalUseDays: 0,
          rentsReceived: 28000 + yearDelta * 1000,
          expenses: {
            cleaningMaintenance: 1200,
            insurance: 3800,
            legalProfessional: 800,
            mortgageInterest: 16000,
            repairs: 3500,
            taxes: 17000,
            utilities: 200,
            depreciation: 25000,
            other: [{ description: 'HOA & Gardening', amount: 5000 }],
            totalExpenses: 72500,
          },
          netIncomeLoss: -44500,
          passiveLossAllowedAfterForm8582: 0,
          suspendedLossCarriedForward: 44500,
        },
      ],
      partnerships: [],
      form8582: {
        taxYear: year,
        rentalRealEstateNetLoss: -44500,
        otherPassiveIncome: 0,
        modifiedAgi: agi,
        specialAllowanceLimit: 150000,
        specialAllowanceAllowed: 0,
        totalLossAllowedCurrentYear: 0,
        unallowedSuspendedLossCarryforward: 44500,
      },
      totalIncome: wageBase + interestBase + divBase,
      adjustmentsToIncome: 0,
      agi,
      deductionTypeUsed: 'standard',
      standardDeduction,
      totalDeductionsClaimed: standardDeduction,
      qbiDeduction: 0,
      form8995: {
        taxYear: year,
        qualifiedBusinessIncome: 0,
        twentyPercentComponent: 0,
        taxableIncomeBeforeQbi: taxableIncome,
        netCapitalGainAndDividends: divBase,
        incomeLimitation: taxableIncome * 0.2,
        allowedQbiDeduction: 0,
        qbiLossCarryforward: 0,
      },
      taxableIncome,
      regularFederalTax: totalTax,
      niitTax: 0,
      additionalMedicareTax: 0,
      foreignTaxCredit: 0,
      totalFederalTax: totalTax,
      federalWithholding: Math.round(totalTax * 0.75),
      estimatedTaxPaymentsApplied: Math.round(totalTax * 0.25),
      totalFederalPayments: totalTax + 1500,
      federalOverpayment: 1500,
      overpaymentAppliedToNextYear: 1500,
      estimatedTaxPenalty: 0,
    },
    california: {
      taxYear: year,
      stateWages: wageBase,
      federalAgi: agi,
      caSubtractions: 0,
      caAdditions: 0,
      caAgi: agi,
      caDeductionType: 'standard',
      caItemizedDeductions: 0,
      caTaxableIncome: Math.max(0, agi - 10000),
      caTaxAfterCredits: caTax,
      caWithholding: Math.round(caTax * 0.75),
      caEstimatedPayments: Math.round(caTax * 0.25),
      totalCaPayments: caTax + 800,
      caOverpayment: 800,
      caOverpaymentAppliedToNextYear: 800,
      caPenalty: 0,
    },
    totalCombinedTax: combinedTax,
    blendedEffectiveTaxRatePct: effectiveRate,
    effectiveCombinedTaxRate: effectiveRate,
    pdfDocumentMetadata: {
      fileName: fileName || `Demo_${year}_Tax_Return.pdf`,
      totalPages: 52,
      fileSizeBytes: fileSizeBytes || 2400000,
      sha256Hash: `mock-sha256-demo-${year}`,
      uploadedAt: `${year + 1}-04-10T12:00:00Z`,
      pageBookmarks: { ...CANONICAL_52_PAGE_BOOKMARKS },
    },
  };
}

export const DEMO_TAX_RETURN_2020: CompleteTaxYearReturn = generateSyntheticTaxReturnForYear(2020);
export const DEMO_TAX_RETURN_2021: CompleteTaxYearReturn = generateSyntheticTaxReturnForYear(2021);
export const DEMO_TAX_RETURN_2022: CompleteTaxYearReturn = generateSyntheticTaxReturnForYear(2022);
export const DEMO_TAX_RETURN_2023: CompleteTaxYearReturn = generateSyntheticTaxReturnForYear(2023);

export const DEMO_TAX_RETURNS: CompleteTaxYearReturn[] = [
  DEMO_TAX_RETURN_2020,
  DEMO_TAX_RETURN_2021,
  DEMO_TAX_RETURN_2022,
  DEMO_TAX_RETURN_2023,
  DEMO_TAX_RETURN_2024,
  DEMO_TAX_RETURN_2025,
];

export const INITIAL_USER_TAX_FACTS: UserTaxFact[] = [
  {
    factId: 'fact-1',
    category: 'profile',
    statement: 'Filing Status is Married Filing Jointly (MFJ) residing in San Francisco, CA.',
    value: 'MFJ - California',
    confirmedAt: '2026-10-02T12:00:00Z',
    source: 'tax_return_2025',
  },
  {
    factId: 'fact-2',
    category: 'loss_carryover',
    statement: 'Active Short-Term Capital Loss Carryover of $28,500 available into 2026.',
    value: 28500,
    confirmedAt: '2026-10-02T12:00:00Z',
    source: 'tax_return_2025',
  },
  {
    factId: 'fact-3',
    category: 'loss_carryover',
    statement: 'Suspended Passive Activity Rental Loss of $36,000 under Form 8582 available into 2026.',
    value: 36000,
    confirmedAt: '2026-10-02T12:00:00Z',
    source: 'tax_return_2025',
  },
  {
    factId: 'fact-4',
    category: 'healthcare',
    statement: 'Ivan Wong has active employer group healthcare at ViaPath Technologies inc. ($28,500 value in 2025).',
    value: 'ViaPath Technologies inc. Group Coverage',
    confirmedAt: '2026-10-02T12:00:00Z',
    source: 'tax_return_2025',
  },
  {
    factId: 'fact-5',
    category: 'retirement_goal',
    statement: 'Harmony Wong turns 65 in August 2027; Ivan Wong turns 65 in March 2029. Both have SECURE 2.0 RMD age of 75.',
    value: 'RMD Age 75',
    confirmedAt: '2026-10-02T12:00:00Z',
    source: 'tax_return_2025',
  },
];

// Aliases for backwards compatibility and clean default fallback
export const TAX_RETURN_2024 = DEMO_TAX_RETURN_2024;
export const TAX_RETURN_2025 = DEMO_TAX_RETURN_2025;
export const TAX_FILING_PROFILE_2024_2025 = DEMO_TAX_FILING_PROFILE_2024_2025;

export const sample2024Return = DEMO_TAX_RETURN_2024;
export const sample2025Return = DEMO_TAX_RETURN_2025;
export const samplePortfolioTaxShields = {
  capitalLossCarryover: 28500,
  suspendedRentalLoss: 36000,
  qbiLossCarryover: 9445,
  unrealizedLosses: 14250,
  totalLossShieldUtilization: 88195,
};
