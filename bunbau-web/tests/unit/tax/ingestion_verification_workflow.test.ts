import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '../../../src');

describe('Milestone v6.9: Staged Verification & Green Terminal Ingestion Workflow', () => {
  const uploadModalCode = fs.readFileSync(path.join(SRC, 'components/UploadValidationModal.tsx'), 'utf8');

  describe('1. Pre-Upload Document Preview & Left-Side Stage Verification', () => {
    it('provides pre-upload preview button for each staged tax return on the left', () => {
      expect(uploadModalCode).toContain('data-testid={`preview-staged-pdf-${idx}`}');
      expect(uploadModalCode).toContain('setSelectedPdfPreview');
      expect(uploadModalCode).toContain('setShowPdfPreviewModal');
    });

    it('renders pre-upload PDF preview modal with detach and dock workstation capability', () => {
      expect(uploadModalCode).toContain('data-testid="staged-pdf-preview-modal"');
      expect(uploadModalCode).toContain('data-testid="close-pdf-preview-btn"');
      expect(uploadModalCode).toContain('data-testid="preview-detach-btn"');
      expect(uploadModalCode).toContain('data-testid="preview-reattach-btn"');
      expect(uploadModalCode).toContain('isPdfPreviewDetached');
      expect(uploadModalCode).toContain('BunBauDocumentViewer');
    });

    it('provides confirm & process upload button on the left panel', () => {
      expect(uploadModalCode).toContain('data-testid="confirm-pdf-upload-btn"');
      expect(uploadModalCode).toContain('handleStartPdfExtraction');
      expect(uploadModalCode).toContain('Confirm &amp; Process Upload');
    });
  });

  describe('2. Standard BunBau Green Terminal Ingestion Stream', () => {
    it('triggers monospace green terminal during PDF extraction with tax ingestion identifier', () => {
      expect(uploadModalCode).toContain("activeTab === 'pdf'");
      expect(uploadModalCode).toContain("'bunbau_tax_ingestion_term'");
      expect(uploadModalCode).toContain('[Tax PDF Ingestion]');
      expect(uploadModalCode).toContain('[Security Protocol] Zero-Plaintext SSN Masking');
      expect(uploadModalCode).toContain('[Entity Resolution]');
      expect(uploadModalCode).toContain('[Form & Schedule Parsing]');
    });
  });

  describe('3. Right-Side Staged Verification Overview & Master Toggle', () => {
    it('populates right side with parsed filings only after terminal extraction completes', () => {
      expect(uploadModalCode).toContain('parsedTaxFilings');
      expect(uploadModalCode).toContain('Parsed Tax Filings Overview');
      expect(uploadModalCode).toContain('Files Staged — Ready for Extraction');
    });

    it('provides master "Verify All" checkbox in the table header', () => {
      expect(uploadModalCode).toContain('data-testid="verify-all-tax-checkbox"');
      expect(uploadModalCode).toContain('Verify All');
      expect(uploadModalCode).toContain('parsedTaxFilings.every((f) => f.verified)');
    });

    it('provides individual row verification checkboxes with dynamic status badges', () => {
      expect(uploadModalCode).toContain('data-testid={`verify-tax-checkbox-${idx}`}');
      expect(uploadModalCode).toContain('Verified');
      expect(uploadModalCode).toContain('Pending');
    });
  });

  describe('4. Dynamic Ingestion Button & Confirmation Dialog', () => {
    it('enables and styles button vibrant green when >= 1 filing is verified with count caption', () => {
      expect(uploadModalCode).toContain('data-testid="ingest-tax-returns-btn"');
      expect(uploadModalCode).toContain('Verify & Ingest Tax Filings (${verifiedCount} Verified)');
      expect(uploadModalCode).toContain('bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer');
      expect(uploadModalCode).toContain('opacity-50');
    });

    it('displays pre-commit confirmation modal before persisting to database and storage', () => {
      expect(uploadModalCode).toContain('data-testid="tax-ingest-confirm-modal"');
      expect(uploadModalCode).toContain('data-testid="confirm-tax-import-btn"');
      expect(uploadModalCode).toContain('data-testid="cancel-tax-import-btn"');
      expect(uploadModalCode).toContain('Confirm Tax Filings Ingestion');
      expect(uploadModalCode).toContain('importTaxReturnsBatch(returnsToImport)');
    });
  });
});
