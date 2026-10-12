import { describe, it, expect } from 'vitest';
import { CanonicalAccount, CanonicalPosition } from '../../../src/lib/portfolio/types';
import { buildConsolidatedReport } from '../../../src/lib/reports/consolidatedReport';
import { generateConsolidatedReportCsv } from '../../../src/lib/reports/csvExporter';

describe('AccountSelectionModal - Scoped Hierarchy Selection Logic', () => {
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
    {
      id: 'acc_fid_tax',
      institution: 'Fidelity',
      accountType: 'Brokerage',
      maskedAccount: '***-7890',
      positions: [],
      updatedAt: '2026-10-10T00:00:00Z',
    },
  ];

  const positions: CanonicalPosition[] = [
    {
      id: 'p1',
      institution: 'WeBull',
      accountId: 'acc_wb_cash',
      symbol: 'SOFI',
      name: 'SoFi Technologies',
      assetClass: 'Stock',
      quantity: 114.11157,
      marketValue: 1788.13,
    },
    {
      id: 'p2',
      institution: 'WeBull',
      accountId: 'acc_wb_ira',
      symbol: 'NVDA',
      name: 'NVIDIA Corp',
      assetClass: 'Stock',
      quantity: 10,
      marketValue: 1250.0,
    },
    {
      id: 'p3',
      institution: 'Fidelity',
      accountId: 'acc_fid_tax',
      symbol: 'SPAXX',
      name: 'Fidelity Govt Money Market',
      assetClass: 'Cash',
      quantity: 10000,
      marketValue: 10000.0,
    },
    {
      id: 'p4',
      institution: 'WeBull',
      accountId: 'acc_wb_cash',
      symbol: 'SOFI 21.5 Call',
      name: 'SOFI Oct 09 2026 21.5 Call',
      assetClass: 'CoveredCall',
      quantity: -1,
      marketValue: -1.0,
    },
  ];

  it('correctly calculates total selectable accounts and groups by institution', () => {
    const grouped = new Map<string, CanonicalAccount[]>();
    accounts.forEach((a) => {
      if (!grouped.has(a.institution)) grouped.set(a.institution, []);
      grouped.get(a.institution)!.push(a);
    });

    expect(grouped.size).toBe(2); // WeBull and Fidelity
    expect(grouped.get('WeBull')).toHaveLength(2);
    expect(grouped.get('Fidelity')).toHaveLength(1);
  });

  it('computes selected net worth strictly from non-option positions for chosen accounts', () => {
    // Select only WeBull Cash and Fidelity
    const selectedIds = new Set(['acc_wb_cash', 'acc_fid_tax']);
    const selectedPositions = positions.filter((p) => selectedIds.has(p.accountId));
    const selectedWorth = selectedPositions
      .filter((p) => p.assetClass !== 'CSP' && p.assetClass !== 'CoveredCall')
      .reduce((s, p) => s + p.marketValue, 0);

    // SOFI (1788.13) + SPAXX (10000) = 11788.13
    expect(selectedWorth).toBeCloseTo(11788.13, 2);
  });

  it('generates scoped report and CSV containing only selected accounts', () => {
    // Select only WeBull IRA
    const selectedIds = ['acc_wb_ira'];
    const report = buildConsolidatedReport(positions, accounts, {
      filterAccountIds: selectedIds,
      reportTitle: 'Custom Filtered Account Audit Report',
    });

    expect(report.metadata.accountsCount).toBe(1);
    expect(report.section6_MasterFlatLedger).toHaveLength(1);
    expect(report.section6_MasterFlatLedger[0].symbol).toBe('NVDA');

    const csv = generateConsolidatedReportCsv(report);
    expect(csv).toContain('NVDA');
    expect(csv).not.toContain('SPAXX');
  });

  it('supports toggling institution-level selection to select/deselect all child accounts', () => {
    const wbAccountIds = accounts
      .filter((a) => a.institution === 'WeBull')
      .map((a) => a.id);

    // Initial: all WeBull selected
    let selectedSet = new Set(wbAccountIds);
    expect(selectedSet.size).toBe(2);

    // Deselect WeBull institution
    wbAccountIds.forEach((id) => selectedSet.delete(id));
    expect(selectedSet.size).toBe(0);

    // Re-select WeBull institution
    wbAccountIds.forEach((id) => selectedSet.add(id));
    expect(selectedSet.size).toBe(2);
  });
});
