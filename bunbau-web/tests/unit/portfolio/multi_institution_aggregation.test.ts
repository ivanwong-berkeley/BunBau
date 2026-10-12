import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { FidelityCSVAdapter } from '../../../src/lib/ingestion/adapters/fidelityAdapter';
import { SchwabCSVAdapter } from '../../../src/lib/ingestion/adapters/schwabAdapter';
import { WebullOrdersAdapter } from '../../../src/lib/ingestion/adapters/webullReconstructor';
import { parseCitiBalancesWorkbook } from '../../../src/lib/ingestion/adapters/citiXlsxAdapter';
import { parseFilenameMetadata } from '../../../src/lib/ingestion/filenameParser';
import { reconcileLinkedSubAccounts } from '../../../src/lib/ingestion/reconcile';
import type { CanonicalAccountPayload } from '../../../src/lib/types/ingestion';

describe('Multi-Institution Multi-Account Portfolio Aggregation', () => {
  const fixturesDir = path.resolve(__dirname, '../../fixtures/real_uploads');

  it('aggregates all 10 real sample files across Fidelity, Schwab, Citi, and WeBull', () => {
    const accounts: CanonicalAccountPayload[] = [];
    const fidelityAdapter = new FidelityCSVAdapter();
    const schwabAdapter = new SchwabCSVAdapter();
    const webullAdapter = new WebullOrdersAdapter();

    // 1. Ingest Fidelity Accounts (Brokerage, Crypto, Viapath 401k, Oracle 401k, Oracle BrokerageLink)
    const fidFiles = [
      'Fidelity/CSV/Fidelity_Brokerage_X24336238_Portfolio_Positions_Oct-07-2026.csv',
      'Fidelity/CSV/Fidelity_Crypto_7536801059_Portfolio_Positions_Oct-07-2026.csv',
      'Fidelity/CSV/Fidelity_VIAPATH-401K_32480_Portfolio_Positions_Oct-07-2026.csv',
      'Fidelity/CSV/Fidelity_ORACLE-401K_35004_Portfolio_Positions_Oct-07-2026.csv',
      'Fidelity/CSV/Fidelity_ORACLE-401K-BrokerageLink_652716847_Portfolio_Positions_Oct-07-2026.csv',
    ];

    for (const rel of fidFiles) {
      const full = path.join(fixturesDir, rel);
      const text = fs.readFileSync(full, 'utf-8');
      const meta = parseFilenameMetadata(path.basename(rel));
      const res = fidelityAdapter.parse(text, 'user-multi', meta);
      accounts.push(...res.accounts);
    }

    // 2. Ingest Schwab Accounts (Living Trust, Rollover IRA)
    const schwabFiles = [
      'Schwab/CSV/Schwab_Living Trust ... 281_Positions-2026-10-07-205936.csv',
      'Schwab/CSV/Schwab_Rollover-IRA ...673_Positions-2026-10-07-205829.csv',
    ];

    for (const rel of schwabFiles) {
      const full = path.join(fixturesDir, rel);
      const text = fs.readFileSync(full, 'utf-8');
      const meta = parseFilenameMetadata(path.basename(rel));
      const res = schwabAdapter.parse(text, 'user-multi', meta);
      accounts.push(...res.accounts);
    }

    // 3. Ingest Citi Accounts (Brokerage XLSX, IRA XLSX)
    const citiFiles = [
      'Citi/CSV/CITI_Brokerage_CZ5009836_Balances_Summary_10_07_2026.xlsx',
      'Citi/CSV/Citi_IRA_CZ5009834_Balances_Summary_10_07_2026.xlsx',
    ];

    for (const rel of citiFiles) {
      const full = path.join(fixturesDir, rel);
      const buf = fs.readFileSync(full);
      const meta = parseFilenameMetadata(path.basename(rel));
      const res = parseCitiBalancesWorkbook(buf.buffer, meta);
      accounts.push({
        accountKey: res.accountKey,
        institution: 'Citi',
        accountName: `Citi ${res.accountType}`,
        accountMaskedNumber: `***-${res.accountNumber}`,
        accountType: res.accountType,
        totalValue: res.totalBalance,
        cashBalance: res.cashBalance,
        positions: res.positions,
        rawSourceFiles: [],
        sourceType: 'CSV',
        extractedAt: res.asOfDate,
        version: 1,
      });
    }

    // 4. Ingest WeBull Accounts (Individual Cash orders)
    const webullFile = 'Webull/CSV/Individual-Cash_CUX5XLW4/Webull_Individual-Cash_CUX5XLW4_Orders_Records_20261007.csv';
    const webullText = fs.readFileSync(path.join(fixturesDir, webullFile), 'utf-8');
    const webullMeta = parseFilenameMetadata(path.basename(webullFile));
    const webullRes = webullAdapter.parse(webullText, 'user-multi', webullMeta);
    accounts.push(...webullRes.accounts);

    // Reconcile sub-accounts (Oracle 401(k) + BrokerageLink)
    const finalAccounts = reconcileLinkedSubAccounts(accounts);

    // Verify all 4 institutions are present
    const institutions = Array.from(new Set(finalAccounts.map(a => a.institution)));
    expect(institutions).toContain('Fidelity');
    expect(institutions).toContain('Charles Schwab');
    expect(institutions).toContain('Citi');
    expect(institutions).toContain('WeBull');

    // Verify institution totals
    const fidelityTotal = finalAccounts.filter(a => a.institution === 'Fidelity').reduce((s, a) => s + a.totalValue, 0);
    const schwabTotal = finalAccounts.filter(a => a.institution === 'Charles Schwab').reduce((s, a) => s + a.totalValue, 0);
    const citiTotal = finalAccounts.filter(a => a.institution === 'Citi').reduce((s, a) => s + a.totalValue, 0);

    // Schwab Total: 85,370.14 (Living Trust) + 251,246.65 (Rollover IRA) = 336,616.79
    expect(schwabTotal).toBeCloseTo(336616.79, 1);

    // Citi Total: 101,185.96 (Brokerage) + 200,069.68 (IRA) = 301,255.64
    expect(citiTotal).toBeCloseTo(301255.64, 1);

    // Fidelity Total: ~678k (Brokerage) + ~8.8k (Crypto) + ~282k (Viapath) + ~785k (Oracle 401k + BrokerageLink) = ~1.75M
    expect(fidelityTotal).toBeGreaterThan(1700000);
    expect(fidelityTotal).toBeLessThan(1850000); // Guarantees zero double counting of Oracle 401(k) BrokerageLink!

    const overallPortfolioTotal = finalAccounts.reduce((s, a) => s + a.totalValue, 0);
    expect(overallPortfolioTotal).toBeGreaterThan(2300000);
  });
});
