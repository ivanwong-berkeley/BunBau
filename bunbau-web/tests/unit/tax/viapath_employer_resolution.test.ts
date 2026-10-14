import { describe, it, expect } from 'vitest';
import { resolveLiveTaxpayerProfile, createCleanLiveTaxFilingProfile } from '../../../src/lib/tax/taxProfileHelper';
import { generateSyntheticTaxReturnForYear, INITIAL_USER_TAX_FACTS } from '../../../src/lib/tax/seedData';
import { computeLifecyclePlanningPackage } from '../../../src/lib/tax/lifecyclePlanningEngine';

describe('Airtight Zero-Bleed Data Partitioning & ViaPath Technologies inc. Employer Resolution', () => {
  it('1. Resolves Ivan Wong employer to ViaPath Technologies inc. from live PDF filenames', () => {
    const profile = resolveLiveTaxpayerProfile(null, undefined, '2025_Tax_Return_Harmony_Ivan.pdf');
    expect(profile.primaryTaxpayer.name).toBe('Harmony');
    expect(profile.spouseTaxpayer?.name).toBe('Ivan');
    expect(profile.spouseTaxpayer?.isEmployed).toBe(true);
    expect(profile.spouseTaxpayer?.employerName).toBe('ViaPath Technologies inc.');
    expect(profile.spouseTaxpayer?.hasEmployerGroupHealth).toBe(true);
    expect(profile.spouseTaxpayer?.employerName).not.toContain('Pacific Cloud');
    expect(profile.spouseTaxpayer?.employerName).not.toContain('Taylor');
  });

  it('2. Guarantees createCleanLiveTaxFilingProfile has zero synthetic Taylor or Pacific Cloud residue', () => {
    const cleanProfile = createCleanLiveTaxFilingProfile('Harmony Wong', 'Ivan Wong', 'ViaPath Technologies inc.');
    expect(cleanProfile.primaryTaxpayer.name).toBe('Harmony Wong');
    expect(cleanProfile.spouseTaxpayer?.name).toBe('Ivan Wong');
    expect(cleanProfile.spouseTaxpayer?.employerName).toBe('ViaPath Technologies inc.');

    const serialized = JSON.stringify(cleanProfile).toLowerCase();
    expect(serialized).not.toContain('taylor');
    expect(serialized).not.toContain('pacific cloud');
    expect(serialized).not.toContain('742 evergreen');
  });

  it('3. Computes lifecycle planning package with ViaPath Technologies inc. in milestone actions and Medicare plan', () => {
    const liveProfile = resolveLiveTaxpayerProfile(null, undefined, '2025_Tax_Return_Harmony_Ivan.pdf');
    const liveReturn = generateSyntheticTaxReturnForYear(2025, '2025_Tax_Return_Harmony_Ivan.pdf', 2850000, liveProfile);
    const lifePkg = computeLifecyclePlanningPackage(liveReturn);

    // Verify Medicare younger spouse employer
    expect(lifePkg.medicare.youngerSpouse.employerName).toBe('ViaPath Technologies inc.');
    expect(lifePkg.medicare.olderSpouse.name).toBe('Harmony');
    expect(lifePkg.medicare.youngerSpouse.name).toBe('Ivan');

    // Verify milestones referencing Ivan's employer
    const medicareMilestone = lifePkg.timeline.find(
      (m) => m.year === 2027 && m.milestoneType === 'medicare_65'
    );
    expect(medicareMilestone).toBeDefined();
    expect(medicareMilestone?.description).toContain('ViaPath Technologies inc.');
    expect(medicareMilestone?.actionRequired).toContain('ViaPath Technologies inc.');
    expect(medicareMilestone?.description).not.toContain('Pacific Cloud');

    // Verify Social Security earner profile
    expect(lifePkg.socialSecurity.ivan.annualW2Earnings).toBeGreaterThan(0);
    expect(lifePkg.socialSecurity.harmony.annualW2Earnings).toBe(0);
  });

  it('4. INITIAL_USER_TAX_FACTS contains ViaPath Technologies inc. group coverage and no Pacific Cloud', () => {
    const factsStr = JSON.stringify(INITIAL_USER_TAX_FACTS);
    expect(factsStr).toContain('ViaPath Technologies inc.');
    expect(factsStr).not.toContain('Pacific Cloud Systems Inc.');
    expect(factsStr).not.toContain('742 Evergreen Terrace');
  });
});
