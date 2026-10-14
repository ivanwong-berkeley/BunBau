import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { extractTaxpayerNameFromFilename, resolveLiveTaxpayerProfile } from '../../../src/lib/tax/taxProfileHelper';
import { computeLongitudinalTaxAnalysis } from '../../../src/lib/tax/longitudinalEngine';
import { DEMO_TAX_RETURN_2024, DEMO_TAX_RETURN_2025 } from '../../../src/lib/tax/seedData';

const ROOT = path.resolve(__dirname, '../../../');
const SRC = path.resolve(__dirname, '../../../src');

describe('Milestone v6.7: Granular Multi-Tenant Tax Data Partitioning, Line-Item Inspector & Contextual Danger Zone', () => {
  // Required version tracking enforcement:
  // "You also need to update the application version/build/architecture version for every iteration build."
  const EXPECTED_APP_VERSION = '2.7.16';
  const EXPECTED_BUILD_NUMBER = 'Build 131';
  const EXPECTED_ARCH_VERSION = 'v2.9.9 High-Visibility Tactile Sub-Navigation, Two-Tier Advisory Box Accessibility & Multi-Year Audit Report/Chart/Scroll Workstation Architecture';

  const strategyCardCode = fs.readFileSync(path.join(SRC, 'components/tax/PortfolioTaxStrategyCard.tsx'), 'utf8');
  const bannerCode = fs.readFileSync(path.join(SRC, 'components/tax/TaxAnomalyBanner.tsx'), 'utf8');
  const longitudinalCardCode = fs.readFileSync(path.join(SRC, 'components/tax/LongitudinalComparisonCard.tsx'), 'utf8');
  const uploadModalCode = fs.readFileSync(path.join(SRC, 'components/UploadValidationModal.tsx'), 'utf8');
  const taxContextCode = fs.readFileSync(path.join(SRC, 'contexts/TaxContext.tsx'), 'utf8');
  const taxExpertViewCode = fs.readFileSync(path.join(SRC, 'components/tax/TaxExpertView.tsx'), 'utf8');

  describe('1. Version, Build & Architecture Rigor', () => {
    it('synchronizes v6.7 build parameters across package.json, AboutModal and page.tsx', () => {
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

  describe('2. Symmetrical 4-Card Strategy System & Deep Linking', () => {
    it('provides symmetrical recommendations matching all top metrics including Suspended Passive Loss', () => {
      // 4 distinct cards
      expect(strategyCardCode).toContain('strategy-options-loss');
      expect(strategyCardCode).toContain('strategy-passive-loss');
      expect(strategyCardCode).toContain('strategy-muni-drag');
      expect(strategyCardCode).toContain('strategy-safe-harbor');

      // Recommendation for Suspended Passive Loss (Form 8582, PIGs, IRC §469(g))
      expect(strategyCardCode).toContain('Suspended Passive Rental Loss Offset &amp; Monetization (Form 8582)');
      expect(strategyCardCode).toContain('IRC §469(g)');
      expect(strategyCardCode).toContain('Passive Income Generators (PIGs)');

      // Recommendation for Safe Harbor Prepayment & W-4 Calibration
      expect(strategyCardCode).toContain('Federal Safe Harbor Prepayment &amp; W-2 Withholding Calibration');
      expect(strategyCardCode).toContain('110% of prior year total tax');
      expect(strategyCardCode).toContain('W-4 Line 4(c)');
    });

    it('implements color-matched styling matching top metrics and highlightedCardId scrolling', () => {
      // Emerald, Purple, Amber, Blue color coordination matching top metrics
      expect(strategyCardCode).toContain('emerald');
      expect(strategyCardCode).toContain('purple');
      expect(strategyCardCode).toContain('amber');
      expect(strategyCardCode).toContain('blue');

      // Scroll into view & pulsing highlight badge
      expect(strategyCardCode).toContain('scrollIntoView');
      expect(strategyCardCode).toContain('Target Action');
      expect(strategyCardCode).toContain('highlightedCardId');
    });

    it('wires TaxAnomalyBanner to dispatch specific strategy card IDs', () => {
      expect(bannerCode).toContain("targetCardId: 'strategy-passive-loss'");
      expect(bannerCode).toContain("targetCardId: 'strategy-options-loss'");
      expect(bannerCode).toContain("targetCardId: 'strategy-safe-harbor'");
      expect(bannerCode).toContain("targetCardId: 'lifecycle-irmaa'");
      expect(bannerCode).toContain('onNavigateToTab(target.tab, target.targetCardId)');
    });

    it('connects TaxExpertView to receive targetCardId and pass highlightedStrategyCard into strategy card', () => {
      expect(taxExpertViewCode).toContain('highlightedStrategyCard');
      expect(taxExpertViewCode).toContain('setHighlightedStrategyCard(targetCardId);');
      expect(taxExpertViewCode).toContain('highlightedCardId={highlightedStrategyCard}');
    });
  });

  describe('3. Multi-Year Line Item Card Inspector & PDF Deep Linking', () => {
    it('populates impactInsight, IRS form lines, and document page numbers in longitudinal comparison engine', () => {
      const result = computeLongitudinalTaxAnalysis([DEMO_TAX_RETURN_2024, DEMO_TAX_RETURN_2025]);
      expect(result.lineItemMatrix.length).toBeGreaterThanOrEqual(16);

      // Verify every row has formLine, pages, and impact insight
      for (const item of result.lineItemMatrix) {
        expect(item.formLine).toBeTruthy();
        expect(typeof item.sourceDocPage2024).toBe('number');
        expect(typeof item.sourceDocPage2025).toBe('number');
        expect(item.impactInsight).toBeTruthy();
      }

      // Check specific IRS line items
      const w2Item = result.lineItemMatrix.find((i) => i.key === 'w2_wages');
      expect(w2Item?.formRef).toBe('Form 1040, Line 1z');
      expect(w2Item?.formLine).toBe('Line 1z');
      expect(w2Item?.sourceDocPage2024).toBe(1);
      expect(w2Item?.sourceDocPage2025).toBe(1);

      const passiveItem = result.lineItemMatrix.find((i) => i.key === 'rental_income');
      expect(passiveItem?.formRef).toBe('Schedule E, Line 26');
      expect(passiveItem?.sourceDocPage2024).toBe(12);
      expect(passiveItem?.sourceDocPage2025).toBe(12);
    });

    it('implements interactive LineItemCardModal and sticky Inspect button without modifying full PDF viewer', () => {
      expect(longitudinalCardCode).toContain('selectedLineItem');
      expect(longitudinalCardCode).toContain('data-testid="line-item-card-modal"');
      expect(longitudinalCardCode).toContain('inspect-btn-');
      expect(longitudinalCardCode).toContain('Tax Analysis &amp; Statutory Impact:');
      expect(longitudinalCardCode).toContain('Historical Progression Matrix');
      expect(longitudinalCardCode).toContain('Source PDF Return Deep-Links');
      expect(longitudinalCardCode).toContain('data-testid="jump-2025-pdf"');
      expect(longitudinalCardCode).toContain('data-testid="jump-2024-pdf"');

      // Full PDF viewer integrity preserved
      expect(taxExpertViewCode).toContain("activeSubTab === 'documents'");
      expect(taxExpertViewCode).toContain('BunBauDocumentViewer');
      expect(longitudinalCardCode).toContain('onOpenDocumentViewer');

      // Table formatting standards: Zero raw <th> tags
      expect(longitudinalCardCode).not.toMatch(/<th[\s>]/);
      expect(longitudinalCardCode).toContain('StaticTh');
    });
  });

  describe('4. Multi-Tenant Data Partitioning & Identity Isolation', () => {
    it('extracts taxpayer names reliably from uploaded filenames', () => {
      expect(extractTaxpayerNameFromFilename('2024_Form_1040_Robert_Chen.pdf')).toBe('Robert Chen');
      expect(extractTaxpayerNameFromFilename('TaxReturn_Sarah_Jenkins_2025.pdf')).toBe('Sarah Jenkins');
      expect(extractTaxpayerNameFromFilename('Form1040_David_Miller_Joint_2024.pdf')).toBe('David Miller');
      expect(extractTaxpayerNameFromFilename('1040_2024.pdf')).toBeNull();
    });

    it('resolves live taxpayer profile eliminating synthetic Taylor names', () => {
      // User with authenticated display name
      const userProfile = resolveLiveTaxpayerProfile(
        { displayName: 'Dr. Evelyn Marcus', email: 'emarcus@stanford.edu' },
        undefined,
        'TaxReturn_2024.pdf'
      );
      expect(userProfile.primaryTaxpayer?.name).toBe('Dr. Evelyn Marcus');
      expect(userProfile.primaryTaxpayer?.name).not.toContain('Taylor');

      // User without display name but filename has name
      const filenameProfile = resolveLiveTaxpayerProfile(
        null,
        undefined,
        '2024_Form_1040_Marcus_Vance.pdf'
      );
      expect(filenameProfile.primaryTaxpayer?.name).toBe('Marcus Vance');
      expect(filenameProfile.primaryTaxpayer?.name).not.toContain('Taylor');

      // Fallback live taxpayer profile
      const defaultProfile = resolveLiveTaxpayerProfile(null);
      expect(defaultProfile.primaryTaxpayer?.name).toBe('Primary Taxpayer');
      expect(defaultProfile.primaryTaxpayer?.name).not.toContain('Taylor');
    });

    it('ensures TaxContext sanitizes live returns to strictly avoid Taylor demo identity', () => {
      expect(taxContextCode).toContain('resolveLiveTaxpayerProfile');
      expect(taxContextCode).toContain('isTaxDemo');
      expect(taxContextCode).toContain('isTaylorPrimary');
    });
  });

  describe('5. Contextual Danger Zone & Upload Modal Delete Safety', () => {
    it('branches trash icon based on context in UploadValidationModal', () => {
      // Trash button title changes based on tax context
      expect(uploadModalCode).toContain("context === 'tax' || activeTab === 'pdf' ? \"Delete Tax History\" : \"Clear Portfolio\"");

      // Opens TaxDeleteModal when in tax context
      expect(uploadModalCode).toContain('showTaxDelete');
      expect(uploadModalCode).toContain('TaxDeleteModal');

      // DeleteDangerZone for portfolio is shielded and only called in non-tax context
      expect(uploadModalCode).toContain("!(context === 'tax' || activeTab === 'pdf') && (");
      expect(uploadModalCode).toContain('DeleteDangerZone');
    });

    it('integrates TaxDeleteModal with clearTaxReturns and deleteTaxReturnYears', () => {
      expect(uploadModalCode).toContain('clearTaxReturns');
      expect(uploadModalCode).toContain('deleteTaxReturnYears');
      expect(uploadModalCode).toContain('onConfirmDelete={async (scope, targetYears) => {');
      expect(uploadModalCode).toContain("if (scope === 'all') {");
      expect(uploadModalCode).toContain('await deleteTaxReturnYears(targetYears);');
    });
  });
});
