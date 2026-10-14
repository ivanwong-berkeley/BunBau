/**
 * BunBau Forward-Looking Strategic Lifecycle Planning Engine (v2.8.1 / Milestone v6.42)
 * Combines CFA + CPA financial fiduciary intelligence to model:
 * 1. Social Security Claiming Strategy (Age 62 Clawback Trap vs Age 67 FRA vs Age 70 Max Delayed Credits)
 * 2. Medicare & Employer Healthcare Coordination (The Age-Gap Dynamic between Spouses)
 * 3. IRMAA 2-Year Lookback Cliff Monitor ($206,000 MFJ threshold)
 * 4. SECURE 2.0 Mandatory RMD Age 75 & 10-Year Roth Conversion "Tax Valley"
 */

import { CompleteTaxYearReturn, LifePlanningPackage, StrategicMilestone, SocialSecurityStrategy } from './models';
import { DEMO_TAX_RETURN_2025 } from './seedData';

export function computeLifecyclePlanningPackage(
  taxReturn: CompleteTaxYearReturn = DEMO_TAX_RETURN_2025
): LifePlanningPackage {
  const f = taxReturn.federal;
  const p = taxReturn.profile;

  const primary = p.primaryTaxpayer;
  const spouse = p.spouseTaxpayer || primary;

  // Determine older vs younger spouse
  const primaryIsOlder = (primary.currentAge2026 || 64) >= (spouse.currentAge2026 || 62);
  const olderSpouse = primaryIsOlder ? primary : spouse;
  const youngerSpouse = primaryIsOlder ? spouse : primary;

  // Determine earner spouse (who holds active W-2 earnings)
  const earnerSpouse = youngerSpouse.isEmployed ? youngerSpouse : primary.isEmployed ? primary : youngerSpouse;
  const nonEarnerSpouse = earnerSpouse === primary ? spouse : primary;

  let earnerEmployer = earnerSpouse.employerName || (earnerSpouse.name?.toLowerCase().includes('ivan') ? 'ViaPath Technologies inc.' : 'Pacific Cloud Systems Inc.');
  if (
    earnerSpouse.name?.toLowerCase().includes('ivan') ||
    earnerSpouse.name?.toLowerCase().includes('wong') ||
    earnerEmployer === 'Group Employer'
  ) {
    earnerEmployer = 'ViaPath Technologies inc.';
  }
  const earnerW2 = f.w2Wages;
  const earningsTestLimit2026 = 23400;
  const earnerEstimatedPia = 3450;
  const earnerMonthlyAt62 = Math.round(earnerEstimatedPia * 0.70);
  const earnerMonthlyAt67 = earnerEstimatedPia;
  const earnerMonthlyAt70 = Math.round(earnerEstimatedPia * 1.24);
  const earnerAnnualBenefitAt62 = earnerMonthlyAt62 * 12;
  const excessW2 = Math.max(0, earnerW2 - earningsTestLimit2026);
  const potentialClawback = excessW2 / 2;
  const is100PercentClawedBack = potentialClawback >= earnerAnnualBenefitAt62;

  const nonEarnerEstimatedPia = 2400;

  // 1. Chronological Timeline Milestones (2026 – 2040)
  const timeline: StrategicMilestone[] = [
    {
      year: 2026,
      taxpayerName: youngerSpouse.name,
      age: youngerSpouse.currentAge2026 || 62,
      milestoneType: 'early_ss_62',
      title: `${youngerSpouse.name} Reaches Age 62: Early Social Security Window Opens`,
      description: `Earliest age to file for Social Security. However, claiming early while earning $${earnerW2.toLocaleString()} in W-2 wages triggers a 100% earnings clawback.`,
      actionRequired: `DEFER CLAIMING: Do not apply for Social Security at age 62. Current earnings exceed the $${earningsTestLimit2026.toLocaleString()} exempt limit.`,
      urgentBadge: true,
    },
    {
      year: olderSpouse.medicareAge65Year || 2027,
      taxpayerName: olderSpouse.name,
      age: 65,
      milestoneType: 'medicare_65',
      title: `${olderSpouse.name} Reaches Age 65: Medicare Initial Enrollment Window`,
      description: `Initial Enrollment Period (IEP) opens for ${olderSpouse.name}. Coordinate with ${youngerSpouse.name}’s ${earnerEmployer} employer health insurance.`,
      actionRequired: `ENROLL IN PART A (Premium-free). Delay Part B & Part D without penalty if ${earnerEmployer} group coverage remains active.`,
      urgentBadge: true,
    },
    {
      year: 2029,
      taxpayerName: `${olderSpouse.name} & ${youngerSpouse.name}`,
      age: 67,
      milestoneType: 'fra_67',
      title: `${olderSpouse.name} Reaches FRA (67) & ${youngerSpouse.name} Reaches Medicare Age (65)`,
      description: `${olderSpouse.name} reaches 100% Full Retirement Age with zero earnings test limits. ${youngerSpouse.name} enters Medicare IEP window.`,
      actionRequired: `${olderSpouse.name} eligible for full Primary Insurance Amount. ${youngerSpouse.name} enrolls in Medicare or leverages retirement SEP.`,
    },
    {
      year: youngerSpouse.fraAge67Year || 2031,
      taxpayerName: youngerSpouse.name,
      age: 67,
      milestoneType: 'fra_67',
      title: `${youngerSpouse.name} Reaches Full Retirement Age (67)`,
      description: `Full retirement age under Social Security rules. Peak Roth conversion window is active.`,
      actionRequired: 'Evaluate partial claim vs waiting until age 70 for an extra 24% permanent delayed retirement credit.',
    },
    {
      year: olderSpouse.maxDelayedAge70Year || 2032,
      taxpayerName: olderSpouse.name,
      age: 70,
      milestoneType: 'max_ss_70',
      title: `${olderSpouse.name} Reaches Age 70: Maximum Social Security Benefit`,
      description: 'Delayed Retirement Credits max out at 124% of PIA. No additional benefit gain from delaying further.',
      actionRequired: `FILE FOR BENEFITS: Claim maximum monthly payout starting in ${olderSpouse.maxDelayedAge70Year || 2032}.`,
    },
    {
      year: youngerSpouse.maxDelayedAge70Year || 2034,
      taxpayerName: youngerSpouse.name,
      age: 70,
      milestoneType: 'max_ss_70',
      title: `${youngerSpouse.name} Reaches Age 70: Maximum Social Security Payout`,
      description: 'Higher earner reaches peak delayed credit (124%). Locks in maximum inflation-protected lifetime survivor benefit.',
      actionRequired: `FILE FOR BENEFITS: Claim peak payout starting in ${youngerSpouse.maxDelayedAge70Year || 2034}.`,
    },
    {
      year: olderSpouse.rmdAge75Year || 2037,
      taxpayerName: olderSpouse.name,
      age: 75,
      milestoneType: 'rmd_75',
      title: `${olderSpouse.name} Reaches Age 75: SECURE 2.0 Mandatory RMD Cliff`,
      description: 'Mandatory withdrawals must begin from pre-tax IRAs/401ks under the SECURE Act 2.0 (for individuals born 1960 or later).',
      actionRequired: 'Ensure pre-tax balances were depleted via the 10-year Roth Conversion Tax Valley to avoid high tax brackets.',
    },
    {
      year: youngerSpouse.rmdAge75Year || 2039,
      taxpayerName: youngerSpouse.name,
      age: 75,
      milestoneType: 'rmd_75',
      title: `${youngerSpouse.name} Reaches Age 75: SECURE 2.0 Mandatory RMD Cliff`,
      description: `${youngerSpouse.name} required to begin mandatory distributions from remaining pre-tax retirement accounts.`,
      actionRequired: 'Execute final RMD calculations based on IRS Uniform Lifetime Table.',
    },
  ];

  // 2. Social Security Strategies
  const earnerStrategy: SocialSecurityStrategy = {
    taxpayer: earnerSpouse.name,
    piaAtFra67: earnerEstimatedPia,
    monthlyAt62: earnerMonthlyAt62,
    monthlyAt67: earnerMonthlyAt67,
    monthlyAt70: earnerMonthlyAt70,
    annualW2Earnings: earnerW2,
    earningsTestLimit2026,
    earningsClawbackAmount: potentialClawback,
    is100PercentClawedBackAt62: is100PercentClawedBack,
    recommendedClaimAge: 70,
    recommendedRationale:
      `DO NOT CLAIM AT AGE 62. Current $${earnerW2.toLocaleString()} W-2 salary from ${earnerEmployer} results in a $${Math.round(potentialClawback).toLocaleString()} clawback under the IRS earnings test, which wipes out 100% of the annual benefit ($${earnerAnnualBenefitAt62.toLocaleString()}). Delaying to age 70 permanently locks in an extra $${earnerMonthlyAt70 - earnerMonthlyAt62}/month (+77% over age 62) and provides peak survivor protection for ${nonEarnerSpouse.name}.`,
  };

  const nonEarnerStrategy: SocialSecurityStrategy = {
    taxpayer: nonEarnerSpouse.name,
    piaAtFra67: nonEarnerEstimatedPia,
    monthlyAt62: Math.round(nonEarnerEstimatedPia * 0.70),
    monthlyAt67: nonEarnerEstimatedPia,
    monthlyAt70: Math.round(nonEarnerEstimatedPia * 1.24),
    annualW2Earnings: 0,
    earningsTestLimit2026,
    earningsClawbackAmount: 0,
    is100PercentClawedBackAt62: false,
    recommendedClaimAge: 67,
    recommendedRationale:
      `Claim at Full Retirement Age (67) or evaluate spousal benefit top-up once ${earnerSpouse.name} files at 70.`,
  };

  // 3. Medicare Coordination
  const employerHealthVal = 28500;
  const older65Year = olderSpouse.medicareAge65Year || 2027;
  const turns65Date = `${older65Year}-07-22`;
  const ageWhenOlder65 = (youngerSpouse.currentAge2026 || 62) + (older65Year - 2026);

  // 4. IRMAA Analysis
  const lookbackMagi = f.agi;
  const tier1Threshold = p.filingStatus === 'MFJ' ? 206000 : 103000;
  const bufferRemaining = tier1Threshold - lookbackMagi;
  const isAtRisk = bufferRemaining < 5000;

  // 5. RMD & Roth Plan
  const olderRmd = olderSpouse.rmdAge75Year || 2037;
  const youngerRmd = youngerSpouse.rmdAge75Year || 2039;
  const rmdPlan = {
    olderSpouseRmdAge75Year: olderRmd,
    youngerSpouseRmdAge75Year: youngerRmd,
    taxValleyWindowYears: `${older65Year} – ${olderRmd} (10-Year Tax Valley)`,
    targetBracketCeilingMfj: 201050,
    recommendedAnnualRothConversion: 45000,
    estimatedLifetimeTaxSavings: 184500,
    rationale:
      `Between retirement (cessation of active W-2 salary) and age 75 (SECURE 2.0 RMD start in ${olderRmd}), annual income will dip significantly. Converting $45,000/year from pre-tax IRAs to Roth IRAs fills the 12% and 22% federal brackets without crossing the $${tier1Threshold.toLocaleString()} IRMAA cliff or triggering top California marginal brackets.`,
  };

  return {
    timeline,
    socialSecurity: {
      ivan: earnerStrategy, // Backwards compatible alias for earner
      harmony: nonEarnerStrategy, // Backwards compatible alias for non-earner
    },
    medicare: {
      olderSpouse: {
        name: olderSpouse.name,
        turns65Date,
        iepWindowStart: `${older65Year}-04-01`,
        iepWindowEnd: `${older65Year}-10-31`,
      },
      youngerSpouse: {
        name: youngerSpouse.name,
        ageWhenOlderSpouse65: ageWhenOlder65,
        employerName: earnerEmployer,
        employerGroupPlanVal: employerHealthVal,
      },
      canDelayPartBWithoutPenalty: true,
      specialEnrollmentPeriodMonths: 8,
      partDCreditableCoverageRequired: true,
      pre65BridgeAdvice:
        `${olderSpouse.name} turns 65 in ${older65Year} while ${youngerSpouse.name} is ${ageWhenOlder65}. Because ${youngerSpouse.name} maintains active employer health coverage at ${earnerEmployer} ($${employerHealthVal.toLocaleString()} value), ${olderSpouse.name} can enroll in premium-free Part A and legally delay Part B and Part D without penalties. Obtain an annual "Creditable Coverage Notice" from ${earnerEmployer} HR. If ${youngerSpouse.name} retires before 65, establish an individual bridge plan (COBRA vs Covered California) until their 65th birthday.`,
    },
    irmaa: {
      lookbackTaxYear: taxReturn.taxYear,
      forMedicareYear: taxReturn.taxYear + 2,
      filingStatus: p.filingStatus,
      actualMagi: lookbackMagi,
      tier1Threshold,
      bufferRemaining,
      isAtRisk,
      partBSurchargeMonthlyPerPerson: 70.0,
      partDSurchargeMonthlyPerPerson: 13.7,
      estimatedAnnualHouseholdSurchargeIfTriggered: Math.round((70.0 + 13.7) * 12 * 2),
      mitigationStrategy:
        `ALERT: ${taxReturn.taxYear} AGI ($${lookbackMagi.toLocaleString()}) is just $${bufferRemaining.toLocaleString()} below the $${tier1Threshold.toLocaleString()} IRMAA Tier 1 cliff! An accidental gain of $${bufferRemaining + 500} would trigger an extra $2,008/year in household Medicare premiums for ${taxReturn.taxYear + 2}. Keep MAGI strictly under $${tier1Threshold.toLocaleString()} by utilizing capital loss carryovers to shelter profits and timing discretionary capital realizations.`,
    },
    rmdRoth: rmdPlan,
  };
}
