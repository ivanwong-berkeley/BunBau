import { describe, it, expect } from 'vitest';
import { computeLifecyclePlanningPackage } from '../../../src/lib/tax/lifecyclePlanningEngine';
import { DEMO_TAX_RETURN_2025 } from '../../../src/lib/tax/seedData';

describe('Tax Expert: Strategic Lifecycle Planning Engine (CFA + CPA Intelligence)', () => {
  const lifecyclePackage = computeLifecyclePlanningPackage(DEMO_TAX_RETURN_2025);

  it('1. Verifies Strategic Lifecycle Timeline (2026 to 2040)', () => {
    const timeline = lifecyclePackage.timeline;
    expect(timeline.length).toBeGreaterThanOrEqual(8);

    // 2026 Jordan early SS 62
    const m2026 = timeline.find((m) => m.year === 2026);
    expect(m2026).toBeDefined();
    expect(m2026?.age).toBe(62);
    expect(m2026?.taxpayerName).toBe('Jordan Taylor');
    expect(m2026?.urgentBadge).toBe(true);
    expect(m2026?.actionRequired).toContain('DEFER CLAIMING');

    // 2027 Alex Medicare 65
    const m2027 = timeline.find((m) => m.year === 2027);
    expect(m2027).toBeDefined();
    expect(m2027?.age).toBe(65);
    expect(m2027?.taxpayerName).toBe('Alex Taylor');
    expect(m2027?.urgentBadge).toBe(true);

    // SECURE 2.0 RMD age 75 milestones
    const m2037 = timeline.find((m) => m.year === 2037);
    expect(m2037?.milestoneType).toBe('rmd_75');
    expect(m2037?.taxpayerName).toBe('Alex Taylor');

    const m2039 = timeline.find((m) => m.year === 2039);
    expect(m2039?.milestoneType).toBe('rmd_75');
    expect(m2039?.taxpayerName).toBe('Jordan Taylor');
  });

  it('2. Verifies Social Security Claiming Strategy & 100% Clawback Math', () => {
    const ss = lifecyclePackage.socialSecurity;
    const earner = ss.ivan; // earner alias

    expect(earner.taxpayer).toBe('Jordan Taylor');
    expect(earner.piaAtFra67).toBe(3450);
    expect(earner.monthlyAt62).toBe(2415);
    expect(earner.monthlyAt67).toBe(3450);
    expect(earner.monthlyAt70).toBe(4278);

    // Jordan W-2 salary $188k triggers 100% clawback at age 62
    expect(earner.annualW2Earnings).toBe(188000);
    expect(earner.earningsTestLimit2026).toBe(23400);
    expect(earner.is100PercentClawedBackAt62).toBe(true);
    expect(earner.recommendedClaimAge).toBe(70);
    expect(earner.recommendedRationale).toContain('DO NOT CLAIM AT AGE 62');

    // Alex is not subject to wage clawback
    const spouse = ss.harmony; // non-earner alias
    expect(spouse.taxpayer).toBe('Alex Taylor');
    expect(spouse.annualW2Earnings).toBe(0);
    expect(spouse.is100PercentClawedBackAt62).toBe(false);
    expect(spouse.recommendedClaimAge).toBe(67);
  });

  it('3. Verifies Medicare Coordination & Age-Gap Dynamic', () => {
    const med = lifecyclePackage.medicare;

    expect(med.olderSpouse.name).toBe('Alex Taylor');
    expect(med.olderSpouse.turns65Date).toBe('2027-07-22');
    expect(med.youngerSpouse.name).toBe('Jordan Taylor');
    expect(med.youngerSpouse.ageWhenOlderSpouse65).toBe(63);

    // Employer health coverage code DD protection
    expect(med.youngerSpouse.employerName).toBe('Pacific Cloud Systems Inc.');
    expect(med.canDelayPartBWithoutPenalty).toBe(true);
    expect(med.specialEnrollmentPeriodMonths).toBe(8);
    expect(med.partDCreditableCoverageRequired).toBe(true);
    expect(med.pre65BridgeAdvice).toContain('COBRA vs Covered California');
  });

  it('4. Verifies IRMAA 2-Year Lookback Buffer Analysis', () => {
    const irmaa = lifecyclePackage.irmaa;

    expect(irmaa.lookbackTaxYear).toBe(2025);
    expect(irmaa.forMedicareYear).toBe(2027);
    expect(irmaa.filingStatus).toBe('MFJ');
    expect(irmaa.tier1Threshold).toBe(206000);
    expect(irmaa.actualMagi).toBe(204100);

    // Buffer of $1,900
    expect(irmaa.bufferRemaining).toBe(1900);
    expect(irmaa.isAtRisk).toBe(true);
    expect(irmaa.estimatedAnnualHouseholdSurchargeIfTriggered).toBeGreaterThan(2000);
    expect(irmaa.mitigationStrategy).toContain('strictly under $206,000');
  });

  it('5. Verifies SECURE 2.0 RMD Age 75 & 10-Year Roth Conversion Roadmap', () => {
    const rmd = lifecyclePackage.rmdRoth;

    expect(rmd.olderSpouseRmdAge75Year).toBe(2037);
    expect(rmd.youngerSpouseRmdAge75Year).toBe(2039);
    expect(rmd.taxValleyWindowYears).toBe('2027 – 2037 (10-Year Tax Valley)');
    expect(rmd.recommendedAnnualRothConversion).toBe(45000);
    expect(rmd.targetBracketCeilingMfj).toBe(201050);
    expect(rmd.estimatedLifetimeTaxSavings).toBe(184500);
  });
});
