import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '../../src');

function walk(dir: string, out: string[] = []): string[] {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) out.push(p);
  }
  return out;
}

describe('v6.3 Unified Accessibility & UX Standard: AccessibilityZoomBar', () => {
  const zoomBarPath = path.join(SRC, 'components/common/AccessibilityZoomBar.tsx');
  const zoomBarContent = fs.readFileSync(zoomBarPath, 'utf8');

  it('1. Canonical Component Exists with Strict [-] [Reset] [+] Ordering', () => {
    expect(fs.existsSync(zoomBarPath)).toBe(true);

    // Verify ZoomOut appears BEFORE ZoomIn in the component markup
    const zoomOutIndex = zoomBarContent.indexOf('<ZoomOut');
    const zoomInIndex = zoomBarContent.indexOf('<ZoomIn');
    expect(zoomOutIndex).toBeGreaterThan(0);
    expect(zoomInIndex).toBeGreaterThan(0);
    expect(zoomOutIndex).toBeLessThan(zoomInIndex);
  });

  it('2. Enforces Accessible Tooltips, Labels, and ARIA Attributes', () => {
    expect(zoomBarContent).toContain('Zoom Out (-)');
    expect(zoomBarContent).toContain('Zoom In (+)');
    expect(zoomBarContent).toContain('Reset Zoom (100%)');
    expect(zoomBarContent).toContain('aria-label="Zoom out"');
    expect(zoomBarContent).toContain('aria-label="Zoom in"');
    expect(zoomBarContent).toContain('Click to reset to 100%');
  });

  it('3. Respects Min/Max Boundaries and Disables Appropriate Controls', () => {
    expect(zoomBarContent).toContain('const isMin = scale <= minScale');
    expect(zoomBarContent).toContain('const isMax = scale >= maxScale');
    expect(zoomBarContent).toContain('disabled={disabled || isMin}');
    expect(zoomBarContent).toContain('disabled={disabled || isMax}');
  });

  it('4. Supports Dual Variants (modal vs compact)', () => {
    expect(zoomBarContent).toContain("variant === 'compact'");
    expect(zoomBarContent).toContain('percentText');
  });

  it('5. Generates Standardized and Backward-Compatible Test IDs', () => {
    expect(zoomBarContent).toContain("const btnPrefix = testIdPrefix ? `${testIdPrefix}-zoom` : 'zoom';");
    expect(zoomBarContent).toContain("zoomOutTestId || `${btnPrefix}-out`");
    expect(zoomBarContent).toContain("zoomResetTestId || `${btnPrefix}-reset`");
    expect(zoomBarContent).toContain("zoomInTestId || `${btnPrefix}-in`");
  });

  it('6. Application-Wide Zero Inverted or Raw Zoom Guards: Solely AccessibilityZoomBar Permitted', () => {
    const allFiles = walk(SRC);

    // Verify that NO file outside AccessibilityZoomBar renders <ZoomIn or <ZoomOut directly
    const directZoomFiles: string[] = [];
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(SRC, file);

      if ((content.includes('<ZoomIn') || content.includes('<ZoomOut')) && !relPath.includes('AccessibilityZoomBar')) {
        directZoomFiles.push(relPath);
      }
    }

    expect(
      directZoomFiles,
      `Only AccessibilityZoomBar may render direct <ZoomIn> and <ZoomOut> icons. Violations found in: ${directZoomFiles.join(', ')}`
    ).toEqual([]);
  });

  it('7. Standardized Modal and Card Toolbars Across Target Components', () => {
    const appletContainer = fs.readFileSync(path.join(SRC, 'components/AppletContainer.tsx'), 'utf8');
    const statCard = fs.readFileSync(path.join(SRC, 'components/StatCard.tsx'), 'utf8');
    const drillDownModal = fs.readFileSync(path.join(SRC, 'components/dashboard/DashboardDrillDownModal.tsx'), 'utf8');
    const calSyncModal = fs.readFileSync(path.join(SRC, 'components/calendar/GoogleCalendarSyncModal.tsx'), 'utf8');
    const uploadModal = fs.readFileSync(path.join(SRC, 'components/UploadValidationModal.tsx'), 'utf8');
    const reportPreview = fs.readFileSync(path.join(SRC, 'components/reports/ReportPreviewModal.tsx'), 'utf8');
    const auditModal = fs.readFileSync(path.join(SRC, 'components/reports/ReconciliationAuditModal.tsx'), 'utf8');
    const diffModal = fs.readFileSync(path.join(SRC, 'components/ingest/ReconciliationDiffModal.tsx'), 'utf8');
    const portfolioModal = fs.readFileSync(path.join(SRC, 'components/PortfolioPreviewModal.tsx'), 'utf8');
    const strategyPanel = fs.readFileSync(path.join(SRC, 'components/strategy/StrategyReportPanel.tsx'), 'utf8');

    // Check AppletContainer, StatCard, and DrillDown use AccessibilityZoomBar
    expect(appletContainer).toContain('<AccessibilityZoomBar');
    expect(statCard).toContain('<AccessibilityZoomBar');
    expect(drillDownModal).toContain('<AccessibilityZoomBar');

    // Check Modals use AccessibilityZoomBar
    expect(calSyncModal).toContain('<AccessibilityZoomBar');
    expect(uploadModal).toContain('<AccessibilityZoomBar');
    expect(reportPreview).toContain('<AccessibilityZoomBar');
    expect(auditModal).toContain('<AccessibilityZoomBar');
    expect(diffModal).toContain('<AccessibilityZoomBar');
    expect(portfolioModal).toContain('<AccessibilityZoomBar');
    expect(strategyPanel).toContain('<AccessibilityZoomBar');
  });

  it('8. Enforces Version and Architecture Alignment across App Manifests', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(SRC, '../package.json'), 'utf8'));
    expect(pkg.version).toBe('2.7.16');

    const aboutModal = fs.readFileSync(path.join(SRC, 'components/AboutModal.tsx'), 'utf8');
    expect(aboutModal).toContain('2.7.16');
    expect(aboutModal).toContain('v2.9.9 High-Visibility Tactile Sub-Navigation, Two-Tier Advisory Box Accessibility & Multi-Year Audit Report/Chart/Scroll Workstation Architecture');

    const page = fs.readFileSync(path.join(SRC, 'app/page.tsx'), 'utf8');
    expect(page).toContain('v2.7.16 (Build 131)');
  });
});
