import { describe, it, expect } from 'vitest';
import { SchwabCSVAdapter } from '../../../src/lib/ingestion/adapters/schwabAdapter';
import { CSVRouter } from '../../../src/lib/ingestion/adapters/router';

describe('Charles Schwab CSV Adapter & Router', () => {
  const sampleSchwabCSV =
    `"Positions for account ...8888 as of 10/06/2026"\n` +
    `"Symbol","Description","Quantity","Price","Amount","Cost Basis"\n` +
    `"AAPL","APPLE INC","100","$330.50","$33,050.00","$28,000.00"\n` +
    `"CD","BANK OF INDIA CD 4.85% 10/15/2026","10000","$100.00","$10,000.00","$10,000.00"\n` +
    `"AAPL 10/16/2026 310.00 P","AAPL OCT 16 2026 310 PUT","-1","$1.50","-$150.00","$250.00"\n` +
    `"--","Cash & Cash Investments","--","--","$45,000.00","--"\n`;

  it('router identifies Schwab format and extracts positions', () => {
    const router = new CSVRouter();
    const result = router.routeAndParse(sampleSchwabCSV, 'user-123');
    expect(result.adapterId).toBe('schwab_csv');
    expect(result.accounts.length).toBe(1);

    const account = result.accounts[0];
    expect(account.institution).toBe('Charles Schwab');
    expect(account.cashBalance).toBe(45000);

    // Verify CD parsed with maturity and APY
    const cd = account.positions.find((p) => p.assetCategory === 'CD');
    expect(cd).toBeDefined();
    expect(cd?.maturityDate).toBe('2026-10-15');
    expect(cd?.yieldApy).toBe(4.85);

    // Verify Option parsed
    const opt = account.positions.find((p) => p.assetCategory === 'Option');
    expect(opt).toBeDefined();
    expect(opt?.optionDetails?.underlying).toBe('AAPL');
    expect(opt?.optionDetails?.strike).toBe(310);
    expect(opt?.optionDetails?.expirationDate).toBe('2026-10-16');
    expect(opt?.optionDetails?.type).toBe('PUT');
  });
});
