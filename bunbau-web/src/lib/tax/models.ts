/**
 * BunBau Tax Expert Models & Interfaces (v2.8 / Milestone v6.41)
 * Comprehensive TypeScript data model for Multi-Year Tax Return Analysis,
 * Lifecycle Strategic Planning (Social Security, Medicare, IRMAA, RMD & Roth),
 * Document Ingestion & Shared RAG Knowledge Engine.
 */

export type FilingStatus = 'MFJ' | 'Single' | 'MFS' | 'HOH' | 'QSS';

export interface TaxpayerInfo {
  name: string;
  ssnMasked: string; // e.g. ***-**-0923 (never stored raw)
  dob: string; // YYYY-MM-DD
  currentAge2026: number;
  medicareAge65Year: number;
  fraAge67Year: number;
  maxDelayedAge70Year: number;
  rmdAge75Year: number;
  isEmployed: boolean;
  employerName?: string;
  hasEmployerGroupHealth?: boolean;
}

export interface TaxFilingProfile {
  taxYear: number;
  filingStatus: FilingStatus;
  primaryTaxpayer: TaxpayerInfo;
  spouseTaxpayer?: TaxpayerInfo;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    county: string;
  };
  cpaPreparer?: {
    name: string;
    firm: string;
    phone: string;
    ptinMasked: string;
  };
}

export interface ScheduleBItem {
  payer: string;
  accountSuffix?: string;
  amount: number;
}

export interface ScheduleDTransaction {
  description: string;
  term: 'short_term' | 'long_term';
  proceeds: number;
  costBasis: number;
  gainLoss: number;
  brokerageAccount?: string;
}

export interface ScheduleERentalProperty {
  address: string;
  propertyType: string;
  fairRentalDays: number;
  personalUseDays: number;
  rentsReceived: number;
  expenses: {
    cleaningMaintenance: number;
    insurance: number;
    legalProfessional: number;
    mortgageInterest: number;
    repairs: number;
    taxes: number;
    utilities: number;
    depreciation: number;
    other: { description: string; amount: number }[];
    totalExpenses: number;
  };
  netIncomeLoss: number;
  passiveLossAllowedAfterForm8582: number;
  suspendedLossCarriedForward: number;
}

export interface ScheduleEPartnershipItem {
  entityName: string;
  einMasked: string;
  type: 'P' | 'S';
  passiveIncome: number;
  nonpassiveIncome: number;
  passiveLossAllowed: number;
  nonpassiveLoss: number;
  netIncomeLoss: number;
}

export interface Form8582PassiveLossSummary {
  taxYear: number;
  rentalRealEstateNetLoss: number;
  otherPassiveIncome: number;
  modifiedAgi: number;
  specialAllowanceLimit: number;
  specialAllowanceAllowed: number;
  totalLossAllowedCurrentYear: number;
  unallowedSuspendedLossCarryforward: number;
}

export interface Form8995QbiSummary {
  taxYear: number;
  qualifiedBusinessIncome: number;
  twentyPercentComponent: number;
  taxableIncomeBeforeQbi: number;
  netCapitalGainAndDividends: number;
  incomeLimitation: number;
  allowedQbiDeduction: number;
  qbiLossCarryforward: number;
}

export interface Form8960NiitSummary {
  taxYear: number;
  netInvestmentIncome: number;
  magi: number;
  threshold: number; // e.g. $250,000 for MFJ
  excessMagi: number;
  niitTaxableAmount: number;
  niitTaxLiability: number; // 3.8% of min(NII, excessMagi)
}

export interface ScheduleAItemizedDeductions {
  medicalAndDental: number;
  stateAndLocalIncomeOrSalesTax: number;
  realEstateTaxes: number;
  personalPropertyTaxes: number;
  totalSaltPaid: number;
  saltCapLimit: number; // $10,000 in 2024; $40,000 in 2025
  deductibleSalt: number;
  homeMortgageInterest: number;
  charitableGiftsCash: number;
  charitableGiftsNoncash: number;
  totalCharitableGifts: number;
  gamblingLosses: number;
  totalItemizedDeductions: number;
}

