import { describe, it, expect } from 'vitest';
import { normalizeExtraction } from '../../../src/lib/extraction/normalize';
import { stitchWebullScreenshots, RawVisionScreenExtraction } from '../../../src/lib/portfolio/webullStitching';
import { toCanonicalPosition, healAccounts } from '../../../src/lib/portfolio/adapter';
import { getNetWorthDrilldown, getBlendedApyDrilldown, getPortfolioApyDrilldown } from '../../../src/lib/portfolio/drilldownSelectors';
import { blendedApyBreakdown, maturities } from '../../../src/lib/portfolio/selectors';
import { CanonicalAccount } from '../../../src/lib/portfolio/types';

describe('Citi Bank CD & Fixed Income End-to-End Pipeline', () => {
  it('normalizes raw Gemini extraction for Citigold CD with category CD, APY, and maturity date', () => {
    const rawGeminiOutput = {
      institution: 'Citi',
      account: '*******3703',
      accountType: 'Certificate of Deposit',
      accountTotal: 100000.0,
      positions: [
        {
          symbol: 'Certificate of Deposit-3703',
          name: '9-Month Certificate of Deposit',
          category: 'Certificate of Deposit',
          value: 100000.0,
          quantity: 1,
          apy: 3.0,
          maturityDate: '2027-02-15',
        },
      ],
    };

    const normalized = normalizeExtraction(rawGeminiOutput);
    expect(normalized.institution).toBe('Citi');
    expect(normalized.account).toBe('*******3703');
    expect(normalized.accountType).toBe('Certificate of Deposit');
    expect(normalized.positions).toHaveLength(1);

    const cdPos = normalized.positions[0];
    expect(cdPos.category).toBe('CD');
    expect(cdPos.value).toBe(100000.0);
    expect(cdPos.apy).toBe(3.0);
    expect(cdPos.maturityDate).toBe('2027-02-15');
  });

  it('preserves CD assetClass, apy, and maturityDate through multi-screen stitching', () => {
    const screen: RawVisionScreenExtraction = {
      fileName: 'Screenshot 2026-10-07 at 6.04.53 PM.png',
      institution: 'Citi',
      account: '3703',
      accountType: 'Certificate of Deposit',
      netAccountValue: 100000.0,
      cashBalance: 0,
      settledCash: 0,
      positions: [
        {
          symbol: 'Certificate of Deposit-3703',
          name: 'Certificate of Deposit',
          category: 'CD',
          assetClass: 'CD',
          quantity: 1,
          marketValue: 100000.0,
          apy: 3.0,
          maturityDate: '2027-02-15',
        },
      ],
    };

    const stitched = stitchWebullScreenshots([screen]);
    expect(stitched.accounts).toHaveLength(1);
    const acc = stitched.accounts[0];
    expect(acc.deduplicatedPositions).toHaveLength(1);
    const pos = acc.deduplicatedPositions[0];
    expect(pos.assetClass).toBe('CD');
    expect(pos.marketValue).toBe(100000.0);
    expect(pos.apy).toBe(3.0);
    expect(pos.maturityDate).toBe('2027-02-15');
  });

  it('correctly maps to canonical position and routes to Fixed Income in Net Worth drilldown', () => {
    const canonicalPos = toCanonicalPosition(
      {
        symbol: 'Certificate of Deposit-3703',
        name: 'Certificate of Deposit',
        category: 'CD',
        value: 100000.0,
        quantity: 1,
        apy: 3.0,
        maturityDate: '2027-02-15',
      },
      'Citi',
      'citi_3703',
      0
    );

    expect(canonicalPos.assetClass).toBe('CD');
    expect(canonicalPos.apy).toBe(3.0);
    expect(canonicalPos.maturityDate).toBe('2027-02-15');

    const account: CanonicalAccount = {
      id: 'citi_3703',
      institution: 'Citi',
      maskedAccount: '***-3703',
      accountType: 'Certificate of Deposit',
      positions: [canonicalPos],
      updatedAt: '2026-10-11T00:00:00Z',
    };

    const drilldown = getNetWorthDrilldown([account], [canonicalPos]);
    expect(drilldown).toHaveLength(1);
    const row = drilldown[0];
    expect(row.fixedIncomeValue).toBe(100000.0);
    expect(row.equitiesValue).toBe(0.0);
    expect(row.totalNetWorth).toBe(100000.0);
  });

  it('correctly includes Citi CD in blended APY breakdown and yields $3,000 annual income', () => {
    const canonicalPos = toCanonicalPosition(
      {
        symbol: 'Certificate of Deposit-3703',
        name: 'Certificate of Deposit',
        category: 'CD',
        value: 100000.0,
        quantity: 1,
        apy: 3.0,
        maturityDate: '2027-02-15',
      },
      'Citi',
      'citi_3703',
      0
    );

    const breakdown = blendedApyBreakdown([canonicalPos]);
    expect(breakdown.totalValue).toBe(100000.0);
    expect(breakdown.yieldValue).toBe(100000.0);
    expect(breakdown.nonYieldValue).toBe(0.0);
    expect(breakdown.annualIncome).toBe(3000.0);
    expect(breakdown.apyPortfolio).toBe(3.0);
    expect(breakdown.apyYieldBearing).toBe(3.0);
  });

  it('includes Citi CD in yield-bearing assets drilldown table', () => {
    const canonicalPos = toCanonicalPosition(
      {
        symbol: 'Certificate of Deposit-3703',
        name: 'Certificate of Deposit',
        category: 'CD',
        value: 100000.0,
        quantity: 1,
        apy: 3.0,
        maturityDate: '2027-02-15',
      },
      'Citi',
      'citi_3703',
      0
    );

    const account: CanonicalAccount = {
      id: 'citi_3703',
      institution: 'Citi',
      maskedAccount: '***-3703',
      accountType: 'Certificate of Deposit',
      positions: [canonicalPos],
      updatedAt: '2026-10-11T00:00:00Z',
    };

    const yieldRows = getBlendedApyDrilldown([canonicalPos], [account]);
    expect(yieldRows).toHaveLength(1);
    expect(yieldRows[0].institution).toBe('Citi');
    expect(yieldRows[0].apy).toBe(3.0);
    expect(yieldRows[0].annualIncome).toBe(3000.0);

    const portfolioRows = getPortfolioApyDrilldown([canonicalPos], [account]);
    expect(portfolioRows).toHaveLength(1);
    expect(portfolioRows[0].generatesIncome).toBe(true);
    expect(portfolioRows[0].annualIncome).toBe(3000.0);
  });

  it('includes Citi CD in maturities selector due Feb 15, 2027', () => {
    const canonicalPos = toCanonicalPosition(
      {
        symbol: 'Certificate of Deposit-3703',
        name: 'Certificate of Deposit',
        category: 'CD',
        value: 100000.0,
        quantity: 1,
        apy: 3.0,
        maturityDate: '2027-02-15',
      },
      'Citi',
      'citi_3703',
      0
    );

    const mats = maturities([canonicalPos]);
    expect(mats).toHaveLength(1);
    expect(mats[0].position.symbol).toBe('Certificate of Deposit-3703');
    expect(mats[0].maturityDate).toBe('2027-02-15');
  });

  it('retroactively auto-heals an account previously stored as Stock with missing APY', () => {
    const legacyAccount: CanonicalAccount = {
      id: 'citi_3703',
      institution: 'Citi',
      maskedAccount: '***-3703',
      accountType: 'Certificate of Deposit',
      positions: [
        {
          id: 'pos_1',
          symbol: 'Certificate of Deposit-3703',
          name: 'Certificate of Deposit',
          assetClass: 'Stock', // Misclassified legacy state
          quantity: 1,
          marketValue: 100000.0,
          institution: 'Citi',
          accountId: 'citi_3703',
        },
      ],
      updatedAt: '2026-10-07T00:00:00Z',
    };

    const healed = healAccounts([legacyAccount]);
    expect(healed).toHaveLength(1);
    const healedPos = healed[0].positions[0];
    expect(healedPos.assetClass).toBe('CD');
    expect(healedPos.apy).toBe(3.0);
    expect(healedPos.maturityDate).toBe('2027-02-15');
  });
});
