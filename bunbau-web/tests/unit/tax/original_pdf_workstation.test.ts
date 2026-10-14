import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '../../../src');

describe('Milestone v7.2: Dedicated Original Uploaded PDF Workstation Option', () => {
  const singleViewerCode = fs.readFileSync(path.join(SRC, 'components/tax/TaxSingleFormViewer.tsx'), 'utf8');
  const longitudinalCardCode = fs.readFileSync(path.join(SRC, 'components/tax/LongitudinalComparisonCard.tsx'), 'utf8');
  const originalPdfModalCode = fs.readFileSync(path.join(SRC, 'components/tax/OriginalTaxPdfViewerModal.tsx'), 'utf8');
  const taxExpertViewCode = fs.readFileSync(path.join(SRC, 'components/tax/TaxExpertView.tsx'), 'utf8');

  it('1. Provides "View Original Uploaded PDF" in TaxSingleFormViewer.tsx', () => {
    expect(singleViewerCode).toContain('data-testid="view-original-uploaded-pdf-btn"');
    expect(singleViewerCode).toContain('onOpenOriginalPdf');
    expect(singleViewerCode).toContain('View Original Uploaded PDF');
  });

  it('2. Provides "View Original 2025 Return PDF (Full Report)" in LongitudinalComparisonCard modal', () => {
    expect(longitudinalCardCode).toContain('data-testid="view-original-pdf-btn"');
    expect(longitudinalCardCode).toContain('onOpenOriginalPdf');
    expect(longitudinalCardCode).toContain('View Original 2025 Return PDF (Full Report)');
  });

  it('3. Provides Original PDF Workstation Launcher in TaxExpertView Workspace 4 toolbar', () => {
    expect(taxExpertViewCode).toContain('data-testid="vault-open-original-pdf-btn"');
    expect(taxExpertViewCode).toContain('handleOpenOriginalPdf');
    expect(taxExpertViewCode).toContain('<OriginalTaxPdfViewerModal');
  });

  it('4. Provides full interactive features in OriginalTaxPdfViewerModal.tsx', () => {
    expect(originalPdfModalCode).toContain('data-testid="original-tax-pdf-viewer-modal"');
    expect(originalPdfModalCode).toContain('data-testid="pdf-modal-download-btn"');
    expect(originalPdfModalCode).toContain('data-testid="pdf-modal-print-btn"');
    expect(originalPdfModalCode).toContain('data-testid="pdf-modal-detach-btn"');
    expect(originalPdfModalCode).toContain('data-testid="pdf-modal-close-btn"');
    expect(originalPdfModalCode).toContain('data-testid="pdf-page-jump-input"');
    expect(originalPdfModalCode).toContain('data-testid="pdf-modal-info-btn"');
    expect(originalPdfModalCode).toContain('AccessibilityZoomBar');
  });

  it('5. Enforces detached full-screen portal break-out (z-[100] and createPortal to document.body)', () => {
    expect(originalPdfModalCode).toContain('createPortal(modalContent, document.body)');
    expect(originalPdfModalCode).toContain('z-[100]');
    expect(originalPdfModalCode).toContain('w-screen h-screen');
  });
});
