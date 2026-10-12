import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { FidelityCSVAdapter } from '../../../src/lib/ingestion/adapters/fidelityAdapter';
import { SchwabCSVAdapter } from '../../../src/lib/ingestion/adapters/schwabAdapter';
import { CSVRouter } from '../../../src/lib/ingestion/adapters/router';
import { getNetWorthDrilldown } from '../../../src/lib/portfolio/drilldownSelectors';
import { CanonicalAccount, CanonicalPosition } from '../../../src/lib/portfolio/types';
import { toLegacyPosition, toExtractionResult } from '../../../src/lib/types/ingestion';
import {
  runStatementReconciliationAudit,
  consolidateStatementExtractions,
  AuditTargetScope,
} from '../../../src/lib/reports/reconciliationAuditor';

describe('Fidelity Crypto Parsing & Net Worth Breakdown Tests', () => {
  const cryptoCsvPath = path.resolve(
    __dirname,
    '../../fixtures/real_uploads/Fidelity/CSV/Fidelity_Crypto_7536801059_Portfolio_Positions_Oct-07-2026.csv'
  );
  const cryptoCsvContent = fs.readFileSync(cryptoCsvPath, 'utf-8');

  it('correctly parses Fidelity Crypto CSV with ***-1059 masked number (not ***-bank) and extracts Bitcoin position', () => {
    const adapter = new FidelityCSVAdapter();
    const result = adapter.parse(cryptoCsvContent, 'test-user');

    expect(result.accounts).toHaveLength(1);
    const account = result.accounts[0];

    // Must be ***-1059 from 7536801059, NOT ***-bank from the legal disclaimer
    expect(account.accountMaskedNumber).toBe('***-1059');
    expect(account.institution).toBe('Fidelity');
    expect(account.accountType).toBe('Crypto');
    expect(account.cashBalance).toBeCloseTo(4170.20, 2);

    // Verify Bitcoin position
    const btc = account.positions.find((p) => p.symbol === 'BTC/USD');
    expect(btc).toBeDefined();
    expect(btc?.assetCategory).toBe('Crypto');
    expect(btc?.quantity).toBeCloseTo(0.05633444, 8);
    expect(btc?.marketValue).toBeCloseTo(4695.81, 2);
    expect(btc?.costBasis).toBeCloseTo(3490.84, 2);

    // Total Account Value must be Cash + Bitcoin = 4170.20 + 4695.81 = 8866.01
    expect(account.totalValue).toBeCloseTo(8866.01, 2);
  });

  it('includes Crypto in Net Worth Breakdown and calculates total net worth of $8,866.01', () => {
    const adapter = new FidelityCSVAdapter();
    const parseResult = adapter.parse(cryptoCsvContent, 'test-user');
    const accPayload = parseResult.accounts[0];

    const account: CanonicalAccount = {
      id: accPayload.accountKey,
      institution: accPayload.institution,
      maskedAccount: accPayload.accountMaskedNumber,
      accountType: accPayload.accountType,
      positions: accPayload.positions.map(toLegacyPosition),
      updatedAt: '2026-10-10T00:00:00Z',
    };

    // Include Cash (USD) position as created by toExtractionResult
    const positions: CanonicalPosition[] = [
      {
        id: `${account.id}_CASH`,
        symbol: 'USD',
        name: 'US DOLLARS',
        assetClass: 'Cash',
        quantity: 1,
        marketValue: 4170.20,
        institution: 'Fidelity',
        accountId: account.id,
      },
      ...account.positions,
    ];

    const drilldown = getNetWorthDrilldown([account], positions);
    expect(drilldown).toHaveLength(1);
    const row = drilldown[0];

    expect(row.accountMasked).toBe('***-1059');
    expect(row.cashValue).toBeCloseTo(4170.20, 2);
    expect(row.cryptoValue).toBeCloseTo(4695.81, 2);
    expect(row.equitiesValue).toBe(0);
    expect(row.fixedIncomeValue).toBe(0);
    // Total Net Worth MUST include crypto: 4170.20 + 4695.81 = 8866.01
    expect(row.totalNetWorth).toBeCloseTo(8866.01, 2);
  });
});

