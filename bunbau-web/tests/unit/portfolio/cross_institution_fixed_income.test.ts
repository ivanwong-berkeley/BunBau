import { describe, it, expect } from 'vitest';
import { mapCategory, toCanonicalPosition, healAccounts } from '../../../src/lib/portfolio/adapter';
import { mapLegacyAssetClassToCategory } from '../../../src/lib/types/ingestion';
import { normalizeExtraction } from '../../../src/lib/extraction/normalize';
import { getNetWorthDrilldown } from '../../../src/lib/portfolio/drilldownSelectors';
import { blendedApyBreakdown, allocation } from '../../../src/lib/portfolio/selectors';
import { CanonicalAccount, CanonicalPosition } from '../../../src/lib/portfolio/types';

describe('Cross-Institution Banking & Fixed Income Engine', () => {
  it('correctly maps various banking CD and Treasury category synonyms to canonical asset classes', () => {
    const cdSynonyms = [
      'CD',
      'cd',
      'Certificate of Deposit',
      'certificate of deposit',
      'CERTIFICATE OF DEPOSIT',
      'cert of deposit',
      'time deposit',
      'term deposit',
      'bank cd',
    ];

    for (const syn of cdSynonyms) {
      expect(mapCategory(syn)).toBe('CD');
      expect(mapLegacyAssetClassToCategory(syn)).toBe('CD');
    }

    const treasurySynonyms = [
      'Treasury',
      'treasury',
      'treasury bill',
      't-bill',
      'tbill',
      'treasury note',
      'treasury bond',
      'fixed income',
      'fixed_income',
      'bond',
      'bonds',
      'bond/sgov',
    ];

    for (const syn of treasurySynonyms) {
      expect(mapCategory(syn)).toBe('Treasury');
      expect(mapLegacyAssetClassToCategory(syn)).toBe('Bond_SGOV');
    }

    const cashSynonyms = [
      'cash',
      'Cash',
      'savings',
      'checking',
      'high yield savings',
      'hysa',
      'deposit',
      'money market',
    ];

    for (const syn of cashSynonyms) {
      expect(mapCategory(syn)).toBe('Cash');
      expect(mapLegacyAssetClassToCategory(syn)).toBe('Cash');
    }
  });

  it('normalizes multi-bank screenshots from Chase, Bank of America, and Marcus accurately', () => {
    const chaseExtraction = {
      institution: 'Chase',
      account: '***-9921',
      accountType: 'Certificate of Deposit',
      accountTotal: 50000,
      positions: [
        {
          symbol: 'Chase CD 4.25% 12/01/2026',
          category: 'Certificate of Deposit',
          value: 50000,
          quantity: 1,
        },
      ],
    };

    const normChase = normalizeExtraction(chaseExtraction);
    expect(normChase.positions[0].category).toBe('CD');
    expect(normChase.positions[0].apy).toBe(4.25); // extracted from text!
    expect(normChase.positions[0].maturityDate).toBe('2026-12-01'); // extracted from text!

    const bofaExtraction = {
      institution: 'Bank of America',
      account: '***-4412',
      accountType: 'Fixed Income',
      accountTotal: 75000,
      positions: [
        {
          symbol: 'US TREASURY BILL 05/15/2027 5.10%',
          category: 'Fixed Income',
          value: 75000,
          quantity: 75,
        },
      ],
    };

    const normBofa = normalizeExtraction(bofaExtraction);
    expect(normBofa.positions[0].category).toBe('Treasury');
    expect(normBofa.positions[0].apy).toBe(5.10);
    expect(normBofa.positions[0].maturityDate).toBe('2027-05-15');
  });

  it('correctly aggregates multi-institution portfolio net worth and allocation slices', () => {
    const citiPos = toCanonicalPosition(
      {
        symbol: 'Citi CD 3.00%',
        category: 'CD',
        value: 100000,
        apy: 3.0,
        maturityDate: '2027-02-15',
      },
      'Citi',
      'citi_1',
      0
    );

    const schwabCd = toCanonicalPosition(
      {
        symbol: 'NorthPointe Bank CD 4.05%',
        category: 'CD',
        value: 79000,
        apy: 4.05,
        maturityDate: '2026-12-22',
      },
      'Charles Schwab',
      'schwab_1',
      0
    );

    const schwabTreasury = toCanonicalPosition(
      {
        symbol: 'SGOV',
        category: 'Treasury',
        value: 76430,
        apy: 5.10,
      },
      'Charles Schwab',
      'schwab_1',
      1
    );

    const webullStock = toCanonicalPosition(
      {
        symbol: 'NVDA',
        category: 'Stock',
        value: 50000,
      },
      'WeBull',
      'webull_1',
      0
    );

    const allPositions = [citiPos, schwabCd, schwabTreasury, webullStock];
    const accounts: CanonicalAccount[] = [
      { id: 'citi_1', institution: 'Citi', maskedAccount: '***-3703', accountType: 'Certificate of Deposit', positions: [citiPos], updatedAt: '2026-10-11' },
      { id: 'schwab_1', institution: 'Charles Schwab', maskedAccount: '***-0281', accountType: 'Living Trust', positions: [schwabCd, schwabTreasury], updatedAt: '2026-10-11' },
      { id: 'webull_1', institution: 'WeBull', maskedAccount: '***-CUX5', accountType: 'Individual Cash', positions: [webullStock], updatedAt: '2026-10-11' },
    ];

    const netWorthRows = getNetWorthDrilldown(accounts, allPositions);
    const citiRow = netWorthRows.find(r => r.institution === 'Citi');
    expect(citiRow?.fixedIncomeValue).toBe(100000);
    expect(citiRow?.equitiesValue).toBe(0);

    const schwabRow = netWorthRows.find(r => r.institution === 'Charles Schwab');
    expect(schwabRow?.fixedIncomeValue).toBe(79000 + 76430);
    expect(schwabRow?.equitiesValue).toBe(0);

    const webullRow = netWorthRows.find(r => r.institution === 'WeBull');
    expect(webullRow?.fixedIncomeValue).toBe(0);
    expect(webullRow?.equitiesValue).toBe(50000);

    // Allocation slices
    const alloc = allocation(allPositions);
    const cdSlice = alloc.find(a => a.label === 'CDs');
    expect(cdSlice?.value).toBe(179000); // 100K Citi + 79K Schwab

    const sgovSlice = alloc.find(a => a.label === 'SGOV/Bonds');
    expect(sgovSlice?.value).toBe(76430);

    const eqSlice = alloc.find(a => a.label === 'Equities');
    expect(eqSlice?.value).toBe(50000);
  });
});