export interface Federal1040Return {
  taxYear: number;
  w2Wages: number;
  taxableInterest: number;
  scheduleBInterest: ScheduleBItem[];
  ordinaryDividends: number;
  qualifiedDividends: number;
  scheduleBDividends: ScheduleBItem[];
  pensionsAndAnnuities: number;
  capitalGainLossLine7: number;
  netShortTermGainLoss: number;
  netLongTermGainLoss: number;
  capitalLossCarryoverToNextYear: number;
  scheduleDTransactions: ScheduleDTransaction[];
  schedule1AdditionalIncome: number;
  gamblingWinnings: number;
  scheduleETotalIncomeLoss: number;
  rentalProperties: ScheduleERentalProperty[];
  partnerships: ScheduleEPartnershipItem[];
  form8582: Form8582PassiveLossSummary;
  totalIncome: number;
  adjustmentsToIncome: number;
  agi: number;
  deductionTypeUsed: 'standard' | 'itemized';
  standardDeduction: number;
  itemizedDeductions?: ScheduleAItemizedDeductions;
  totalDeductionsClaimed: number;
  qbiDeduction: number;
  form8995: Form8995QbiSummary;
  taxableIncome: number;
  regularFederalTax: number;
  niitTax: number;
  form8960?: Form8960NiitSummary;
  additionalMedicareTax: number;
  foreignTaxCredit: number;
  totalFederalTax: number;
  federalWithholding: number;
  estimatedTaxPaymentsApplied: number;
  totalFederalPayments: number;
  federalOverpayment: number;
  overpaymentAppliedToNextYear: number;
  estimatedTaxPenalty: number; // Line 38
}

export interface California540Return {
  taxYear: number;
  stateWages: number;
  federalAgi: number;
  caSubtractions: number;
  caAdditions: number;
  caAgi: number;
  caDeductionType: 'standard' | 'itemized';
  caItemizedDeductions: number;
  caTaxableIncome: number;
  caTax?: number;
  exemptionCredits?: number;
  caTaxAfterCredits: number;
  caWithholding: number;
  caEstimatedPayments: number;
  totalCaPayments: number;
  caOverpayment: number;
  caOverpaymentAppliedToNextYear: number;
  caPenalty?: number;
}

export interface CompleteTaxYearReturn {
  taxYear: number;
  profile: TaxFilingProfile;
  federal: Federal1040Return;
  california: California540Return;
  totalCombinedTax: number;
  blendedEffectiveTaxRatePct?: number;
  effectiveCombinedTaxRate?: number;
  pdfDocumentMetadata: {
    fileName: string;
    totalPages?: number;
    fileSizeBytes: number;
    sha256Hash?: string;
    uploadedAt: string;
    pageBookmarks?: { [key: string]: number };
  };
  sourceDocumentMetadata?: any;
}

// Multi-Year Comparison & Variance Models
export interface LineItemComparison {
  key: string;
  label: string;
  category: 'Income' | 'Deductions' | 'Taxes' | 'Payments' | 'Carryovers' | 'California';
  formRef: string;
  year2024: number;
  year2025: number;
  previousYearVal?: number;
  latestYearVal?: number;
  diffAmount: number;
  diffPercent: number;
  trend: 'up' | 'down' | 'neutral';
  impactInsight: string;
  sourceDocPage2024?: number;
  sourceDocPage2025?: number;
  sourceDocPagePrev?: number;
  sourceDocPageLatest?: number;
}

export interface MultiYearTaxComparison {
  years: number[];
  latestYear: number;
  previousYear: number;
  lineItems: LineItemComparison[];
  kpis: {
    latestYear: number;
    previousYear: number;
    agi: {
      latest?: number;
      previous?: number;
      year2024: number;
      year2025: number;
      diff: number;
      diffPct: number;
    };
    taxableIncome: {
      latest?: number;
      previous?: number;
      year2024: number;
      year2025: number;
      diff: number;
      diffPct: number;
    };
    totalTax: {
      latest?: number;
      previous?: number;
      year2024: number;
      year2025: number;
      diff: number;
      diffPct: number;
    };
    effectiveRatePct: {
      latest?: number;
      previous?: number;
      year2024: number;
      year2025: number;
      diff: number;
    };
    totalLossShields2026: number; // backwards compatibility: $30,056 Capital Loss + $39,057 Passive Loss
    totalLossShieldsNextYear?: number; // forward-looking loss shield for latestYear + 1
    nextLossShieldYear?: number; // e.g. 2026
    capitalLossShield?: number;
    passiveLossShield?: number;
  };
  anomalies: {
    id: string;
    severity: 'critical' | 'warning' | 'opportunity' | 'info';
    title: string;
    description: string;
    actionAdvice: string;
  }[];
}

