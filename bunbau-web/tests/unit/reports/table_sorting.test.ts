import { describe, it, expect } from 'vitest';
import {
  sortPositionAuditItems,
  sortGenericTable,
  SortDirection,
} from '../../../src/lib/ui/tableSorting';
import { PositionAuditItem } from '../../../src/lib/reports/reconciliationAuditor';

describe('Smart Table Sorting Engine (BunBau Standard UX)', () => {
  const sampleItems: PositionAuditItem[] = [
    {
      symbol: 'USD',
      assetClass: 'Cash Core',
      status: 'MATCHED',
      statementQuantity: 11.78,
      portfolioQuantity: 11.78,
      statementValue: 11.78,
      portfolioValue: 11.78,
      notes: 'Exact match.',
    },
    {
      symbol: 'NVDA',
      assetClass: 'Stock',
      status: 'MATCHED',
      statementQuantity: 59.1585,
      portfolioQuantity: 59.1585,
      statementValue: 14053.09,
      portfolioValue: 14053.09,
      notes: 'Exact match.',
    },
    {
      symbol: 'AMD',
      assetClass: 'Stock',
      status: 'QUANTITY_MISMATCH',
      statementQuantity: 25.0,
      portfolioQuantity: 20.0,
      statementValue: 4968.2,
      portfolioValue: 3974.56,
      notes: 'Difference of 5.0 shares.',
    },
    {
      symbol: 'XOM',
      assetClass: 'Stock',
      status: 'MATCHED',
      statementQuantity: 63.4198,
      portfolioQuantity: 63.4198,
      statementValue: 10383.09,
      portfolioValue: 10383.09,
      notes: 'Exact match.',
    },
    {
      symbol: 'SOFI 21.5 Call',
      assetClass: 'CoveredCall',
      status: 'MATCHED',
      statementQuantity: -1,
      portfolioQuantity: -1,
      statementValue: -1.0,
      portfolioValue: -1.0,
      notes: 'Option backing verified.',
    },
    {
      symbol: 'TSM',
      assetClass: 'Stock',
      status: 'MISSING_IN_PORTFOLIO',
      statementQuantity: 4.334,
      portfolioQuantity: 0,
      statementValue: 2054.22,
      portfolioValue: 0,
      notes: 'Present on statement, missing from portfolio.',
    },
  ];

  it('sorts by Symbol ASC by default (alphabetical order A to Z)', () => {
    const sorted = sortPositionAuditItems(sampleItems, 'symbol', 'asc');
    const symbols = sorted.map((s) => s.symbol);

    expect(symbols[0]).toBe('AMD');
    expect(symbols[1]).toBe('NVDA');
    expect(symbols[2]).toBe('SOFI 21.5 Call');
    expect(symbols[3]).toBe('TSM');
    expect(symbols[4]).toBe('USD');
    expect(symbols[5]).toBe('XOM');
  });

  it('sorts by Symbol DESC (reverse alphabetical order Z to A)', () => {
    const sorted = sortPositionAuditItems(sampleItems, 'symbol', 'desc');
    const symbols = sorted.map((s) => s.symbol);

    expect(symbols[0]).toBe('XOM');
    expect(symbols[1]).toBe('USD');
    expect(symbols[2]).toBe('TSM');
    expect(symbols[5]).toBe('AMD');
  });

  it('sorts by Asset Class in ASC and DESC order', () => {
    const sortedAsc = sortPositionAuditItems(sampleItems, 'assetClass', 'asc');
    expect(sortedAsc[0].assetClass).toBe('Cash Core');
    expect(sortedAsc[1].assetClass).toBe('CoveredCall');
    expect(sortedAsc[2].assetClass).toBe('Stock');

    const sortedDesc = sortPositionAuditItems(sampleItems, 'assetClass', 'desc');
    expect(sortedDesc[0].assetClass).toBe('Stock');
    expect(sortedDesc[sortedDesc.length - 1].assetClass).toBe('Cash Core');
  });

  it('sorts by Audit Status prioritizing discrepancies in DESC order', () => {
    const sortedDesc = sortPositionAuditItems(sampleItems, 'status', 'desc');

    // Discrepancies (QUANTITY_MISMATCH, MISSING_IN_PORTFOLIO) must appear before MATCHED
    expect(['QUANTITY_MISMATCH', 'MISSING_IN_PORTFOLIO']).toContain(sortedDesc[0].status);
    expect(['QUANTITY_MISMATCH', 'MISSING_IN_PORTFOLIO']).toContain(sortedDesc[1].status);
    expect(sortedDesc[sortedDesc.length - 1].status).toBe('MATCHED');

    const sortedAsc = sortPositionAuditItems(sampleItems, 'status', 'asc');
    expect(sortedAsc[0].status).toBe('MATCHED');
  });

  it('sorts by Statement Quantity and Portfolio Quantity numerically', () => {
    const sortedQtyAsc = sortPositionAuditItems(sampleItems, 'statementQuantity', 'asc');
    // Lowest quantity is CoveredCall (-1)
    expect(sortedQtyAsc[0].statementQuantity).toBe(-1);
    expect(sortedQtyAsc[0].symbol).toBe('SOFI 21.5 Call');

    // Highest quantity is XOM (63.4198)
    const sortedQtyDesc = sortPositionAuditItems(sampleItems, 'statementQuantity', 'desc');
    expect(sortedQtyDesc[0].symbol).toBe('XOM');
    expect(sortedQtyDesc[0].statementQuantity).toBe(63.4198);
  });

  it('sorts by Statement Value and Portfolio Value numerically with negative values handled properly', () => {
    const sortedValDesc = sortPositionAuditItems(sampleItems, 'statementValue', 'desc');
    // Highest dollar value is NVDA ($14053.09)
    expect(sortedValDesc[0].symbol).toBe('NVDA');
    expect(sortedValDesc[0].statementValue).toBe(14053.09);

    // Second highest is XOM ($10383.09)
    expect(sortedValDesc[1].symbol).toBe('XOM');

    // Lowest dollar value is CoveredCall (-$1.0)
    expect(sortedValDesc[sortedValDesc.length - 1].symbol).toBe('SOFI 21.5 Call');
  });

  it('sorts by Audit Notes alphabetically', () => {
    const sortedNotesAsc = sortPositionAuditItems(sampleItems, 'notes', 'asc');
    expect(sortedNotesAsc[0].notes).toBe('Difference of 5.0 shares.');
    expect(sortedNotesAsc[sortedNotesAsc.length - 1].notes).toBe('Present on statement, missing from portfolio.');
  });

  it('resets custom sort state back to default Symbol ASC', () => {
    // Start with custom sort: statementValue DESC
    let activeKey = 'statementValue';
    let activeDir: SortDirection = 'desc';

    let sorted = sortPositionAuditItems(sampleItems, activeKey, activeDir);
    expect(sorted[0].symbol).toBe('NVDA');

    // Reset sort action triggered
    activeKey = 'symbol';
    activeDir = 'asc';

    sorted = sortPositionAuditItems(sampleItems, activeKey, activeDir);
    expect(sorted[0].symbol).toBe('AMD');
    expect(sorted[1].symbol).toBe('NVDA');
    expect(sorted[sorted.length - 1].symbol).toBe('XOM');
  });

  it('tests sortGenericTable utility across arbitrary record sets', () => {
    const records = [
      { id: '1', balance: 500, label: 'Bravo' },
      { id: '2', balance: 1200, label: 'Alpha' },
      { id: '3', balance: 300, label: 'Charlie' },
    ];

    const sortedByBalanceDesc = sortGenericTable(records, 'balance', 'desc');
    expect(sortedByBalanceDesc[0].balance).toBe(1200);
    expect(sortedByBalanceDesc[2].balance).toBe(300);

    const sortedByLabelAsc = sortGenericTable(records, 'label', 'asc');
    expect(sortedByLabelAsc[0].label).toBe('Alpha');
    expect(sortedByLabelAsc[2].label).toBe('Charlie');
  });
});
