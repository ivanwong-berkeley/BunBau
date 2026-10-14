import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '../../../src');

describe('Milestone v7.0: Portal-Based Detach Workstation & Streamlined PDF Player UX', () => {
  const viewerCode = fs.readFileSync(path.join(SRC, 'components/tax/BunBauDocumentViewer.tsx'), 'utf8');

  describe('1. Portal Detachment & Zero Left-Menu Overlap', () => {
    it('uses React createPortal to mount detached viewer directly to document.body', () => {
      expect(viewerCode).toContain("import { createPortal } from 'react-dom';");
      expect(viewerCode).toContain('createPortal(viewerElement, document.body)');
    });

    it('enforces z-[100] and full display dimensions (w-screen h-screen) in detached mode', () => {
      expect(viewerCode).toContain('fixed inset-0 z-[100] rounded-none w-screen h-screen overflow-hidden');
    });

    it('provides uniform detached workstation top banner matching ingestion workflow', () => {
      expect(viewerCode).toContain('Tax Document Workstation:');
      expect(viewerCode).toContain('data-testid="viewer-reattach-btn"');
      expect(viewerCode).toContain('data-testid="viewer-open-window-btn"');
      expect(viewerCode).toContain('Full-Screen Multi-Year Audit &amp; Line-Item Examination Workstation');
    });

    it('renders a clean placeholder in page flow when detached', () => {
      expect(viewerCode).toContain('data-testid="viewer-detached-placeholder"');
      expect(viewerCode).toContain('data-testid="viewer-dock-back-btn"');
    });
  });

  describe('2. Streamlined Toolbar & Uncrushed Keyword Search Box', () => {
    it('replaces wide multi-year button rows with compact year selector to prevent toolbar explosion', () => {
      expect(viewerCode).toContain('data-testid="viewer-year-select"');
      expect(viewerCode).toContain('<select');
      expect(viewerCode).toContain('onSelectYear(Number(e.target.value))');
    });

    it('allocates uncrushed flex container (min-w-[200px] max-w-sm flex-1) for keyword search', () => {
      expect(viewerCode).toContain('flex-1 min-w-[200px] max-w-sm relative mx-2');
      expect(viewerCode).toContain('data-testid="viewer-keyword-search"');
      expect(viewerCode).toContain('Search Form 540, 8582, line...');
    });

    it('preserves all canonical player controls (TOC toggle, Jump to Page, AccessibilityZoomBar, Print, Download, Info)', () => {
      expect(viewerCode).toContain('data-testid="viewer-toc-toggle"');
      expect(viewerCode).toContain('data-testid="viewer-page-input"');
      expect(viewerCode).toContain('AccessibilityZoomBar');
      expect(viewerCode).toContain('data-testid="viewer-print-btn"');
      expect(viewerCode).toContain('data-testid="viewer-download-btn"');
      expect(viewerCode).toContain('data-testid="viewer-info-btn"');
      expect(viewerCode).toContain('data-testid="viewer-detach-btn"');
    });
  });
});
