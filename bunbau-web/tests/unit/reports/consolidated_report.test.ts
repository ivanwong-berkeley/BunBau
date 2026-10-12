import { describe, it, expect } from 'vitest';
import { buildConsolidatedReport } from '../../../src/lib/reports/consolidatedReport';
import { generateConsolidatedReportCsv } from '../../../src/lib/reports/csvExporter';
import { CanonicalAccount, CanonicalPosition } from '../../../src/lib/portfolio/types';

describe('Consolidated Portfolio Report Engine', () => {
  const accounts: CanonicalAccount[] = [
    {
      id: 'acc_webull_cash',
      institution: 'WeBull',
      accountType: 'Individual Cash',
      maskedAccount: '***-XLW4',
      positions: [],
      updatedAt: '2026-10-10T00:00:00Z',
    },
    {
      id: 'acc_webull_ira',
      institution: 'WeBull',
      accountType: 'Rollover IRA',
      maskedAccount: '***-QSX4',
      positions: [],
      updatedAt: '2026-10-10T00:00:00Z',
    },
    {
      id: 'acc_fid_brokerage',
      institution: 'Fidelity',
      accountType: 'Brokerage',
      maskedAccount: '***-6238',
      positions: [],
      updatedAt: '2026-10-10T00:00:00Z',
    },
  ];

  const positions: CanonicalPosition[] = [
    // WeBull Individual Cash: USD cash
    {
      id: 'pos_wb_cash',
      institution: 'WeBull',
      accountId: 'acc_webull_cash',
      symbol: 'USD',
      name: 'US Dollar',
      assetClass: 'Cash',
      quantity: 57.11,
      marketValue: 57.11,
    },
    // WeBull Individual Cash: SOFI (Consolidated 114.11157 shares)
    {
      id: 'pos_wb_sofi',
      institution: 'WeBull',
      accountId: 'acc_webull_cash',
      symbol: 'SOFI',
      name: 'SoFi Technologies',
      assetClass: 'Stock',
      quantity: 114.11157,
      marketValue: 1788.13,
      costBasis: 1600.0,
    },
    // WeBull Individual Cash: SOFI Covered Call (-1 contract = 100 shares locked)
    {
      id: 'pos_wb_cc',
      institution: 'WeBull',
      accountId: 'acc_webull_cash',
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
    // WeBull Rollover IRA: SOFI (100 shares, unhedged/available)
    {
      id: 'pos_ira_sofi',
      institution: 'WeBull',
      accountId: 'acc_webull_ira',
      symbol: 'SOFI',
      name: 'SoFi Technologies',
      assetClass: 'Stock',
      quantity: 100,
      marketValue: 1567.0,
      costBasis: 1500.0,
    },
    // Fidelity: Cash
    {
      id: 'pos_fid_cash',
      institution: 'Fidelity',
      accountId: 'acc_fid_brokerage',
      symbol: 'SPAXX',
      name: 'Fidelity Government Money Market',
      assetClass: 'Cash',
      quantity: 10000,
      marketValue: 10000,
      apy: 4.85,
    },
    // Fidelity: CSP (AAPL 310 Put, strike 310, 1 contract = $31,000 locked)
    {
      id: 'pos_fid_csp',
      institution: 'Fidelity',
      accountId: 'acc_fid_brokerage',
      symbol: 'AAPL 310 Put',
      name: 'AAPL Nov 20 2026 310 Put',
      assetClass: 'CSP',
      quantity: -1,
      marketValue: -103.0,
      option: {
        underlying: 'AAPL',
        strike: 310,
        right: 'PUT',
        expiry: '2026-11-20',
        contracts: 1,
      },
    },
  ];

  it('assembles multi-tier report mirroring BunBau UX containers and drilldowns', () => {
    const report = buildConsolidatedReport(positions, accounts, {
      asOfDate: '2026-10-10',
      isDemo: false,
    });

    // Metadata
    expect(report.metadata.mode).toBe('Live');
    expect(report.metadata.institutionsCount).toBe(2); // WeBull & Fidelity
    expect(report.metadata.accountsCount).toBe(3);
    expect(report.metadata.positionsCount).toBe(6);

    // Section 1: Executive Summary & Net Worth
    // Option premiums are excluded from Net Worth
    // Net Worth = Cash(57.11) + SOFI(1788.13) + SOFI_IRA(1567.00) + SPAXX(10000) = 13,412.24
    expect(report.section1_ExecutiveSummary.computedNetWorth).toBeCloseTo(13412.24, 2);
    expect(report.section1_ExecutiveSummary.rawCash).toBeCloseTo(10057.11, 2);
    expect(report.section1_ExecutiveSummary.cspReserve).toBe(31000); // 310 strike * 100 * 1

    // Section 2: Cash Manager (only accounts with cash or CSP reserves)
    expect(report.section2_CashManager.rows).toHaveLength(2);
    expect(report.section2_CashManager.totalRawCash).toBeCloseTo(10057.11, 2);

    // Section 3: Equities Hierarchical Grouping & Subtotals
    expect(report.section3_Equities.rows).toHaveLength(2); // SOFI in WeBull Cash and SOFI in WeBull IRA
    expect(report.section3_Equities.institutionGroups).toHaveLength(1); // 1 institution: WeBull
    const wbGroup = report.section3_Equities.institutionGroups[0];
    expect(wbGroup.institution).toBe('WeBull');
    expect(wbGroup.accounts).toHaveLength(2); // Individual Cash and Rollover IRA
    expect(wbGroup.totalInstitutionValue).toBeCloseTo(3355.13, 2); // 1788.13 + 1567.00
    expect(wbGroup.totalInstitutionShares).toBeCloseTo(214.11157, 5);

    // Individual Cash Account Subtotals
    const cashAcc = wbGroup.accounts.find((a) => a.accountId === 'acc_webull_cash')!;
    expect(cashAcc.totalAccountValue).toBe(1788.13);
    expect(cashAcc.totalAccountShares).toBeCloseTo(114.11157, 5);
    expect(cashAcc.totalAccountCostBasis).toBe(1600.0);
    expect(cashAcc.totalAccountUnrealizedPnl).toBe(188.13);
    expect(cashAcc.section1AnchorValue).toBe(1788.13);
    expect(cashAcc.isAnchorReconciled).toBe(true);
    expect(cashAcc.rows[0].percentOfAccount).toBe(100.0);
    expect(cashAcc.rows[0].ccStatus).toContain('Partial (100 cov / 14.11 free)');

    // Rollover IRA Account Subtotals
    const iraAcc = wbGroup.accounts.find((a) => a.accountId === 'acc_webull_ira')!;
    expect(iraAcc.totalAccountValue).toBe(1567.0);
    expect(iraAcc.totalAccountShares).toBe(100);
    expect(iraAcc.totalAccountCostBasis).toBe(1500.0);
    expect(iraAcc.totalAccountUnrealizedPnl).toBe(67.0);
    expect(iraAcc.section1AnchorValue).toBe(1567.0);
    expect(iraAcc.isAnchorReconciled).toBe(true);
    expect(iraAcc.rows[0].ccStatus).toBe('Available');

    // Section 4: Options
    expect(report.section4_ActiveOptions.rows).toHaveLength(2); // 1 CC + 1 CSP
    expect(report.section4_ActiveOptions.totalCollateralLocked).toBe(31000); // CSP collateral
    expect(report.section4_ActiveOptions.activeCallsCount).toBe(1);
    expect(report.section4_ActiveOptions.activePutsCount).toBe(1);

    // Section 6: Master Flat Ledger
    expect(report.section6_MasterFlatLedger).toHaveLength(6);
    const flatIndSofi = report.section6_MasterFlatLedger.find((r) => r.symbol === 'SOFI' && r.accountId === 'acc_webull_cash')!;
    expect(flatIndSofi.quantity).toBeCloseTo(114.11157, 5);
    expect(flatIndSofi.coveredCallStatus).toContain('Partial');
  });

  it('generates compliant RFC 4180 CSV export with proper section delimiters, hierarchical account subtotals and escaping', () => {
    const report = buildConsolidatedReport(positions, accounts);
    const csv = generateConsolidatedReportCsv(report);

    expect(csv).toContain('BUNBAU PORTFOLIO AUDIT REPORT - CONSOLIDATED MULTI-LEVEL EXPORT');
    expect(csv).toContain('SECTION 1: PORTFOLIO EXECUTIVE SUMMARY & NET WORTH RECONCILIATION');
    expect(csv).toContain('SECTION 2: CASH MANAGER & LIQUID RESERVES LEDGER');
    expect(csv).toContain('SECTION 3: EQUITIES & COVERED CALL ALLOCATION LEDGER');
    expect(csv).toContain('>>> INSTITUTION: WeBull');
    expect(csv).toContain('>> ACCOUNT: WeBull - Individual Cash (***-XLW4)');
    expect(csv).toContain('>> ACCOUNT: WeBull - Rollover IRA (***-QSX4)');
    expect(csv).toContain('[SUBTOTAL: WeBull ***-XLW4]');
    expect(csv).toContain('[SUBTOTAL: WeBull ***-QSX4]');
    expect(csv).toContain('[INSTITUTION SUBTOTAL: WeBull (2 Accounts)]');
    expect(csv).toContain('[GLOBAL EQUITIES RECONCILED TOTAL]');
    expect(csv).toContain('Matches Section 1 Anchor ✓ ($1788.13)');
    expect(csv).toContain('Matches Section 1 Anchor ✓ ($1567.00)');
    expect(csv).toContain('SECTION 4: ACTIVE OPTIONS & COLLATERAL EXPOSURE LEDGER');
    expect(csv).toContain('SECTION 5: FIXED INCOME & YIELD SCHEDULE');
    expect(csv).toContain('SECTION 6: DIGITAL CURRENCY & CRYPTO ASSETS LEDGER');
    expect(csv).toContain('SECTION 7: COMPREHENSIVE FLAT MASTER AUDIT LEDGER (MACHINE-READABLE)');
    expect(csv).toContain('Partial (100 cov / 14.11 free)');
  });

  it('filters report strictly to specified account IDs when filterAccountIds is provided', () => {
    const report = buildConsolidatedReport(positions, accounts, {
      filterAccountIds: ['acc_webull_cash'],
      reportTitle: 'Filtered Individual Cash Report',
    });

    expect(report.metadata.accountsCount).toBe(1);
    expect(report.metadata.positionsCount).toBe(3); // Cash, SOFI, SOFI CC
    expect(report.section1_ExecutiveSummary.accountsReconciliation).toHaveLength(1);
    expect(report.section1_ExecutiveSummary.accountsReconciliation[0].accountMasked).toBe('***-XLW4');
    expect(report.section6_MasterFlatLedger.every((r) => r.accountId === 'acc_webull_cash')).toBe(true);
  });
});