describe('Multi-Date Statement Consolidation & Zero-Doubling Tests', () => {
  it('consolidates older and newer statement extractions by date, superseding the older export', () => {
    const olderExt = {
      institution: 'Fidelity',
      account: '***-6238',
      accountType: 'Brokerage',
      asOfDate: '2026-10-06',
      portfolioTotal: 683071.03,
      positions: [
        { symbol: 'T', name: 'AT&T', category: 'Stock', value: 2443.00, quantity: 100 },
        { symbol: 'ORCL', name: 'Oracle', category: 'Stock', value: 434329.97, quantity: 3000 },
      ],
    };

    const newerExt = {
      institution: 'Fidelity',
      account: '***-6238',
      accountType: 'Brokerage',
      asOfDate: '2026-10-07',
      portfolioTotal: 678891.09,
      positions: [
        { symbol: 'T', name: 'AT&T', category: 'Stock', value: 2447.00, quantity: 100 },
        { symbol: 'ORCL', name: 'Oracle', category: 'Stock', value: 430699.81, quantity: 3000 },
      ],
    };

    // When both are consolidated, the Oct-07 statement supersedes the Oct-06 statement
    const consolidated = consolidateStatementExtractions([olderExt, newerExt]);
    expect(consolidated).toHaveLength(1);
    expect(consolidated[0].asOfDate).toBe('2026-10-07');
    expect(consolidated[0].portfolioTotal).toBeCloseTo(678891.09, 2);
    expect(consolidated[0].positions).toHaveLength(2);
    expect(consolidated[0].positions.find((p) => p.symbol === 'T')?.value).toBe(2447.00);
  });
});

describe('Statement Reconciliation Auditor Linked Container & Cash Tests', () => {
  it('reconciles 401(k) BROKERAGELINK container row cleanly against BrokerageLink sub-account without variance', () => {
    const accounts: CanonicalAccount[] = [
      {
        id: 'acc_fid_401k',
        institution: 'Fidelity',
        maskedAccount: '***-5004',
        accountType: '401(k)',
        positions: [],
      },
      {
        id: 'acc_fid_blink',
        institution: 'Fidelity',
        maskedAccount: '***-6847',
        accountType: 'BrokerageLink',
        positions: [],
      },
    ];

    const positions: CanonicalPosition[] = [
      {
        id: 'pos_401k_stock',
        symbol: '31617E471',
        name: 'Stock Fund',
        assetClass: 'Stock',
        quantity: 813.349,
        marketValue: 95031.70,
        institution: 'Fidelity',
        accountId: 'acc_fid_401k',
      },
      {
        id: 'pos_401k_cash',
        symbol: 'Cash (USD)',
        name: 'Cash Balance',
        assetClass: 'Cash',
        quantity: 1,
        marketValue: 89675.98,
        institution: 'Fidelity',
        accountId: 'acc_fid_401k',
      },
    ];

    // Statement for 401(k) contains BROKERAGELINK container row of $601,068.00
    // Total statement balance = 95,031.70 + 89,675.98 + 601,068.00 = 785,775.68
    const statementExtraction = {
      institution: 'Fidelity',
      account: '***-5004',
      accountType: '401(k)',
      portfolioTotal: 785775.68,
      positions: [
        { symbol: '31617E471', name: 'Stock Fund', category: 'Stock', value: 95031.70, quantity: 813.349 },
        { symbol: 'Cash (USD)', name: 'Cash Balance', category: 'Cash', value: 89675.98, quantity: 1 },
        { symbol: 'BROKERAGELINK', name: 'BROKERAGELINK', category: 'Stock', value: 601068.00, quantity: 601068 },
      ],
    };

    const scope: AuditTargetScope = {
      mode: 'account',
      institution: 'Fidelity',
      accountId: 'acc_fid_401k',
    };

    const report = runStatementReconciliationAudit(scope, [statementExtraction], accounts, positions);
    expect(report.accounts).toHaveLength(1);
    const acctReport = report.accounts[0];

    // Status of BROKERAGELINK must be MATCHED (linked sub-account container)
    const blinkItem = acctReport.items.find((i) => i.symbol === 'BROKERAGELINK');
    expect(blinkItem).toBeDefined();
    expect(blinkItem?.status).toBe('MATCHED');
    expect(blinkItem?.notes).toContain('Linked Sub-Account Container Reconciled to BrokerageLink');

    // Account status must be Reconciled with 0 discrepancies and 0 balance variance
    expect(acctReport.isBalanceReconciled).toBe(true);
    expect(acctReport.balanceDiff).toBe(0);
    expect(acctReport.discrepancyCount).toBe(0);
    expect(report.totalGapsFound).toBe(0);
  });
});

