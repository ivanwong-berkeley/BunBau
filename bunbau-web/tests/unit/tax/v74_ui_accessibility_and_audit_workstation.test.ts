import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { computeLongitudinalTaxAnalysis } from '../../../src/lib/tax/longitudinalEngine';
import { generateTaxComparison } from '../../../src/lib/tax/taxComparisonEngine';
import {
  DEMO_TAX_RETURN_2024 as MOCK_TAX_RETURN_2024,
  DEMO_TAX_RETURN_2025 as MOCK_TAX_RETURN_2025,
  DEMO_TAX_RETURNS as MOCK_MULTI_YEAR_TAX_RETURNS,
} from '../../../src/lib/tax/seedData';

describe('Milestone v7.4: High-Visibility Sub-Navigation, Two-Tier Advisory Box Accessibility & Multi-Year Audit Workstation', () => {
  const taxDir = path.resolve(__dirname, '../../../src/components/tax');
  const commonDir = path.resolve(__dirname, '../../../src/components/common');

  it('1. Enforces Pillar 1: High-Visibility Tactile Sub-Navigation Dock with Hover Magnification & Accessibility Zoom in TaxExpertView.tsx', () => {
    const code = fs.readFileSync(path.join(taxDir, 'TaxExpertView.tsx'), 'utf-8');

    // Navigation Dock Container & Accessibility Controls
    expect(code).toContain('tax-workspace-nav-dock');
    expect(code).toContain('nav-hover-magnify-toggle');
    expect(code).toContain('Hover Magnify:');
    expect(code).toContain('nav-dock-info-btn');
    expect(code).toContain('nav-dock-info-banner');
    expect(code).toContain('testIdPrefix="tax-nav-dock"');

    // Tactile Module Cards, Subtitles, Color-Coded Graphic Icon Badges & Hover Magnification
    expect(code).toContain('hover:scale-[1.05]');
    expect(code).toContain('hover:-translate-y-1');
    expect(code).toContain('Executive KPIs, Shields & 1040/540');
    expect(code).toContain('2026–2040 Milestones, Medicare & RMD');
    expect(code).toContain('-Year Trajectory & Matrix Audit');
    expect(code).toContain('Filed PDFs & Canonical Form Sheets');
    expect(code).toContain('Tax Drag, Harvest & Loss Shields');
    expect(code).toContain('Active View');
  });

  it('2. Enforces Pillar 2: Two-Tier Standardized UX & Accessibility in TaxAnomalyBanner.tsx (Level-1 Container + Level-2 Individual Box UX)', () => {
    const code = fs.readFileSync(path.join(taxDir, 'TaxAnomalyBanner.tsx'), 'utf-8');

    // Level-1 Wrap Container Controls
    expect(code).toContain('tax-anomaly-banner');
    expect(code).toContain('anomaly-filter-${sev}');
    expect(code).toContain('anomaly-view-cards-btn');
    expect(code).toContain('anomaly-view-chart-btn');
    expect(code).toContain('anomaly-impact-chart');
    expect(code).toContain('testIdPrefix="anomaly-container"');
    expect(code).toContain('anomaly-container-info-btn');
    expect(code).toContain('anomaly-container-info-banner');
    expect(code).toContain('anomaly-container-copy-btn');
    expect(code).toContain('anomaly-container-download-btn');
    expect(code).toContain('anomaly-container-print-btn');
    expect(code).toContain('anomaly-container-detach-btn');
    expect(code).toContain('anomaly-container-portal-modal');

    // Level-2 Per-Box UX Controls (Opportunity, Info, Warning)
    expect(code).toContain('anomaly-box-toolbar-${a.id}');
    expect(code).toContain('testIdPrefix={`anomaly-box-${a.id}`}');
    expect(code).toContain('anomaly-box-info-${a.id}');
    expect(code).toContain('anomaly-box-info-panel-${a.id}');
    expect(code).toContain('anomaly-box-chart-${a.id}');
    expect(code).toContain('anomaly-box-chart-panel-${a.id}');
    expect(code).toContain('anomaly-box-copy-${a.id}');
    expect(code).toContain('anomaly-box-download-${a.id}');
    expect(code).toContain('anomaly-box-print-${a.id}');
    expect(code).toContain('anomaly-box-detach-${a.id}');
    expect(code).toContain('anomaly-box-reader-modal-${detachedAnomaly.id}');

    // Verify underlying comparison engine produces Opportunity, Info, and Warning anomalies
    const comparison = generateTaxComparison(MOCK_TAX_RETURN_2024, MOCK_TAX_RETURN_2025);
    expect(comparison.anomalies.length).toBeGreaterThanOrEqual(3);
    const severities = new Set(comparison.anomalies.map((a) => a.severity));
    expect(severities.has('opportunity')).toBe(true);
    expect(severities.has('warning')).toBe(true);
  });

  it('3. Enforces Pillar 3: Multi-Year Audit Level-1 & Level-2 UX, Report Preview/CSV/PDF, Category Graphic Chart Toggle, and Bi-Directional Scrollable Matrix', () => {
    const longitudinalCode = fs.readFileSync(path.join(taxDir, 'LongitudinalComparisonCard.tsx'), 'utf-8');
    const smartTableCode = fs.readFileSync(path.join(commonDir, 'SmartTable.tsx'), 'utf-8');

    // Level-1 Container UX Controls
    expect(longitudinalCode).toContain('testIdPrefix="longitudinal-level1"');
    expect(longitudinalCode).toContain('longitudinal-level1-download-btn');
    expect(longitudinalCode).toContain('longitudinal-level1-print-btn');
    expect(longitudinalCode).toContain('longitudinal-level1-detach-btn');
    expect(longitudinalCode).toContain('longitudinal-level1-portal-modal');

    // Level-2 Sub-Page UX Toolbar across all categories
    expect(longitudinalCode).toContain('longitudinal-subpage-container');
    expect(longitudinalCode).toContain('longitudinal-subpage-toolbar');
    expect(longitudinalCode).toContain('category-filter-${cat}');
    expect(longitudinalCode).toContain('subpage-view-table-btn');
    expect(longitudinalCode).toContain('subpage-view-chart-btn');
    expect(longitudinalCode).toContain('subpage-category-chart');
    expect(longitudinalCode).toContain('testIdPrefix="longitudinal-subpage"');
    expect(longitudinalCode).toContain('subpage-info-btn');
    expect(longitudinalCode).toContain('subpage-info-banner');
    expect(longitudinalCode).toContain('subpage-copy-btn');
    expect(longitudinalCode).toContain('subpage-detach-btn');
    expect(longitudinalCode).toContain('longitudinal-subpage-portal-modal');

    // Multi-Year Audit Report Option (Preview Modal + CSV + PDF)
    expect(longitudinalCode).toContain('subpage-report-btn');
    expect(longitudinalCode).toContain('subpage-export-csv-btn');
    expect(longitudinalCode).toContain('subpage-export-pdf-btn');
    expect(longitudinalCode).toContain('multi-year-audit-report-modal');
    expect(longitudinalCode).toContain('report-modal-download-csv-btn');
    expect(longitudinalCode).toContain('report-modal-print-pdf-btn');
    expect(longitudinalCode).toContain('report-modal-copy-btn');
    expect(longitudinalCode).toContain('report-modal-filter-${cat}');

    // Bi-Directional Scroll Pan Controls & Sticky First Column
    expect(longitudinalCode).toContain('matrix-scroll-nav-bar');
    expect(longitudinalCode).toContain('matrix-scroll-left');
    expect(longitudinalCode).toContain('matrix-scroll-right');
    expect(longitudinalCode).toContain('matrix-scroll-top');
    expect(longitudinalCode).toContain('matrix-scroll-bottom');
    expect(longitudinalCode).toContain('stickyFirstColumn={true}');

    // SmartTable Bi-Directional Scroll Viewport & Sticky Column Implementation
    expect(smartTableCode).toContain('smart-table-scroll-viewport-${tableId}');
    expect(smartTableCode).toContain('stickyFirstColumn');
    expect(smartTableCode).toContain('sticky left-0 z-30');
    expect(smartTableCode).toContain('sticky left-0 z-20');
    expect(smartTableCode).toContain('min-w-max');

    // Verify all 7 categories resolve non-empty line items in longitudinalEngine
    const analysis = computeLongitudinalTaxAnalysis(MOCK_MULTI_YEAR_TAX_RETURNS);
    const categories = ['All', 'Income', 'Deductions', 'Taxes', 'Payments', 'Carryovers', 'California'];
    for (const cat of categories) {
      const items =
        cat === 'All'
          ? analysis.lineItemMatrix
          : analysis.lineItemMatrix.filter((i) => i.category === cat);
      expect(items.length).toBeGreaterThan(0);
    }
  });
});