// Forward-Looking Strategic Life Planning Models
export interface StrategicMilestone {
  year: number;
  taxpayerName: string;
  age: number;
  milestoneType: 'early_ss_62' | 'medicare_65' | 'fra_67' | 'max_ss_70' | 'rmd_75';
  title: string;
  description: string;
  actionRequired: string;
  urgentBadge?: boolean;
}

export interface SocialSecurityStrategy {
  taxpayer: string;
  piaAtFra67: number; // Primary Insurance Amount
  monthlyAt62: number; // ~70% of PIA
  monthlyAt67: number; // 100% of PIA
  monthlyAt70: number; // 124% of PIA
  annualW2Earnings: number;
  earningsTestLimit2026: number;
  earningsClawbackAmount: number;
  is100PercentClawedBackAt62: boolean;
  recommendedClaimAge: number;
  recommendedRationale: string;
}

export interface MedicareHealthcareCoordination {
  olderSpouse: {
    name: string;
    turns65Date: string;
    iepWindowStart: string;
    iepWindowEnd: string;
  };
  youngerSpouse: {
    name: string;
    ageWhenOlderSpouse65: number;
    employerName: string;
    employerGroupPlanVal: number;
  };
  canDelayPartBWithoutPenalty: boolean;
  specialEnrollmentPeriodMonths: number;
  partDCreditableCoverageRequired: boolean;
  pre65BridgeAdvice: string;
}

export interface IrmaaCliffAnalysis {
  lookbackTaxYear: number;
  forMedicareYear: number;
  filingStatus: FilingStatus;
  actualMagi: number;
  tier1Threshold: number; // $206,000 for MFJ
  bufferRemaining: number;
  isAtRisk: boolean;
  partBSurchargeMonthlyPerPerson: number;
  partDSurchargeMonthlyPerPerson: number;
  estimatedAnnualHouseholdSurchargeIfTriggered: number;
  mitigationStrategy: string;
}

export interface RmdRothConversionPlan {
  olderSpouseRmdAge75Year: number; // 2037
  youngerSpouseRmdAge75Year: number; // 2039
  taxValleyWindowYears: string; // e.g. "2027 – 2037"
  targetBracketCeilingMfj: number; // e.g. $94,300 (12%) or $201,050 (22%)
  recommendedAnnualRothConversion: number;
  estimatedLifetimeTaxSavings: number;
  rationale: string;
}

export interface LifePlanningPackage {
  timeline: StrategicMilestone[];
  socialSecurity: {
    ivan: SocialSecurityStrategy;
    harmony: SocialSecurityStrategy;
  };
  medicare: MedicareHealthcareCoordination;
  irmaa: IrmaaCliffAnalysis;
  rmdRoth: RmdRothConversionPlan;
}

// RAG Semantic Chunk Model
export interface SemanticKnowledgeChunk {
  chunkId: string;
  category: '1040_summary' | 'schedule_b_yield' | 'schedule_d_gains' | 'schedule_e_rental' | 'deductions_salt' | 'state_ca' | 'live_portfolio' | 'forward_lifecycle';
  taxYear?: number;
  title: string;
  text: string;
  metadata: {
    form?: string;
    schedule?: string;
    lineItems?: string[];
    dollarAmounts?: number[];
    topics?: string[];
    accountName?: string;
  };
  embedding?: number[]; // 768-dim
}

// Persistent User Tax Memory Profile Facts
export interface UserTaxFact {
  factId: string;
  category: 'profile' | 'loss_carryover' | 'healthcare' | 'retirement_goal' | 'real_estate';
  statement: string;
  value: string | number;
  confirmedAt: string;
  source: 'tax_return_2024' | 'tax_return_2025' | 'user_chat_confirmed' | string;
}
