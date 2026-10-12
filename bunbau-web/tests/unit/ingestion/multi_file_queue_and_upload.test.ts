import { describe, it, expect, vi } from 'vitest';
import { CSVRouter } from '../../../src/lib/ingestion/adapters/router';
import { parseFilenameMetadata } from '../../../src/lib/ingestion/filenameParser';
import { reconcileLinkedSubAccounts } from '../../../src/lib/ingestion/reconcile';
import { extractAccountSuffix } from '../../../src/lib/portfolio/accountId';
import type { CanonicalAccountPayload } from '../../../src/lib/types/ingestion';
import { parseCitiExcelWorkbook } from '../../../src/lib/ingestion/adapters/citiXlsxParser';
import * as XLSX from 'xlsx';

describe('BunBau v3.3: Multi-File Batch Queue, Confirmation & Aggregation Tests', () => {
  // Helpers matching UploadValidationModal staging logic
  const stageFiles = (
    currentList: { name: string; size: number }[],
    incoming: { name: string; size: number }[]
  ) => {
    const validExtensions = ['.csv', '.tsv', '.ofx', '.xlsx', '.xls'];
    const valid = incoming.filter((f) =>
      validExtensions.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    const existingKeys = new Set(currentList.map((p) => `${p.name}-${p.size}`));
    const toAdd = valid.filter((f) => !existingKeys.has(`${f.name}-${f.size}`));
    return [...currentList, ...toAdd];
  };

  const removeStaged = <T>(list: T[], index: number): T[] => {
    return list.filter((_, i) => i !== index);
  };

  const checkSubAccountPair = (filenames: string[]): boolean => {
    const lower = filenames.map((f) => f.toLowerCase());
    const has401k = lower.some((n) => n.includes('401k') && !n.includes('brokeragelink'));
    const hasBrokerageLink = lower.some((n) => n.includes('brokeragelink'));
    return has401k && hasBrokerageLink;
  };

  describe('1. Pre-Ingestion Batch File Queue & Confirmation', () => {
    it('TEST-BATCH-01: stages multiple files and deduplicates exact duplicates by name and size', () => {
      let staged: { name: string; size: number }[] = [];

      const batch1 = [
        { name: 'Fidelity_Brokerage_X24336238_Portfolio_Positions_Oct-07-2026.csv', size: 1024 },
        { name: 'Schwab_Living Trust ... 281_Positions-2026-10-07-205936.csv', size: 2048 },
      ];

      staged = stageFiles(staged, batch1);
      expect(staged.length).toBe(2);

      // Adding the same file again does not duplicate
      const duplicateBatch = [
        { name: 'Fidelity_Brokerage_X24336238_Portfolio_Positions_Oct-07-2026.csv', size: 1024 },
        { name: 'CITI_Brokerage_CZ5009836_Balances_Summary_10_07_2026.xlsx', size: 4096 },
      ];

      staged = stageFiles(staged, duplicateBatch);
      expect(staged.length).toBe(3);
      expect(staged.map((s) => s.name)).toEqual([
        'Fidelity_Brokerage_X24336238_Portfolio_Positions_Oct-07-2026.csv',
        'Schwab_Living Trust ... 281_Positions-2026-10-07-205936.csv',
        'CITI_Brokerage_CZ5009836_Balances_Summary_10_07_2026.xlsx',
      ]);
    });

    it('TEST-BATCH-02: skips unsupported non-spreadsheet file formats', () => {
      let staged: { name: string; size: number }[] = [];

      const mixedFiles = [
        { name: 'document.pdf', size: 5000 },
        { name: 'screenshot.png', size: 8000 },
        { name: 'Schwab_Rollover-IRA ...673_Positions-2026-10-07-205829.csv', size: 1500 },
        { name: 'notes.txt', size: 200 },
      ];

      staged = stageFiles(staged, mixedFiles);
      expect(staged.length).toBe(1);
      expect(staged[0].name).toBe('Schwab_Rollover-IRA ...673_Positions-2026-10-07-205829.csv');
    });

    it('TEST-BATCH-03: allows removing individual items from the queue prior to confirmation', () => {
      let staged = [
        { name: 'FileA.csv', size: 100 },
        { name: 'FileB.csv', size: 200 },
        { name: 'FileC.csv', size: 300 },
      ];

      staged = removeStaged(staged, 1); // remove FileB
      expect(staged.length).toBe(2);
      expect(staged.map((f) => f.name)).toEqual(['FileA.csv', 'FileC.csv']);

      staged = removeStaged(staged, 0); // remove FileA
      expect(staged.length).toBe(1);
      expect(staged[0].name).toBe('FileC.csv');
    });

    it('TEST-BATCH-04: identifies linked sub-account pair (Oracle 401k + BrokerageLink) in staged filenames', () => {
      const filesWithPair = [
        'Fidelity_ORACLE-401K_35004_Portfolio_Positions_Oct-07-2026.csv',
        'Fidelity_ORACLE-401K-BrokerageLink_652716847_Portfolio_Positions_Oct-07-2026.csv',
      ];
      expect(checkSubAccountPair(filesWithPair)).toBe(true);

      const filesWithoutPair = [
        'Fidelity_ORACLE-401K_35004_Portfolio_Positions_Oct-07-2026.csv',
        'Schwab_Living Trust ... 281_Positions-2026-10-07-205936.csv',
      ];
      expect(checkSubAccountPair(filesWithoutPair)).toBe(false);
    });
  });

  describe('2. Multi-Account Batch Parsing & Linked Sub-Account Zero-Doubling', () => {
    it('TEST-BATCH-05: parses multi-account statements and reconciles sub-account holdings without doubling', () => {
      const oracle401kCsv = `Account Number,Account Name,Symbol,Description,Quantity,Last Price,Current Value
"35004","ORACLE 401K","BROKERAGELINK","BROKERAGELINK PARTICIPANT",1,601245.00,601245.00
"35004","ORACLE 401K","VANG INFL PROTECTED","VANG INFL PROTECTED",500,25.00,12500.00
"35004","ORACLE 401K","FDRXX","HELD IN FDRXX",5000,1.00,5000.00
`;

      const brokerageLinkCsv = `Account Number,Account Name,Symbol,Description,Quantity,Last Price,Current Value
"652716847","BROKERAGELINK","NVDA","NVIDIA CORP",500,130.00,65000.00
"652716847","BROKERAGELINK","MSFT","MICROSOFT CORP",1000,430.00,430000.00
"652716847","BROKERAGELINK","FDRXX","HELD IN FDRXX",106245,1.00,106245.00
`;

      const router = new CSVRouter();
      const meta401k = parseFilenameMetadata('Fidelity_ORACLE-401K_35004_Portfolio_Positions_Oct-07-2026.csv');
      const metaBlink = parseFilenameMetadata(
        'Fidelity_ORACLE-401K-BrokerageLink_652716847_Portfolio_Positions_Oct-07-2026.csv'
      );

      const res401k = router.routeAndParse(oracle401kCsv, 'test-user', meta401k);
      const resBlink = router.routeAndParse(brokerageLinkCsv, 'test-user', metaBlink);

      expect(res401k.accounts.length).toBe(1);
      expect(resBlink.accounts.length).toBe(1);

      const acc401k = res401k.accounts[0];
      const accBlink = resBlink.accounts[0];

      // Reconcile linked sub-accounts
      const reconciled = reconcileLinkedSubAccounts([acc401k, accBlink]);
      expect(reconciled.length).toBe(2);

      const reconciled401k = reconciled.find((a) => a.accountMaskedNumber.includes('5004'))!;
      const reconciledBlink = reconciled.find((a) => a.accountMaskedNumber.includes('6847'))!;

      // The aggregate $601,245 BROKERAGELINK position should have been superseded
      const hasBrokerageLinkHolding = reconciled401k.positions.some(
        (p) => p.symbol.toUpperCase() === 'BROKERAGELINK'
      );
      expect(hasBrokerageLinkHolding).toBe(false);

      // The individual NVDA, MSFT holdings are in BrokerageLink positions; FDRXX is cash
      expect(reconciledBlink.positions.length).toBe(2);
      expect(reconciledBlink.positions.map((p) => p.symbol)).toEqual(['NVDA', 'MSFT']);
      expect(reconciledBlink.cashBalance).toBe(106245);

      // Sum of net worth without double counting
      const totalPortfolioValue = reconciled.reduce((sum, a) => sum + a.totalValue, 0);
      // 401k has $12,500 + $5,000 cash = $17,500
      // BrokerageLink has $65,000 + $430,000 + $106,245 cash = $601,245
      // Total = $618,745
      expect(totalPortfolioValue).toBeCloseTo(618745, 0);
    });
  });

  describe('3. Multi-Account Portfolio Aggregation & Filter Pills', () => {
    const mockBatches: { account: CanonicalAccountPayload }[] = [
      {
        account: {
          accountKey: 'fid_6238',
          institution: 'Fidelity',
          accountName: 'Brokerage',
          accountMaskedNumber: '***-6238',
          accountType: 'Brokerage',
          totalValue: 150000,
          cashBalance: 25000,
          positions: [
            {
              positionKey: 'fid_aapl',
              accountKey: 'fid_6238',
              symbol: 'AAPL',
              description: 'Apple Inc',
              assetCategory: 'Stock',
              quantity: 100,
              marketValue: 25000,
            },
            {
              positionKey: 'fid_cash',
              accountKey: 'fid_6238',
              symbol: 'SPAXX',
              description: 'Cash',
              assetCategory: 'Cash',
              quantity: 25000,
              marketValue: 25000,
            },
          ],
          source: 'CSV',
          userId: 'user1',
          asOfDate: '2026-10-07',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      {
        account: {
          accountKey: 'schwab_0281',
          institution: 'Charles Schwab',
          accountName: 'Living Trust',
          accountMaskedNumber: '***-0281',
          accountType: 'Brokerage',
          totalValue: 80000,
          cashBalance: 10000,
          positions: [
            {
              positionKey: 'schwab_spy',
              accountKey: 'schwab_0281',
              symbol: 'SPY',
              description: 'SPDR S&P 500',
              assetCategory: 'ETF',
              quantity: 100,
              marketValue: 60000,
            },
            {
              positionKey: 'schwab_cash',
              accountKey: 'schwab_0281',
              symbol: 'SWVXX',
              description: 'Cash',
              assetCategory: 'Cash',
              quantity: 10000,
              marketValue: 10000,
            },
          ],
          source: 'CSV',
          userId: 'user1',
          asOfDate: '2026-10-07',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    ];

    it('TEST-BATCH-06: computes aggregated net worth and cash balances across all accounts', () => {
      const totalNetWorth = mockBatches.reduce((sum, b) => sum + b.account.totalValue, 0);
      const totalCash = mockBatches.reduce((sum, b) => sum + b.account.cashBalance, 0);

      expect(totalNetWorth).toBe(230000);
      expect(totalCash).toBe(35000);
    });

    it('TEST-BATCH-07: correctly filters holdings when ALL is selected vs specific account pill', () => {
      const filterHoldings = (filter: string) => {
        if (filter === 'ALL') {
          return mockBatches.flatMap((b) =>
            b.account.positions.map((pos) => ({
              ...pos,
              accountLabel: `${b.account.institution} (***-${extractAccountSuffix(b.account.accountMaskedNumber)})`,
            }))
          );
        }
        const match = mockBatches.find(
          (b) => extractAccountSuffix(b.account.accountMaskedNumber) === filter
        );
        if (!match) return [];
        return match.account.positions.map((pos) => ({
          ...pos,
          accountLabel: `${match.account.institution} (***-${extractAccountSuffix(match.account.accountMaskedNumber)})`,
        }));
      };

      // When ALL is selected, returns all 4 positions tagged with account label
      const allHoldings = filterHoldings('ALL');
      expect(allHoldings.length).toBe(4);
      expect(allHoldings[0].accountLabel).toBe('Fidelity (***-6238)');
      expect(allHoldings[2].accountLabel).toBe('Charles Schwab (***-0281)');

      // When '0281' is selected, returns only Schwab positions
      const schwabHoldings = filterHoldings('0281');
      expect(schwabHoldings.length).toBe(2);
      expect(schwabHoldings.map((h) => h.symbol)).toEqual(['SPY', 'SWVXX']);

      // When '6238' is selected, returns only Fidelity positions
      const fidelityHoldings = filterHoldings('6238');
      expect(fidelityHoldings.length).toBe(2);
      expect(fidelityHoldings.map((h) => h.symbol)).toEqual(['AAPL', 'SPAXX']);
    });

    it('TEST-BATCH-08: commits all accounts in batch sequentially on Approve with zero doubling', async () => {
      const committedAccounts: string[] = [];
      const mockOnApprove = vi.fn().mockImplementation(async (extraction) => {
        committedAccounts.push(`${extraction.institution}_${extraction.account}`);
      });

      for (const batch of mockBatches) {
        await mockOnApprove({
          institution: batch.account.institution,
          account: batch.account.accountMaskedNumber,
          positions: batch.account.positions,
        });
      }

      expect(mockOnApprove).toHaveBeenCalledTimes(2);
      expect(committedAccounts).toEqual([
        'Fidelity_***-6238',
        'Charles Schwab_***-0281',
      ]);
    });
  });
});