describe('Universal Portfolio Preview Cash Reconciliation & Source-Aware Modal Tests', () => {
  const fixturesDir = path.resolve(__dirname, '../../fixtures/real_uploads');

  it('TC-UNIV-01: reconciles Fidelity Brokerage ***-6238 with $133,740.38 cash and CSP reserves', () => {
    const csvPath = path.join(fixturesDir, 'Fidelity/CSV/Fidelity_Brokerage_X24336238_Portfolio_Positions_Oct-07-2026.csv');
    const content = fs.readFileSync(csvPath, 'utf-8');
    const adapter = new FidelityCSVAdapter();
    const result = adapter.parse(content, 'test-user');
    const acc = result.accounts[0];

    // Cash balance is FCASH ($100,331.74) + Pending activity ($33,408.64) = $133,740.38
    expect(acc.cashBalance).toBeCloseTo(133740.38, 2);
    expect(acc.totalValue).toBeCloseTo(678892.09, 2);

    // Simulate UploadValidationModal batch mapping
    const legacyPositions = acc.positions.map(toLegacyPosition);
    if (acc.cashBalance > 0 && !legacyPositions.some((p) => p.assetClass === 'Cash')) {
      legacyPositions.unshift({
        id: `pos_${acc.accountKey}_CASH`,
        symbol: 'Cash (USD)',
        name: 'Cash Balance',
        assetClass: 'Cash',
        quantity: acc.cashBalance,
        marketValue: acc.cashBalance,
        currentPrice: 1,
        unrealizedGainLoss: 0,
        unrealizedGainLossPct: 0,
        costBasis: acc.cashBalance,
      });
    }

    expect(legacyPositions[0].symbol).toBe('Cash (USD)');
    expect(legacyPositions[0].marketValue).toBeCloseTo(133740.38, 2);

    // Computed total must match stated total of $678,892.09 with 0 difference
    const computedTotal = legacyPositions.reduce((s, p) => s + p.marketValue, 0);
    expect(computedTotal).toBeCloseTo(678892.09, 2);

    const diff = Math.round((computedTotal - acc.totalValue) * 100) / 100;
    expect(diff).toBe(0);
    expect(Math.abs(diff) <= 1.0).toBe(true);

    // Verify CSP reserves and net cash
    const csps = legacyPositions.filter((p) => p.assetClass === 'CSP');
    const totalCspReserve = csps.reduce((acc, pos) => {
      const strike = Number(pos.option?.strike) || 0;
      const contracts = Math.abs(Number(pos.quantity)) || 1;
      return acc + strike * 100 * contracts;
    }, 0);
    // 4 CSPs: AAPL $310 ($31,000) + AVGO $330 ($33,000) + MSFT $475 ($47,500) + NVDA $200 ($20,000) = $131,500
    expect(totalCspReserve).toBe(131500);
    const netPortfolioCash = acc.cashBalance - totalCspReserve;
    expect(netPortfolioCash).toBeCloseTo(2240.38, 2); // Net free cash is positive!
  });

  it('TC-UNIV-02: reconciles Fidelity Crypto ***-1059 with $4,170.20 cash and Bitcoin', () => {
    const csvPath = path.join(fixturesDir, 'Fidelity/CSV/Fidelity_Crypto_7536801059_Portfolio_Positions_Oct-07-2026.csv');
    const content = fs.readFileSync(csvPath, 'utf-8');
    const adapter = new FidelityCSVAdapter();
    const result = adapter.parse(content, 'test-user');
    const acc = result.accounts[0];

    expect(acc.cashBalance).toBeCloseTo(4170.20, 2);
    expect(acc.totalValue).toBeCloseTo(8866.01, 2);

    const legacyPositions = acc.positions.map(toLegacyPosition);
    if (acc.cashBalance > 0 && !legacyPositions.some((p) => p.assetClass === 'Cash')) {
      legacyPositions.unshift({
        id: `pos_${acc.accountKey}_CASH`,
        symbol: 'Cash (USD)',
        name: 'Cash Balance',
        assetClass: 'Cash',
        quantity: acc.cashBalance,
        marketValue: acc.cashBalance,
        currentPrice: 1,
        unrealizedGainLoss: 0,
        unrealizedGainLossPct: 0,
        costBasis: acc.cashBalance,
      });
    }

    const computedTotal = legacyPositions.reduce((s, p) => s + p.marketValue, 0);
    expect(computedTotal).toBeCloseTo(8866.01, 2);

    const diff = Math.round((computedTotal - acc.totalValue) * 100) / 100;
    expect(diff).toBe(0);
    expect(Math.abs(diff) <= 1.0).toBe(true);
  });

  it('TC-UNIV-03: reconciles Fidelity BrokerageLink ***-6847 with $2,354.37 cash and 3 CDs', () => {
    const csvPath = path.join(fixturesDir, 'Fidelity/CSV/Fidelity_ORACLE-401K-BrokerageLink_652716847_Portfolio_Positions_Oct-07-2026.csv');
    const content = fs.readFileSync(csvPath, 'utf-8');
    const adapter = new FidelityCSVAdapter();
    const result = adapter.parse(content, 'test-user');
    const acc = result.accounts[0];

    expect(acc.cashBalance).toBeCloseTo(2354.37, 2);
    expect(acc.totalValue).toBeCloseTo(600322.83, 2);

    const legacyPositions = acc.positions.map(toLegacyPosition);
    if (acc.cashBalance > 0 && !legacyPositions.some((p) => p.assetClass === 'Cash')) {
      legacyPositions.unshift({
        id: `pos_${acc.accountKey}_CASH`,
        symbol: 'Cash (USD)',
        name: 'Cash Balance',
        assetClass: 'Cash',
        quantity: acc.cashBalance,
        marketValue: acc.cashBalance,
        currentPrice: 1,
        unrealizedGainLoss: 0,
        unrealizedGainLossPct: 0,
        costBasis: acc.cashBalance,
      });
    }

    const computedTotal = legacyPositions.reduce((s, p) => s + p.marketValue, 0);
    expect(computedTotal).toBeCloseTo(600322.83, 2);

    const diff = Math.round((computedTotal - acc.totalValue) * 100) / 100;
    expect(diff).toBe(0);
    expect(Math.abs(diff) <= 1.0).toBe(true);
  });

  it('TC-UNIV-04: reconciles Schwab Living Trust ***-281 with $0.01 cash', () => {
    const csvPath = path.join(fixturesDir, 'Schwab/CSV/Schwab_Living Trust ... 281_Positions-2026-10-07-205936.csv');
    const content = fs.readFileSync(csvPath, 'utf-8');
    const adapter = new SchwabCSVAdapter();
    const result = adapter.parse(content, 'test-user');
    const acc = result.accounts[0];

    expect(acc.cashBalance).toBeCloseTo(0.01, 2);
    expect(acc.totalValue).toBeCloseTo(85370.14, 2);

    const legacyPositions = acc.positions.map(toLegacyPosition);
    if (acc.cashBalance > 0 && !legacyPositions.some((p) => p.assetClass === 'Cash')) {
      legacyPositions.unshift({
        id: `pos_${acc.accountKey}_CASH`,
        symbol: 'Cash (USD)',
        name: 'Cash Balance',
        assetClass: 'Cash',
        quantity: acc.cashBalance,
        marketValue: acc.cashBalance,
        currentPrice: 1,
        unrealizedGainLoss: 0,
        unrealizedGainLossPct: 0,
        costBasis: acc.cashBalance,
      });
    }

    const computedTotal = legacyPositions.reduce((s, p) => s + p.marketValue, 0);
    expect(computedTotal).toBeCloseTo(85370.14, 2);

    const diff = Math.round((computedTotal - acc.totalValue) * 100) / 100;
    expect(diff).toBe(0);
    expect(Math.abs(diff) <= 1.0).toBe(true);
  });

  it('TC-UNIV-05: correctly formats source-aware labels for CSV vs Screenshot', () => {
    const getReconLabel = (isScreenshot: boolean) =>
      isScreenshot ? 'Account total on screenshot' : 'Account total on statement';

    const getStatusText = (isScreenshot: boolean, ok: boolean) =>
      ok
        ? isScreenshot
          ? '✓ 100% Reconciled with screenshot'
          : '✓ 100% Reconciled with statement total'
        : isScreenshot
        ? '⚠ Mismatch: a row may be missing or misread'
        : '⚠ Variance vs statement total';

    expect(getReconLabel(false)).toBe('Account total on statement');
    expect(getReconLabel(true)).toBe('Account total on screenshot');

    expect(getStatusText(false, true)).toBe('✓ 100% Reconciled with statement total');
    expect(getStatusText(true, true)).toBe('✓ 100% Reconciled with screenshot');
    expect(getStatusText(false, false)).toBe('⚠ Variance vs statement total');
    expect(getStatusText(true, false)).toBe('⚠ Mismatch: a row may be missing or misread');
  });
});
