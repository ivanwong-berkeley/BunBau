import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('BunBau Canonical Container UX Standards Enforcement', () => {
  const taxComponentsDir = path.resolve(__dirname, '../../../src/components/tax');

  it('1. Verifies TaxExecutiveSummaryCards satisfies canonical UX standards', () => {
    const code = fs.readFileSync(path.join(taxComponentsDir, 'TaxExecutiveSummaryCards.tsx'), 'utf-8');
    expect(code).toContain('kpis-info-btn');
    expect(code).toContain('Comparative Bar Chart');
    expect(code).toContain('navigator.clipboard.writeText');
    expect(code).toContain('Copied!');
  });

  it('2. Verifies TaxLifecycleTimeline satisfies canonical UX standards', () => {
    const code = fs.readFileSync(path.join(taxComponentsDir, 'TaxLifecycleTimeline.tsx'), 'utf-8');
    expect(code).toContain('roadmap-info-btn');
    expect(code).toContain('roadmap-view-chart');
    expect(code).toContain('roadmap-view-table');
    expect(code).toContain('Copy Roadmap');
    expect(code).toContain('Copied All!');
    expect(code).toContain('copy-milestone-action-btn');
  });

  it('3. Verifies MedicareHealthPlanCard satisfies canonical UX standards', () => {
    const code = fs.readFileSync(path.join(taxComponentsDir, 'MedicareHealthPlanCard.tsx'), 'utf-8');
    expect(code).toContain('medicare-info-btn');
    expect(code).toContain('medicare-view-cards');
    expect(code).toContain('medicare-view-table');
    expect(code).toContain('Copy Plan');
    expect(code).toContain('Copied Plan!');
  });

  it('4. Verifies SocialSecurityPlannerCard satisfies canonical UX standards', () => {
    const code = fs.readFileSync(path.join(taxComponentsDir, 'SocialSecurityPlannerCard.tsx'), 'utf-8');
    expect(code).toContain('ss-info-btn');
    expect(code).toContain('ss-view-cards');
    expect(code).toContain('ss-view-table');
    expect(code).toContain('Copy Strategy');
    expect(code).toContain('Copied Strategy!');
  });

  it('5. Verifies IrmaaCliffMonitorCard satisfies canonical UX standards', () => {
    const code = fs.readFileSync(path.join(taxComponentsDir, 'IrmaaCliffMonitorCard.tsx'), 'utf-8');
    expect(code).toContain('irmaa-info-btn');
    expect(code).toContain('irmaa-view-gauge');
    expect(code).toContain('irmaa-view-table');
    expect(code).toContain('Copy Guidance');
    expect(code).toContain('Copied Guidance!');
  });

  it('6. Verifies RmdRothConversionCard satisfies canonical UX standards', () => {
    const code = fs.readFileSync(path.join(taxComponentsDir, 'RmdRothConversionCard.tsx'), 'utf-8');
    expect(code).toContain('rmd-info-btn');
    expect(code).toContain('rmd-view-cards');
    expect(code).toContain('rmd-view-table');
    expect(code).toContain('Copy Plan');
    expect(code).toContain('Copied Plan!');
  });

  it('7. Verifies LongitudinalComparisonCard satisfies canonical UX standards at container & inspector levels', () => {
    const code = fs.readFileSync(path.join(taxComponentsDir, 'LongitudinalComparisonCard.tsx'), 'utf-8');
    // Container Level
    expect(code).toContain('longitudinal-info-btn');
    expect(code).toContain('Multi-Column Matrix');
    expect(code).toContain('Macro Trajectory');
    expect(code).toContain('Loss Shield Ledger');
    expect(code).toContain('copy-audit-summary-btn');
    expect(code).toContain('Copy Summary');

    // Line Item Inspector Modal Level
    expect(code).toContain('modal-line-item-info-btn');
    expect(code).toContain('modal-view-grid-btn');
    expect(code).toContain('modal-view-chart-btn');
    expect(code).toContain('modal-copy-line-item-btn');
    expect(code).toContain('Copy Line Analysis');
  });

  it('8. Verifies PortfolioTaxStrategyCard satisfies canonical UX standards and per-card copy controls', () => {
    const code = fs.readFileSync(path.join(taxComponentsDir, 'PortfolioTaxStrategyCard.tsx'), 'utf-8');
    expect(code).toContain('AppletContainer');
    expect(code).toContain('tableComponent={strategyTableComponent}');
    expect(code).toContain('copy-strategy-options-btn');
    expect(code).toContain('copy-strategy-passive-btn');
    expect(code).toContain('copy-strategy-muni-btn');
    expect(code).toContain('copy-strategy-safe-btn');
    expect(code).toContain('rentalPropertyAddress');
    expect(code).not.toContain('742 Evergreen Terrace');
  });

  it('9. Verifies TaxMemoryInspectorModal satisfies canonical UX standards and live dynamic facts', () => {
    const code = fs.readFileSync(path.join(taxComponentsDir, 'TaxMemoryInspectorModal.tsx'), 'utf-8');
    expect(code).toContain('memory-info-btn');
    expect(code).toContain('memory-view-cards-btn');
    expect(code).toContain('memory-view-table-btn');
    expect(code).toContain('copy-memory-facts-btn');
    expect(code).toContain('Copy All Facts');
    expect(code).toContain('generateLiveFacts');
    expect(code).toContain('ViaPath Technologies inc.');
  });
});
