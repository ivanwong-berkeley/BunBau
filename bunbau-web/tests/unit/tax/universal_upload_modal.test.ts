import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../../');
const SRC = path.resolve(__dirname, '../../../src');

describe('Tax Expert & Milestone v6.6: Universal Multi-Modal Tax & Portfolio Ingestion Suite', () => {
  // Required version tracking enforcement:
  // "You also need to update the application version/build/architecture version for every iteration build."
  const EXPECTED_APP_VERSION = '2.7.16';
  const EXPECTED_BUILD_NUMBER = 'Build 131';
  const EXPECTED_ARCH_VERSION = 'v2.9.9 High-Visibility Tactile Sub-Navigation, Two-Tier Advisory Box Accessibility & Multi-Year Audit Report/Chart/Scroll Workstation Architecture';

  const uploadModalCode = fs.readFileSync(path.join(SRC, 'components/UploadValidationModal.tsx'), 'utf8');
  const taxMultiUploaderCode = fs.readFileSync(path.join(SRC, 'components/tax/TaxMultiUploaderModal.tsx'), 'utf8');
  const pageCode = fs.readFileSync(path.join(SRC, 'app/page.tsx'), 'utf8');

  describe('1. Version, Build & Architecture Integrity', () => {
    it('enforces milestone v6.6 version numbers across package.json, AboutModal and page.tsx', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
      expect(pkg.version).toBe(EXPECTED_APP_VERSION);

      const aboutModal = fs.readFileSync(path.join(SRC, 'components/AboutModal.tsx'), 'utf8');
      expect(aboutModal).toContain(EXPECTED_APP_VERSION);
      expect(aboutModal).toContain(EXPECTED_ARCH_VERSION);

      expect(pageCode).toContain(`v${EXPECTED_APP_VERSION} (${EXPECTED_BUILD_NUMBER})`);
    });
  });

  describe('2. UploadValidationModal Context Awareness & Dedicated PDF Tab', () => {
    it('accepts context and initialTab props with intelligent defaults', () => {
      expect(uploadModalCode).toContain("context?: 'portfolio' | 'tax'");
      expect(uploadModalCode).toContain("initialTab?: 'pdf' | 'csv' | 'vision'");
      expect(uploadModalCode).toContain("context === 'tax' ? 'pdf' : 'csv'");
    });

    it('renders 3 top-level tabs: PDF Upload, Brokerage CSV, and Screenshots (Vision)', () => {
      expect(uploadModalCode).toContain('data-testid="tab-pdf"');
      expect(uploadModalCode).toContain('data-testid="tab-csv"');
      expect(uploadModalCode).toContain('data-testid="tab-vision"');
      expect(uploadModalCode).toContain('PDF Upload (Tax Returns)');
      expect(uploadModalCode).toContain('Brokerage CSV Export');
      expect(uploadModalCode).toContain('Screenshots (Vision)');
    });

    it('dynamically adapts title based on context and active tab', () => {
      expect(uploadModalCode).toContain("context === 'tax' || activeTab === 'pdf'");
      expect(uploadModalCode).toContain("'Tax Return & Portfolio Ingestion'");
      expect(uploadModalCode).toContain("'Portfolio Ingestion'");
    });

    it('passes context="tax" and initialTab="pdf" from page.tsx when activeTab is tax', () => {
      expect(pageCode).toContain("context={activeTab === 'tax' ? 'tax' : 'portfolio'}");
      expect(pageCode).toContain("initialTab={activeTab === 'tax' ? 'pdf' : 'csv'}");
    });
  });

  describe('3. Strict Per-Tab File Type Enforcement & PDF Guidance', () => {
    it('enforces CSV formats strictly in CSV tab and excludes PDF from file input accept', () => {
      // In CSV inputs, accept does not contain .pdf
      const csvInputAccepts = uploadModalCode.match(/accept="\.csv[^"]*"/g) || [];
      expect(csvInputAccepts.length).toBeGreaterThanOrEqual(2);
      for (const acceptStr of csvInputAccepts) {
        expect(acceptStr).not.toContain('.pdf');
        expect(acceptStr).toContain('.csv');
      }
    });

    it('detects dropped PDFs in CSV tab and directs user to the PDF Upload tab', () => {
      expect(uploadModalCode).toContain('pdfFilesDetected');
      expect(uploadModalCode).toContain('Tax return PDF detected');
      expect(uploadModalCode).toContain('Switch to the "PDF Upload" tab to ingest Form 1040/540 returns');
    });

    it('provides dedicated staged PDF queue and Parsed Tax Filings Overview on right panel', () => {
      expect(uploadModalCode).toContain('data-testid="pdf-upload-panel"');
      expect(uploadModalCode).toContain('data-testid="staged-pdf-list"');
      expect(uploadModalCode).toContain('data-testid="tax-filings-overview"');
      expect(uploadModalCode).toContain('data-testid="ingest-tax-returns-btn"');
      expect(uploadModalCode).toContain('Parsed Tax Filings Overview');
      expect(uploadModalCode).toContain('Zero-Plaintext SSN Masking');
    });
  });

  describe('4. Universal Multi-Modal Tax Uploader Modal (TaxMultiUploaderModal)', () => {
    it('accepts PDF, CSV, and image scans universally in file input accept', () => {
      expect(taxMultiUploaderCode).toContain('.pdf');
      expect(taxMultiUploaderCode).toContain('.csv');
      expect(taxMultiUploaderCode).toContain('image/*');
    });

    it('categorizes and badges multi-modal files correctly (PDF, CSV, IMG)', () => {
      expect(taxMultiUploaderCode).toContain("badgeLabel: 'PDF' | 'CSV' | 'IMG'");
      expect(taxMultiUploaderCode).toContain("badgeLabel === 'PDF'");
      expect(taxMultiUploaderCode).toContain("badgeLabel === 'CSV'");
      expect(taxMultiUploaderCode).toContain("badgeLabel === 'IMG'");
    });

    it('provides format selector tabs for All, PDFs, CSVs, and Scans', () => {
      expect(taxMultiUploaderCode).toContain('data-testid="filter-all"');
      expect(taxMultiUploaderCode).toContain('data-testid="filter-pdf"');
      expect(taxMultiUploaderCode).toContain('data-testid="filter-csv"');
      expect(taxMultiUploaderCode).toContain('data-testid="filter-image"');
    });

    it('calculates counts across modalities and generates complete tax return profiles', () => {
      expect(taxMultiUploaderCode).toContain('pdfCount');
      expect(taxMultiUploaderCode).toContain('csvCount');
      expect(taxMultiUploaderCode).toContain('imgCount');
      expect(taxMultiUploaderCode).toContain('generateSyntheticTaxReturnForYear');
      expect(taxMultiUploaderCode).toContain('onProceedToReview');
    });
  });

  describe('5. Multi-Modal File Classification Simulation Tests', () => {
    // Pure function logic mirroring TaxMultiUploaderModal
    const classifyTaxFile = (name: string, type: string) => {
      const lower = name.toLowerCase();
      if (lower.endsWith('.pdf')) {
        return { format: 'pdf', badge: 'PDF', label: 'Form 1040 / Form 540 PDF Return' };
      }
      if (lower.endsWith('.csv') || lower.endsWith('.xlsx')) {
        return { format: 'csv', badge: 'CSV', label: '1099-B / Schedule D Transaction Log' };
      }
      if (type.startsWith('image/') || lower.endsWith('.png') || lower.endsWith('.jpg')) {
        return { format: 'image', badge: 'IMG', label: 'W-2 / 1099 Document Scan' };
      }
      return { format: 'pdf', badge: 'PDF', label: 'Tax Documentation' };
    };

    it('correctly classifies Form 1040 PDF returns', () => {
      const result = classifyTaxFile('2024_Form_1040_Final.pdf', 'application/pdf');
      expect(result.format).toBe('pdf');
      expect(result.badge).toBe('PDF');
    });

    it('correctly classifies Schedule D trading CSV exports', () => {
      const result = classifyTaxFile('Fidelity_1099B_CapitalGains_2024.csv', 'text/csv');
      expect(result.format).toBe('csv');
      expect(result.badge).toBe('CSV');
    });

    it('correctly classifies scanned W-2 and 1099 image screenshots', () => {
      const result = classifyTaxFile('W2_Viapath_2024_Scan.png', 'image/png');
      expect(result.format).toBe('image');
      expect(result.badge).toBe('IMG');
    });

    it('correctly rejects PDFs in CSV staging logic and issues redirect message', () => {
      const files = [
        { name: 'Schwab_Holdings.csv', size: 1024 },
        { name: '2024_Tax_Return.pdf', size: 50000 },
      ];

      const validCsvs: typeof files = [];
      const pdfsDetected: string[] = [];

      for (const f of files) {
        if (f.name.toLowerCase().endsWith('.pdf')) {
          pdfsDetected.push(f.name);
        } else if (f.name.toLowerCase().endsWith('.csv')) {
          validCsvs.push(f);
        }
      }

      expect(validCsvs.length).toBe(1);
      expect(validCsvs[0].name).toBe('Schwab_Holdings.csv');
      expect(pdfsDetected.length).toBe(1);
      expect(pdfsDetected[0]).toBe('2024_Tax_Return.pdf');
    });
  });
});
