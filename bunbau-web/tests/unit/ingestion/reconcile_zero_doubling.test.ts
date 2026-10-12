import { describe, it, expect } from 'vitest';
import { reconcileAccounts } from '../../../src/lib/ingestion/reconcile';
import {
  legacyAccountToPayload,
  extractionResultToPayload,
  toExtractionResult,
  CanonicalAccountPayload,
} from '../../../src/lib/types/ingestion';
import { CanonicalAccount, ExtractionResult } from '../../../src/lib/portfolio/types';

describe('Dual-Source Zero Doubling Reconciliation Engine', () => {
  it('enforces single authoritative cash and equity balance (zero doubling guarantee)', () => {
    const userId = 'user_fidelity_test';

    // Account data simulated from Fidelity Screenshot
    const screenshotAccount: CanonicalAccountPayload = {
      accountKey: 'acc_fidelity_6238',
      institution: 'Fidelity',
      accountName: 'Individual - TOD',
      accountMaskedNumber: '...6238',
      accountType: 'Brokerage',
      totalValue: 679012.96,
      cashBalance: 100215.35,
      positions: [
        {
          positionKey: 'pos_nvda',
          accountKey: 'acc_fidelity_6238',
          symbol: 'NVDA',
          description: 'NVIDIA CORP',
          assetCategory: 'Stock',
          quantity: 200,
          costBasis: 24000,
          currentPrice: 130.5,
          marketValue: 26100,
          unrealizedGainLoss: 2100,
          unrealizedGainLossPct: 8.75,
          dataSource: 'SCREENSHOT',
          updatedAt: '2026-10-06T00:00:00Z',
        },
        {
          positionKey: 'pos_tsla_put',
          accountKey: 'acc_fidelity_6238',
          symbol: 'TSLA 241018P210',
          description: 'TESLA INC PUT',
          assetCategory: 'Option',
          quantity: -2,
          costBasis: 0,
          currentPrice: 3.5,
          marketValue: -700,
          unrealizedGainLoss: 0,
          unrealizedGainLossPct: 0,
          optionDetails: {
            underlying: 'TSLA',
            type: 'PUT',
            strike: 210,
            expirationDate: '2024-10-18',
            isCollateralizedCsp: true,
            contractsCount: 2,
          },
          dataSource: 'SCREENSHOT',
          updatedAt: '2026-10-06T00:00:00Z',
        },
      ],
      rawSourceFiles: [],
      sourceType: 'SCREENSHOT',
      extractedAt: '2026-10-06T00:00:00Z',
      version: 1,
    };

    // Account data simulated from Fidelity CSV Export
    const csvAccount: CanonicalAccountPayload = {
      accountKey: 'acc_fidelity_6238',
      institution: 'Fidelity',
      accountName: 'Individual - TOD',
      accountMaskedNumber: 'Z12346238',
      accountType: 'Brokerage',
      totalValue: 679012.96,
      cashBalance: 100215.36, // CSV precision
      positions: [
        {
          positionKey: 'pos_nvda',
          accountKey: 'acc_fidelity_6238',
          symbol: 'NVDA',
          description: 'NVIDIA CORP COM',
          assetCategory: 'Stock',
          quantity: 200.0,
          costBasis: 24120.55, // CSV exact cost basis
          currentPrice: 130.5,
          marketValue: 26100.0,
          unrealizedGainLoss: 1979.45,
          unrealizedGainLossPct: 8.21,
          dataSource: 'CSV',
          updatedAt: '2026-10-06T00:00:00Z',
        },
        {
          positionKey: 'pos_tsla_put',
          accountKey: 'acc_fidelity_6238',
          symbol: 'TSLA 241018P210',
          description: 'TESLA INC PUT',
          assetCategory: 'Option',
          quantity: -2,
          costBasis: -1200,
          currentPrice: 3.5,
          marketValue: -700,
          unrealizedGainLoss: 500,
          unrealizedGainLossPct: 41.67,
          optionDetails: {
            underlying: 'TSLA',
            type: 'PUT',
            strike: 210,
            expirationDate: '2024-10-18',
            isCollateralizedCsp: true,
            contractsCount: 2,
          },
          dataSource: 'CSV',
          updatedAt: '2026-10-06T00:00:00Z',
        },
      ],
      rawSourceFiles: [],
      sourceType: 'CSV',
      extractedAt: '2026-10-06T00:00:00Z',
      version: 1,
    };

    const { mergedAccounts, diffs } = reconcileAccounts([screenshotAccount], [csvAccount], userId);

    expect(mergedAccounts).toHaveLength(1);
    const reconciled = mergedAccounts[0];

    // ZERO DOUBLING CHECKS
    // 1. Authoritative cash is preserved, NOT doubled
    expect(reconciled.cashBalance).toBe(100215.36);
    expect(reconciled.cashBalance).not.toBe(200430.71);

    // 2. Collateral locked is computed once: 2 contracts * 210 strike * 100 = $42,000 (NOT $84,000)
    const diff = diffs[0];
    expect(diff.totalLockedCollateral).toBe(42000);
    expect(diff.netFreeCash).toBe(100215.36 - 42000);

    // 3. Positions are deduplicated and enriched
    expect(reconciled.positions).toHaveLength(2);
    const nvda = reconciled.positions.find((p) => p.symbol === 'NVDA');
    expect(nvda).toBeDefined();
    expect(nvda?.dataSource).toBe('MERGED');
    expect(nvda?.costBasis).toBe(24120.55); // CSV exact cost basis preserved

    // 4. Converted ExtractionResult retains correct zero-doubled portfolio total
    const converted = toExtractionResult(reconciled);
    expect(converted.institution).toBe('Fidelity');
    expect(converted.portfolioTotal).toBe(reconciled.totalValue);
  });

  it('correctly converts between legacy CanonicalAccount and CanonicalAccountPayload', () => {
    const legacyAcc: CanonicalAccount = {
      id: 'acc_fidelity_6238',
      institution: 'Fidelity',
      maskedAccount: '...6238',
      accountType: 'Brokerage',
      positions: [
        {
          id: 'pos_cash',
          symbol: 'Cash (USD)',
          name: 'Core Cash',
          assetClass: 'Cash',
          quantity: 1,
          marketValue: 50000,
          institution: 'Fidelity',
          accountId: 'acc_fidelity_6238',
        },
        {
          id: 'pos_stock',
          symbol: 'SPY',
          name: 'SPDR S&P 500 ETF',
          assetClass: 'ETF',
          quantity: 100,
          marketValue: 58000,
          costBasis: 52000,
          institution: 'Fidelity',
          accountId: 'acc_fidelity_6238',
        },
      ],
      updatedAt: '2026-10-06T00:00:00Z',
    };

    const payload = legacyAccountToPayload(legacyAcc, 'user1', 'SCREENSHOT');
    expect(payload.cashBalance).toBe(50000);
    expect(payload.positions).toHaveLength(1); // non-cash
    expect(payload.positions[0].symbol).toBe('SPY');
    expect(payload.totalValue).toBe(108000);
  });

  it('correctly converts ExtractionResult to CanonicalAccountPayload', () => {
    const extraction: ExtractionResult = {
      institution: 'Fidelity',
      account: 'Z12346238',
      portfolioTotal: 108000,
      unsettledCash: 0,
      positions: [
        {
          symbol: 'Cash (USD)',
          name: 'Cash Balance',
          category: 'Cash',
          value: 50000,
          quantity: 1,
          price: 50000,
        },
        {
          symbol: 'SPY',
          name: 'SPDR S&P 500 ETF',
          category: 'ETF',
          value: 58000,
          quantity: 100,
          price: 580,
          costBasis: 52000,
        },
      ],
    };

    const payload = extractionResultToPayload(extraction, 'user1', 'CSV');
    expect(payload.cashBalance).toBe(50000);
    expect(payload.positions).toHaveLength(1);
    expect(payload.positions[0].symbol).toBe('SPY');
    expect(payload.totalValue).toBe(108000);
  });

  it('guarantees currentPrice is always a valid number even when ExtractedRow lacks price property', () => {
    // ExtractedRow where 'price' is completely omitted (standard ExtractedRow interface)
    const extractionWithoutPrice: ExtractionResult = {
      institution: 'Fidelity',
      account: 'Z12346238',
      portfolioTotal: 5000,
      unsettledCash: 0,
      positions: [
        {
          symbol: 'TSLA',
          name: 'Tesla Inc',
          category: 'Stock',
          value: 5000,
          quantity: 20,
          // price omitted!
        },
      ],
    };

    const payload = extractionResultToPayload(extractionWithoutPrice, 'user1', 'CSV');
    expect(payload.positions[0].currentPrice).toBe(250); // 5000 / 20 = 250
    expect(typeof payload.positions[0].currentPrice).toBe('number');
    expect(payload.positions[0].currentPrice.toLocaleString('en-US')).toBe('250');
  });

  it('guarantees reconcileAccounts outputs valid currentPrice for UI toLocaleString rendering', () => {
    const ssAccount: CanonicalAccountPayload = {
      accountKey: 'acc_1',
      institution: 'Fidelity',
      accountName: 'Brokerage',
      accountMaskedNumber: '6238',
      accountType: 'Brokerage',
      totalValue: 5000,
      cashBalance: 0,
      positions: [
        {
          positionKey: 'pos_tsla',
          accountKey: 'acc_1',
          symbol: 'TSLA',
          description: 'Tesla',
          assetCategory: 'Stock',
          quantity: 20,
          costBasis: 4000,
          currentPrice: 0, // Zero or missing price
          marketValue: 5000,
          unrealizedGainLoss: 1000,
          unrealizedGainLossPct: 25,
          dataSource: 'SCREENSHOT',
          updatedAt: '2026-10-06T00:00:00Z',
        },
      ],
      rawSourceFiles: [],
      sourceType: 'SCREENSHOT',
      extractedAt: '2026-10-06T00:00:00Z',
      version: 1,
    };

    const csvAccount: CanonicalAccountPayload = {
      ...ssAccount,
      sourceType: 'CSV',
      positions: [
        {
          ...ssAccount.positions[0],
          currentPrice: 250, // CSV has price
          dataSource: 'CSV',
        },
      ],
    };

    const { mergedAccounts } = reconcileAccounts([ssAccount], [csvAccount], 'user1');
    const pos = mergedAccounts[0].positions[0];

    // Must be valid number
    expect(pos.currentPrice).toBe(250);
    expect(() => pos.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })).not.toThrow();
    expect(pos.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })).toBe('250.00');
  });
});
