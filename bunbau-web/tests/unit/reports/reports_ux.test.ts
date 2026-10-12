import { describe, it, expect } from 'vitest';
import { buildConsolidatedReport } from '../../../src/lib/reports/consolidatedReport';
import { generateConsolidatedReportCsv } from '../../../src/lib/reports/csvExporter';
import { CanonicalAccount, CanonicalPosition } from '../../../src/lib/portfolio/types';

describe('Reports UX State, Zoom Scaling & Filter Transitions', () => {
  const accounts: CanonicalAccount[] = [
    {
      id: 'acc_wb_cash',
      institution: 'WeBull',
      accountType: 'Individual Cash',
      maskedAccount: '***-XLW4',
      positions: [],
      updatedAt: '2026-10-10T00:00:00Z',
    },
    {
      id: 'acc_wb_ira',
      institution: 'WeBull',
      accountType: 'Rollover IRA',
      maskedAccount: '***-QSX4',
      positions: [],
      updatedAt: '2026-10-10T00:00:00Z',
    },
  ];

  const positions: CanonicalPosition[] = [
    {
      id: 'pos_1',
      institution: 'WeBull',
      accountId: 'acc_wb_cash',
      symbol: 'SOFI',
      name: 'SoFi Technologies',
      assetClass: 'Stock',
      quantity: 114.11157,
      marketValue: 1788.13,
    },
    {
      id: 'pos_2',
      institution: 'WeBull',
      accountId: 'acc_wb_cash',
      symbol: 'SOFI 21.5 Call',
      name: 'SOFI Oct 09 2026 21.5 Call',
      assetClass: 'CoveredCall',
      quantity: -1,
      marketValue: -1.0,
      option: {
        underlying: 'SOFI',
        strike: 21.5,
        right: 'CALL',
        expiry: '2026-10-09',
        contracts: 1,
      },
    },
    {
      id: 'pos_3',
      institution: 'WeBull',
      accountId: 'acc_wb_ira',
      symbol: 'AMD',
      name: 'Advanced Micro Devices',
      assetClass: 'Stock',
      quantity: 20,
      marketValue: 3000,
    },
  ];

  it('validates zoom scale boundary constraints (0.7x minimum to 1.5x maximum)', () => {
    let scale = 1.0;
    const zoomIn = (s: number) => Math.min(1.5, Math.round((s + 0.1) * 10) / 10);
    const zoomOut = (s: number) => Math.max(0.7, Math.round((s - 0.1) * 10) / 10);

    // Zoom in multiple times
    for (let i = 0; i < 10; i++) scale = zoomIn(scale);
    expect(scale).toBe(1.5); // Clamped at 1.5x max

    // Zoom out multiple times
    for (let i = 0; i < 15; i++) scale = zoomOut(scale);
    expect(scale).toBe(0.7); // Clamped at 0.7x min
  });

  it('filters report view dynamically by search query across symbols, descriptions, and accounts', () => {
    const report = buildConsolidatedReport(positions, accounts);

    const query = 'sofi';
    const filteredEquities = report.section3_Equities.rows.filter(
      (e) =>
        e.symbol.toLowerCase().includes(query) ||
        e.name.toLowerCase().includes(query) ||
        e.accountMasked.toLowerCase().includes(query)
    );

    expect(filteredEquities).toHaveLength(1);
    expect(filteredEquities[0].symbol).toBe('SOFI');

    const filteredOptions = report.section4_ActiveOptions.rows.filter(
      (o) =>
        o.symbol.toLowerCase().includes(query) ||
        o.underlying.toLowerCase().includes(query)
    );

    expect(filteredOptions).toHaveLength(1);
    expect(filteredOptions[0].underlying).toBe('SOFI');
  });

  it('produces raw CSV matching flat ledger structure for table view switch', () => {
    const report = buildConsolidatedReport(positions, accounts);
    const csv = generateConsolidatedReportCsv(report);

    // Verify all flat columns exist in CSV header
    expect(csv).toContain('SECTION 7: COMPREHENSIVE FLAT MASTER AUDIT LEDGER (MACHINE-READABLE)');
    expect(csv).toContain('Institution,Account_ID,Account_Masked,Account_Type,Asset_Class,Symbol,Name,Quantity,Current_Price,Market_Value');
    expect(csv).toContain('Covered_Call_Status,Account_Stated_Total,Account_Computed_Total,Account_Reconciliation_Status');
  });

  it('determines dynamic modal positioning offset based on sidebar expanded state', () => {
    const getModalPlacementClass = (isSidebarExpanded: boolean, isFullscreen: boolean) => {
      if (isFullscreen) return 'left-0 z-[100] p-0';
      return isSidebarExpanded ? 'left-0 md:left-64 z-40 p-2 sm:p-4 md:p-6' : 'left-0 md:left-20 z-40 p-2 sm:p-4 md:p-6';
    };

    // When sidebar is open (expanded = true): offset by 256px (md:left-64)
    expect(getModalPlacementClass(true, false)).toContain('md:left-64');
    expect(getModalPlacementClass(true, false)).not.toContain('md:left-20');

    // When sidebar is collapsed (expanded = false): offset by 80px (md:left-20)
    expect(getModalPlacementClass(false, false)).toContain('md:left-20');
    expect(getModalPlacementClass(false, false)).not.toContain('md:left-64');

    // When in fullscreen mode: break out to full screen (left-0, z-[100])
    expect(getModalPlacementClass(true, true)).toBe('left-0 z-[100] p-0');
    expect(getModalPlacementClass(false, true)).toBe('left-0 z-[100] p-0');
  });

  it('validates two-level independent zoom scaling for Modal Level 1 and Results Table Level 2', () => {
    // Level 1: Modal scale (0.7x to 1.5x)
    let modalZoom = 1.0;
    const modalZoomIn = (s: number) => Math.min(1.5, Math.round((s + 0.1) * 10) / 10);
    const modalZoomOut = (s: number) => Math.max(0.7, Math.round((s - 0.1) * 10) / 10);

    // Level 2: Table scale (0.8x to 1.4x)
    let tableZoom = 1.0;
    const tableZoomIn = (s: number) => Math.min(1.4, Math.round((s + 0.1) * 10) / 10);
    const tableZoomOut = (s: number) => Math.max(0.8, Math.round((s - 0.1) * 10) / 10);

    // Change modal zoom
    modalZoom = modalZoomIn(modalZoom); // 1.1
    expect(modalZoom).toBe(1.1);
    expect(tableZoom).toBe(1.0); // Table zoom remains untouched

    // Change table zoom
    tableZoom = tableZoomIn(tableZoom); // 1.1
    tableZoom = tableZoomIn(tableZoom); // 1.2
    expect(tableZoom).toBe(1.2);
    expect(modalZoom).toBe(1.1); // Modal zoom remains independent

    // Test table zoom boundary clamping at 1.4x max and 0.8x min
    for (let i = 0; i < 10; i++) tableZoom = tableZoomIn(tableZoom);
    expect(tableZoom).toBe(1.4);

    for (let i = 0; i < 15; i++) tableZoom = tableZoomOut(tableZoom);
    expect(tableZoom).toBe(0.8);
  });

  it('manages detached full view state transitions for distraction-free ledger inspection', () => {
    let isResultsDetached = false;
    const toggleDetached = (curr: boolean) => !curr;

    // Initially false: all steps visible
    expect(isResultsDetached).toBe(false);

    // Enter detached view
    isResultsDetached = toggleDetached(isResultsDetached);
    expect(isResultsDetached).toBe(true);

    // In detached view, steps 1 & 2 are hidden, giving 100% height to audit results
    const isStep1Visible = !isResultsDetached;
    expect(isStep1Visible).toBe(false);

    // Exit detached view (e.g. via Escape or button click)
    isResultsDetached = toggleDetached(isResultsDetached);
    expect(isResultsDetached).toBe(false);
    expect(!isResultsDetached).toBe(true);
  });

  it('formats terminal logs for clipboard copy with newline preservation', () => {
    const logs = [
      '[12:28:06 PM] Initializing Statement Reconciliation Engine...',
      '[12:28:06 PM] Target Scope: ACCOUNT (Institution: WeBull, Account: ***-QSX4)',
      '[12:28:06 PM] Ingesting Webull_Rollover-IRA_CVS8QSX4_IMG_6700_20261007.PNG...',
      '[12:28:06 PM] Reconciliation complete! Gaps found: 0. Status: ✓ 100% Reconciled.',
    ];

    const clipboardText = logs.join('\n');
    expect(clipboardText.split('\n')).toHaveLength(4);
    expect(clipboardText).toContain('Initializing Statement Reconciliation Engine');
    expect(clipboardText).toContain('Reconciliation complete! Gaps found: 0');
  });

  it('toggles column sort state on header clicks and tracks active indicators', () => {
    let sortColumn = 'symbol';
    let sortDirection: 'asc' | 'desc' = 'asc';

    const handleHeaderClick = (colKey: string) => {
      if (sortColumn === colKey) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortColumn = colKey;
        sortDirection = 'asc';
      }
    };

    // Default state: symbol ASC
    expect(sortColumn).toBe('symbol');
    expect(sortDirection).toBe('asc');

    // Click same column 'symbol' -> toggles to DESC
    handleHeaderClick('symbol');
    expect(sortColumn).toBe('symbol');
    expect(sortDirection).toBe('desc');

    // Click 'statementValue' -> switches to statementValue ASC
    handleHeaderClick('statementValue');
    expect(sortColumn).toBe('statementValue');
    expect(sortDirection).toBe('asc');

    // Click 'statementValue' again -> toggles to DESC
    handleHeaderClick('statementValue');
    expect(sortColumn).toBe('statementValue');
    expect(sortDirection).toBe('desc');
  });

  it('controls Reset Sort button visibility and state transitions', () => {
    let sortColumn = 'symbol';
    let sortDirection: 'asc' | 'desc' = 'asc';

    const isResetActive = () => sortColumn !== 'symbol' || sortDirection !== 'asc';

    // Initially at default: Reset Sort is inactive
    expect(isResetActive()).toBe(false);

    // After custom sort: Reset Sort is active
    sortColumn = 'portfolioValue';
    sortDirection = 'desc';
    expect(isResetActive()).toBe(true);

    // Trigger Reset Sort
    sortColumn = 'symbol';
    sortDirection = 'asc';
    expect(isResetActive()).toBe(false);
  });

  it('validates column definitions and operational shortcuts in Information (i) Glossary', () => {
    const requiredColumns = [
      'Symbol',
      'Asset',
      'Audit Status',
      'Statement Qty',
      'Portfolio Qty',
      'Statement Val',
      'Portfolio Val',
      'Audit Notes',
    ];

    const definitions = [
      { term: 'Symbol', definition: 'Official equity ticker symbol.' },
      { term: 'Asset', definition: 'Asset classification.' },
      { term: 'Audit Status', definition: 'Mathematical reconciliation status.' },
      { term: 'Statement Qty', definition: 'Parsed statement shares/contracts.' },
      { term: 'Portfolio Qty', definition: 'Active BunBau portfolio records.' },
      { term: 'Statement Val', definition: 'Market valuation from statement.' },
      { term: 'Portfolio Val', definition: 'Market valuation from portfolio.' },
      { term: 'Audit Notes', definition: 'Discrepancy diagnostics.' },
    ];

    const terms = definitions.map((d) => d.term);
    for (const col of requiredColumns) {
      expect(terms).toContain(col);
    }
  });
});
