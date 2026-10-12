import { describe, it, expect } from 'vitest';
import { buildConsolidatedReport } from '../../../src/lib/reports/consolidatedReport';
import { CanonicalAccount, CanonicalPosition } from '../../../src/lib/portfolio/types';
import { sortRows } from '../../../src/lib/ui/smartTableSort';

describe('Report Sections 4 & 5 Sortable Institution Column Audit', () => {
  const mockAccounts: CanonicalAccount[] = [
    {
      id: 'acc_schwab_1',
      institution: 'Charles Schwab',
      accountType: 'Brokerage',
      maskedAccount: '***-5521',
      positions: [],
      updatedAt: '2026-10-10T00:00:00Z',
    },
    {
      id: 'acc_citi_1',
      institution: 'Citi Bank',
      accountType: 'Certificate of Deposit',
      maskedAccount: '***-9812',
      positions: [],
      updatedAt: '2026-10-10T00:00:00Z',
    },
    {
      id: 'acc_fid_1',
      institution: 'Fidelity',
      accountType: 'Individual Brokerage',
      maskedAccount: '***-3341',
      positions: [],
      updatedAt: '2026-10-10T00:00:00Z',
    },
    {
      id: 'acc_wb_1',
      institution: 'WeBull',
      accountType: 'Individual Cash',
      maskedAccount: '***-XLW4',
      positions: [],
      updatedAt: '2026-10-10T00:00:00Z',
    },
  ];

  const mockPositions: CanonicalPosition[] = [
    // Section 4 Options across institutions
    {
      id: 'pos_opt_schwab',
      institution: 'Charles Schwab',
      accountId: 'acc_schwab_1',
      symbol: 'AAPL 220 Call',
      name: 'AAPL Covered Call',
      assetClass: 'CoveredCall',
      quantity: -2,
      marketValue: -350,
      option: {
        underlying: 'AAPL',
        strike: 220,
        right: 'CALL',
        expiry: '2026-11-20',
        contracts: 2,
      },
    },
    {
      id: 'pos_opt_fid',
      institution: 'Fidelity',
      accountId: 'acc_fid_1',
      symbol: 'NVDA 120 Put',
      name: 'NVDA Cash Secured Put',
      assetClass: 'CSP',
      quantity: 1,
      marketValue: 12000,
      option: {
        underlying: 'NVDA',
        strike: 120,
        right: 'PUT',
        expiry: '2026-10-30',
        contracts: 1,
      },
    },
    {
      id: 'pos_opt_wb',
      institution: 'WeBull',
      accountId: 'acc_wb_1',
      symbol: 'SOFI 21.5 Call',
      name: 'SOFI Covered Call',
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

    // Section 5 Fixed Income & Yield across institutions
    {
      id: 'pos_fi_citi_cd',
      institution: 'Citi Bank',
      accountId: 'acc_citi_1',
      symbol: 'CITI-CD-100K',
      name: 'Citi 1-Year Fixed CD',
      assetClass: 'CD',
      quantity: 1,
      marketValue: 100000,
      apy: 4.25,
      maturityDate: '2027-10-10',
    },
    {
      id: 'pos_fi_fid_spaxx',
      institution: 'Fidelity',
      accountId: 'acc_fid_1',
      symbol: 'SPAXX',
      name: 'Fidelity Government Money Market',
      assetClass: 'CashEquivalent',
      quantity: 25000,
      marketValue: 25000,
      apy: 4.95,
    },
    {
      id: 'pos_fi_schwab_swvxx',
      institution: 'Charles Schwab',
      accountId: 'acc_schwab_1',
      symbol: 'SWVXX',
      name: 'Schwab Value Advantage Money Fund',
      assetClass: 'CashEquivalent',
      quantity: 50000,
      marketValue: 50000,
      apy: 5.12,
    },
  ];

  it('guarantees Section 4 Active Options dataset has valid institution fields on all rows', () => {
    const report = buildConsolidatedReport(mockPositions, mockAccounts, {
      reportTitle: 'Portfolio Consolidated Audit Report (All Institutions & Accounts)',
    });

    const optRows = report.section4_ActiveOptions.rows;
    expect(optRows).toHaveLength(3);

    optRows.forEach((r) => {
      expect(r.institution).toBeDefined();
      expect(typeof r.institution).toBe('string');
      expect(r.institution.length).toBeGreaterThan(0);
    });

    const institutions = optRows.map((r) => r.institution);
    expect(institutions).toContain('Charles Schwab');
    expect(institutions).toContain('Fidelity');
    expect(institutions).toContain('WeBull');
  });

  it('sorts Section 4 Active Options rows by Institution in ascending and descending directions', () => {
    const report = buildConsolidatedReport(mockPositions, mockAccounts);
    const optRows = report.section4_ActiveOptions.rows;

    const getters = { institution: (r: (typeof optRows)[0]) => r.institution };

    // Ascending sort
    const sortedAsc = sortRows(optRows, getters, { key: 'institution', dir: 'asc' });
    expect(sortedAsc.map((r) => r.institution)).toEqual([
      'Charles Schwab',
      'Fidelity',
      'WeBull',
    ]);

    // Descending sort
    const sortedDesc = sortRows(optRows, getters, { key: 'institution', dir: 'desc' });
    expect(sortedDesc.map((r) => r.institution)).toEqual([
      'WeBull',
      'Fidelity',
      'Charles Schwab',
    ]);
  });

  it('guarantees Section 5 Fixed Income dataset includes CDs and money market funds with institution populated', () => {
    const report = buildConsolidatedReport(mockPositions, mockAccounts, {
      reportTitle: 'Portfolio Consolidated Audit Report (All Institutions & Accounts)',
    });

    const fiRows = report.section5_FixedIncome.rows;
    expect(fiRows).toHaveLength(3);

    fiRows.forEach((r) => {
      expect(r.institution).toBeDefined();
      expect(typeof r.institution).toBe('string');
      expect(r.institution.length).toBeGreaterThan(0);
    });

    const institutions = fiRows.map((r) => r.institution);
    expect(institutions).toContain('Charles Schwab');
    expect(institutions).toContain('Citi Bank');
    expect(institutions).toContain('Fidelity');
  });

  it('sorts Section 5 Fixed Income rows by Institution in ascending and descending directions', () => {
    const report = buildConsolidatedReport(mockPositions, mockAccounts);
    const fiRows = report.section5_FixedIncome.rows;

    const getters = { institution: (r: (typeof fiRows)[0]) => r.institution };

    // Ascending sort
    const sortedAsc = sortRows(fiRows, getters, { key: 'institution', dir: 'asc' });
    expect(sortedAsc.map((r) => r.institution)).toEqual([
      'Charles Schwab',
      'Citi Bank',
      'Fidelity',
    ]);

    // Descending sort
    const sortedDesc = sortRows(fiRows, getters, { key: 'institution', dir: 'desc' });
    expect(sortedDesc.map((r) => r.institution)).toEqual([
      'Fidelity',
      'Citi Bank',
      'Charles Schwab',
    ]);
  });

  it('verifies that all 4 report templates retain institution on Sections 4 and 5', () => {
    const reportTemplates = [
      'Portfolio Consolidated Audit Report (All Institutions & Accounts)',
      'Custom Filtered Account Audit Report',
      'Asset Allocation & Fixed Income Yield Ledger',
      'Active Options & Collateral Exposure Ledger',
    ];

    reportTemplates.forEach((title) => {
      const report = buildConsolidatedReport(mockPositions, mockAccounts, { reportTitle: title });
      expect(report.metadata.title).toBe(title);

      // Section 4
      expect(report.section4_ActiveOptions.rows.length).toBeGreaterThan(0);
      report.section4_ActiveOptions.rows.forEach((r) => {
        expect(r.institution).toBeTruthy();
      });

      // Section 5
      expect(report.section5_FixedIncome.rows.length).toBeGreaterThan(0);
      report.section5_FixedIncome.rows.forEach((r) => {
        expect(r.institution).toBeTruthy();
      });
    });
  });

  it('preserves filtered accounts scoping with sortable institution across Sections 4 & 5', () => {
    // Custom Filtered Account report scoping only to WeBull and Citi Bank
    const report = buildConsolidatedReport(mockPositions, mockAccounts, {
      reportTitle: 'Custom Filtered Account Audit Report',
      filterAccountIds: ['acc_wb_1', 'acc_citi_1'],
    });

    // Options should only contain WeBull
    expect(report.section4_ActiveOptions.rows).toHaveLength(1);
    expect(report.section4_ActiveOptions.rows[0].institution).toBe('WeBull');

    // Fixed Income should only contain Citi Bank
    expect(report.section5_FixedIncome.rows).toHaveLength(1);
    expect(report.section5_FixedIncome.rows[0].institution).toBe('Citi Bank');
  });
});
