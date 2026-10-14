import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DEMO_TAX_RETURN_2024, DEMO_TAX_RETURN_2025 } from '../../../src/lib/tax/seedData';
import { computeLongitudinalTaxAnalysis } from '../../../src/lib/tax/longitudinalEngine';

const SRC = path.resolve(__dirname, '../../../src');

describe('Milestone v6.9: Advanced PDF Viewer Player UX & Multi-Year Audit Deep Linking', () => {
  const viewerCode = fs.readFileSync(path.join(SRC, 'components/tax/BunBauDocumentViewer.tsx'), 'utf8');

  describe('1. Contained Viewport & Virtualized Scrolling UX', () => {
    it('enforces contained fixed height to prevent endless scroll fatigue', () => {
      // Fixed contained height h-[800px] or max-h-[85vh]
      expect(viewerCode).toContain('h-[800px]');
      expect(viewerCode).toContain('overflow-y-auto');
      expect(viewerCode).toContain('scrollContainerRef');
    });

    it('implements Table of Contents (TOC) sidebar open by default on the left', () => {
      expect(viewerCode).toContain('const [isTocOpen, setIsTocOpen] = useState(true);');
      expect(viewerCode).toContain('data-testid="viewer-toc-sidebar"');
      expect(viewerCode).toContain('data-testid="viewer-toc-toggle"');
      expect(viewerCode).toContain('Table of Contents');
      expect(viewerCode).toContain('comprehensiveToc');
    });
  });

  describe('2. In-Viewer Keyword Search & Direct Page Jump Navigation', () => {
    it('provides in-viewer keyword search with search input and live filtering', () => {
      expect(viewerCode).toContain('data-testid="viewer-keyword-search"');
      expect(viewerCode).toContain('searchQuery');
      expect(viewerCode).toContain('Search Form 540, 8582, line...');
    });

    it('provides jump-to-page input allowing typing specific page numbers to jump directly', () => {
      expect(viewerCode).toContain('data-testid="viewer-page-input"');
      expect(viewerCode).toContain('handlePageInputSubmit');
      expect(viewerCode).toContain('jumpToPage');
    });
  });

  describe('3. Standard Accessibility Toolbar & Detach Workstation Option', () => {
    it('integrates AccessibilityZoomBar with canonical zoom controls', () => {
      expect(viewerCode).toContain('AccessibilityZoomBar');
      expect(viewerCode).toContain('scale={scale}');
      expect(viewerCode).toContain('onZoomIn=');
      expect(viewerCode).toContain('onZoomOut=');
      expect(viewerCode).toContain('onReset=');
    });

    it('provides Print, Download, and Document Info metadata modal options', () => {
      expect(viewerCode).toContain('data-testid="viewer-print-btn"');
      expect(viewerCode).toContain('data-testid="viewer-download-btn"');
      expect(viewerCode).toContain('data-testid="viewer-info-btn"');
      expect(viewerCode).toContain('data-testid="viewer-info-modal"');
      expect(viewerCode).toContain('window.print()');
    });

    it('provides Detach option for unconstrained full-viewport workstation view with re-attach controls', () => {
      expect(viewerCode).toContain('data-testid="viewer-detach-btn"');
      expect(viewerCode).toContain('data-testid="viewer-reattach-btn"');
      expect(viewerCode).toContain('isDetached');
      expect(viewerCode).toContain('fixed inset-0 z-50');
    });
  });

  describe('4. Multi-Year Audit Deep Link Precision (California Form 540)', () => {
    it('accurately deep links California State Tax to Form 540 Line 48 without jumping to Schedule E Part II', () => {
      const result = computeLongitudinalTaxAnalysis([DEMO_TAX_RETURN_2024, DEMO_TAX_RETURN_2025]);
      const caTaxItem = result.lineItemMatrix.find((i) => i.key === 'california_tax');

      expect(caTaxItem).toBeDefined();
      expect(caTaxItem?.formRef).toBe('CA Form 540, Line 48');
      expect(caTaxItem?.formLine).toBe('Line 48');

      // Verify accurate page mapping targeting CA Form 540 (canonical page 32)
      expect(caTaxItem?.sourceDocPage2024).toBe(32);
      expect(caTaxItem?.sourceDocPage2025).toBe(32);

      // Verify that neither targets Schedule E Part II (p. 16 or 25)
      expect(caTaxItem?.sourceDocPage2024).not.toBe(16);
      expect(caTaxItem?.sourceDocPage2024).not.toBe(25);
      expect(caTaxItem?.sourceDocPage2025).not.toBe(16);
      expect(caTaxItem?.sourceDocPage2025).not.toBe(25);
    });

    it('indexes California Form 540 in seed return bookmarks pointing to canonical page 32', () => {
      expect(DEMO_TAX_RETURN_2024.pdfDocumentMetadata.pageBookmarks?.ca_form_540).toBe(32);
      expect(DEMO_TAX_RETURN_2025.pdfDocumentMetadata.pageBookmarks?.ca_form_540).toBe(32);
    });
  });
});
