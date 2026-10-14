import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { extractTaxpayersFromFilename, resolveLiveTaxpayerProfile } from '../../../src/lib/tax/taxProfileHelper';
import { computeLifecyclePlanningPackage } from '../../../src/lib/tax/lifecyclePlanningEngine';
import { generateSyntheticTaxReturnForYear } from '../../../src/lib/tax/seedData';

const ROOT = path.resolve(__dirname, '../../../');
const SRC = path.resolve(__dirname, '../../../src');

describe('Milestone v6.9: Dual-Entity Name Parsing & Spousal Isolation (Harmony & Ivan)', () => {
  // Required version tracking enforcement:
  // "You also need to update the application version/build/architecture version for every iteration build."
  const EXPECTED_APP_VERSION = '2.7.16';
  const EXPECTED_BUILD_NUMBER = 'Build 131';
  const EXPECTED_ARCH_VERSION = 'v2.9.9 High-Visibility Tactile Sub-Navigation, Two-Tier Advisory Box Accessibility & Multi-Year Audit Report/Chart/Scroll Workstation Architecture';

  const medicareCardCode = fs.readFileSync(path.join(SRC, 'components/tax/MedicareHealthPlanCard.tsx'), 'utf8');
  const timelineCardCode = fs.readFileSync(path.join(SRC, 'components/tax/TaxLifecycleTimeline.tsx'), 'utf8');
  const rmdCardCode = fs.readFileSync(path.join(SRC, 'components/tax/RmdRothConversionCard.tsx'), 'utf8');
  const taxExpertViewCode = fs.readFileSync(path.join(SRC, 'components/tax/TaxExpertView.tsx'), 'utf8');

  describe('1. Version Manifest Consistency', () => {
    it('synchronizes v6.9 version parameters across package.json, AboutModal and page.tsx', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
      expect(pkg.version).toBe(EXPECTED_APP_VERSION);

      const aboutModal = fs.readFileSync(path.join(SRC, 'components/AboutModal.tsx'), 'utf8');
      expect(aboutModal).toContain(EXPECTED_APP_VERSION);
      expect(aboutModal).toContain(EXPECTED_BUILD_NUMBER);
      expect(aboutModal).toContain(EXPECTED_ARCH_VERSION);

      const pageCode = fs.readFileSync(path.join(SRC, 'app/page.tsx'), 'utf8');
      expect(pageCode).toContain(`v${EXPECTED_APP_VERSION} (${EXPECTED_BUILD_NUMBER})`);
    });
  });

  describe('2. Filename & Profile Dual-Entity Extraction', () => {
    it('correctly extracts Harmony as Primary Filer and Ivan as Spouse from joint tax return filenames', () => {
      const jointFiles = [
        '2024_Tax_Return_Harmony_Ivan.pdf',
        'Filing_2025_Harmony_and_Ivan_Wong.pdf',
        'Form_1040_2024_Ivan_Wong_Harmony_Wong.pdf',
      ];

      for (const fileName of jointFiles) {
        const result = extractTaxpayersFromFilename(fileName, null);
        expect(result.isJoint).toBe(true);
        expect(result.primaryName).toContain('Harmony');
        expect(result.spouseName).toContain('Ivan');
        // Ivan must never be called "Spouse"
        expect(result.spouseName.toLowerCase()).not.toBe('spouse');
        // Harmony must never be named "Harmony & Ivan" when referring to her individually
        expect(result.primaryName).not.toContain('&');
        expect(result.primaryName).not.toContain('and');
      }
    });

    it('resolves live taxpayer profile with isolated spousal identities and distinct age milestones', () => {
      const profile = resolveLiveTaxpayerProfile(null, undefined, '2024_Tax_Return_Harmony_Ivan.pdf');
      expect(profile.primaryTaxpayer.name).toBe('Harmony');
      expect(profile.spouseTaxpayer?.name).toBe('Ivan');

      // Primary filer (Harmony) age and Medicare milestones
      expect(profile.primaryTaxpayer.currentAge2026).toBe(64);
      expect(profile.primaryTaxpayer.medicareAge65Year).toBe(2027);
      expect(profile.primaryTaxpayer.fraAge67Year).toBe(2029);

      // Spouse filer (Ivan) age and Medicare milestones
      expect(profile.spouseTaxpayer?.currentAge2026).toBe(62);
      expect(profile.spouseTaxpayer?.medicareAge65Year).toBe(2029);
      expect(profile.spouseTaxpayer?.fraAge67Year).toBe(2031);

      // Spousal employment status
      expect(profile.primaryTaxpayer.isEmployed).toBe(false);
      expect(profile.spouseTaxpayer?.isEmployed).toBe(true);
      expect(profile.spouseTaxpayer?.employerName).toBe('ViaPath Technologies inc.');
      expect(profile.spouseTaxpayer?.hasEmployerGroupHealth).toBe(true);
    });
  });

  describe('3. Medicare & Health Plan Spousal Isolation', () => {
    it('renders distinct entity headers with actual names instead of generic "Spouse" or compound labels', () => {
      expect(medicareCardCode).toContain('Primary Filer ({older.name})');
      expect(medicareCardCode).toContain('Spouse ({younger.name})');
      expect(medicareCardCode).not.toContain('Primary Filer (Harmony & Ivan)');
    });
  });

  describe('4. Lifecycle Timeline Individual Milestones', () => {
    it('generates distinct individual milestone entities for Harmony and Ivan and joint filings', () => {
      const profile = resolveLiveTaxpayerProfile(null, undefined, '2025_Tax_Return_Harmony_Ivan.pdf');
      const sampleReturn = generateSyntheticTaxReturnForYear(2025, '2025_Tax_Return_Harmony_Ivan.pdf', 3000000, profile);
      const pkg = computeLifecyclePlanningPackage(sampleReturn);
      const milestones = pkg.timeline;

      const harmonyMilestones = milestones.filter((m) => m.taxpayerName?.includes('Harmony'));
      const ivanMilestones = milestones.filter((m) => m.taxpayerName?.includes('Ivan'));

      expect(harmonyMilestones.length).toBeGreaterThan(0);
      expect(ivanMilestones.length).toBeGreaterThan(0);

      // Verify no generic "Spouse" in milestone taxpayer names
      for (const m of milestones) {
        expect(m.taxpayerName).not.toBe('Spouse');
      }

      // Verify TaxLifecycleTimeline renders taxpayerName without truncation
      expect(timelineCardCode).toContain('{m.taxpayerName}');
    });
  });

  describe('5. RMD & Roth Conversion Entity Labels', () => {
    it('wires taxpayerLabels into RmdRothConversionCard in TaxExpertView', () => {
      expect(taxExpertViewCode).toContain('taxpayerLabels={{');
      expect(taxExpertViewCode).toContain('older: lifePlan.medicare.olderSpouse.name');
      expect(taxExpertViewCode).toContain('younger: lifePlan.medicare.youngerSpouse.name');

      expect(rmdCardCode).toContain("older || 'Harmony'");
      expect(rmdCardCode).toContain("younger || 'Ivan'");
    });
  });
});
