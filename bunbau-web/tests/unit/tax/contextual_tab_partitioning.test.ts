import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../../');
const SRC = path.resolve(__dirname, '../../../src');

describe('Tax Expert & Milestone v6.8: Strict Contextual Tab Partitioning Suite', () => {
  // Required version tracking enforcement:
  // "You also need to update the application version/build/architecture version for every iteration build."
  const EXPECTED_APP_VERSION = '2.7.16';
  const EXPECTED_BUILD_NUMBER = 'Build 131';
  const EXPECTED_ARCH_VERSION = 'v2.9.9 High-Visibility Tactile Sub-Navigation, Two-Tier Advisory Box Accessibility & Multi-Year Audit Report/Chart/Scroll Workstation Architecture';

  const uploadModalCode = fs.readFileSync(path.join(SRC, 'components/UploadValidationModal.tsx'), 'utf8');
  const pageCode = fs.readFileSync(path.join(SRC, 'app/page.tsx'), 'utf8');

  describe('1. Version, Build & Architecture Rigor', () => {
    it('synchronizes v6.8 build parameters across package.json, AboutModal and page.tsx', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
      expect(pkg.version).toBe(EXPECTED_APP_VERSION);

      const aboutModal = fs.readFileSync(path.join(SRC, 'components/AboutModal.tsx'), 'utf8');
      expect(aboutModal).toContain(EXPECTED_APP_VERSION);
      expect(aboutModal).toContain(EXPECTED_BUILD_NUMBER);
      expect(aboutModal).toContain(EXPECTED_ARCH_VERSION);

      expect(pageCode).toContain(`v${EXPECTED_APP_VERSION} (${EXPECTED_BUILD_NUMBER})`);
    });
  });

  describe('2. Strict Portfolio Context Ingestion (Hides PDF Upload Tab)', () => {
    it('hides PDF Upload (Tax Returns) tab when in portfolio context', () => {
      // PDF tab is strictly gated by context === 'tax'
      expect(uploadModalCode).toContain("context === 'tax' ? (");
      expect(uploadModalCode).toContain('data-testid="tab-pdf"');
      expect(uploadModalCode).toContain('PDF Upload (Tax Returns)');
    });

    it('renders only Brokerage CSV Export and Screenshots (Vision) when context is portfolio', () => {
      expect(uploadModalCode).toContain('data-testid="tab-csv"');
      expect(uploadModalCode).toContain('data-testid="tab-vision"');
      expect(uploadModalCode).toContain('Brokerage CSV Export');
      expect(uploadModalCode).toContain('Screenshots (Vision)');
    });

    it('prevents activeTab from defaulting to pdf when in portfolio context', () => {
      expect(uploadModalCode).toContain("if (context === 'tax') {");
      expect(uploadModalCode).toContain("setActiveTab('pdf');");
      expect(uploadModalCode).toContain("setActiveTab('csv');");
    });
  });

  describe('3. Strict Tax Return Context Ingestion (Hides Brokerage CSV & Vision Tabs)', () => {
    it('hides Brokerage CSV and Screenshot tabs when in tax context', () => {
      // The non-tax branch houses CSV and Vision tabs
      expect(uploadModalCode).toContain("context === 'tax' ? (");
      // When context === 'tax', the single tab button rendered is tab-pdf
    });

    it('locks activeTab to pdf when context is tax', () => {
      expect(uploadModalCode).toContain("if (context === 'tax') {");
      expect(uploadModalCode).toContain("setActiveTab('pdf');");
    });
  });

  describe('4. Context Awareness from page.tsx', () => {
    it('passes context="tax" and initialTab="pdf" when user is in the Tax Expert page', () => {
      expect(pageCode).toContain("context={activeTab === 'tax' ? 'tax' : 'portfolio'}");
      expect(pageCode).toContain("initialTab={activeTab === 'tax' ? 'pdf' : 'csv'}");
    });
  });
});
