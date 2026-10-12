import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { parseCitiWorkbook } from '../../../src/lib/ingestion/adapters/citiXlsxAdapter';
import { parseFilenameMetadata } from '../../../src/lib/ingestion/filenameParser';
import { toExtractionResult } from '../../../src/lib/types/ingestion';
import {
  consolidateStatementExtractions,
  runStatementReconciliationAudit,
  validateAuditTargetScope,
  AuditTargetScope,
  isSameInstitution,
} from '../../../src/lib/reports/reconciliationAuditor';
import { CanonicalAccount, CanonicalPosition, ExtractionResult } from '../../../src/lib/portfolio/types';
import { CSVRouter } from '../../../src/lib/ingestion/adapters/router';

describe('Live Reconciliation Multi-File Ingestion Pipeline (XLSX, CSV, Screenshots)', () => {
  const brokerageFile = path.resolve(
    __dirname,
    '../../fixtures/real_uploads/Citi/CSV/CITI_Brokerage_CZ5009836_Balances_Summary_10_07_2026.xlsx'
  );
  const iraFile = path.resolve(
    __dirname,
    '../../fixtures/real_uploads/Citi/CSV/Citi_IRA_CZ5009834_Balances_Summary_10_07_2026.xlsx'
  );

  const mockPortfolioAccounts: CanonicalAccount[] = [
    {
      id: 'acc_citi_cd_3703',
      institution: 'Citi',
      accountType: 'Certificate of Deposit',
      maskedAccount: '*******3703',
      positions: [],
      updatedAt: '2026-10-07T00:00:00Z',
    },
    {
      id: 'acc_citi_brokerage_9836',
      institution: 'Citi',
      accountType: 'Brokerage',
      maskedAccount: '***-9836',
      positions: [],
      updatedAt: '2026-10-07T00:00:00Z',
    },
    {
      id: 'acc_citi_ira_9834',
      institution: 'Citi',
      accountType: 'Traditional IRA',
      maskedAccount: '***-9834',
      positions: [],
      updatedAt: '2026-10-07T00:00:00Z',
    },
  ];

  const mockPortfolioPositions: CanonicalPosition[] = [
    {
      id: 'pos_citi_cd',
      institution: 'Citi',
      accountId: 'acc_citi_cd_3703',
      symbol: 'CITI 4.25% CD 3703',
      name: 'Citi 11-Month Fixed Rate Certificate of Deposit',
      assetClass: 'CD',
      quantity: 1,
      marketValue: 100000.0,
      costBasis: 100000.0,
    },
    {
      id: 'pos_citi_brok_cash',
      institution: 'Citi',
      accountId: 'acc_citi_brokerage_9836',
      symbol: 'USD',
      name: 'Cash Balance',
      assetClass: 'Cash',
      quantity: 12.67,
      marketValue: 12.67,
      costBasis: 12.67,
    },
    {
      id: 'pos_citi_brok_holdings',
      institution: 'Citi',
      accountId: 'acc_citi_brokerage_9836',
      symbol: 'CITI_HOLDINGS',
      name: 'Citi Brokerage Holdings',
      assetClass: 'Stock',
      quantity: 1,
      marketValue: 101173.29,
      costBasis: 101173.29,
    },
    {
      id: 'pos_citi_ira_cash',
      institution: 'Citi',
      accountId: 'acc_citi_ira_9834',
      symbol: 'USD',
      name: 'Cash Balance',
      assetClass: 'Cash',
      quantity: 536.26,
      marketValue: 536.26,
      costBasis: 536.26,
    },
    {
      id: 'pos_citi_ira_holdings',
      institution: 'Citi',
      accountId: 'acc_citi_ira_9834',
      symbol: 'CITI_HOLDINGS',
      name: 'Citi IRA Holdings',
      assetClass: 'Stock',
      quantity: 1,
      marketValue: 199533.42,
      costBasis: 199533.42,
    },
  ];

  it('parses real Citi Brokerage .xlsx into ExtractionResult for live reconciliation', () => {
    if (!fs.existsSync(brokerageFile)) return;
    const buf = fs.readFileSync(brokerageFile);
    const meta = parseFilenameMetadata('CITI_Brokerage_CZ5009836_Balances_Summary_10_07_2026.xlsx');
    const citiRes = parseCitiWorkbook(buf.buffer, meta);

    expect(citiRes.accounts.length).toBe(1);
    const extResult = toExtractionResult(citiRes.accounts[0]);
    expect(extResult.institution).toBe('Citi');
    expect(extResult.account).toContain('9836');
    expect(extResult.portfolioTotal).toBeCloseTo(101185.96, 2);
    expect(extResult.positions.length).toBeGreaterThanOrEqual(1);

    const cashRow = extResult.positions.find((p) => p.category === 'Cash');
    expect(cashRow?.value).toBeCloseTo(12.67, 2);
  });

  it('parses real Citi IRA .xlsx into ExtractionResult for live reconciliation', () => {
    if (!fs.existsSync(iraFile)) return;
    const buf = fs.readFileSync(iraFile);
    const meta = parseFilenameMetadata('Citi_IRA_CZ5009834_Balances_Summary_10_07_2026.xlsx');
    const citiRes = parseCitiWorkbook(buf.buffer, meta);

    expect(citiRes.accounts.length).toBe(1);
    const extResult = toExtractionResult(citiRes.accounts[0]);
    expect(extResult.institution).toBe('Citi');
    expect(extResult.account).toContain('9834');
    expect(extResult.portfolioTotal).toBeCloseTo(200069.68, 2);

    const cashRow = extResult.positions.find((p) => p.category === 'Cash');
    expect(cashRow?.value).toBeCloseTo(509.44, 2);
  });

  it('consolidates multi-file batch consisting of 1 CD screenshot + 2 XLSX workbooks without collision', () => {
    // 1. Simulated CD Screenshot Extraction
    const cdExtraction: ExtractionResult = {
      institution: 'Citi',
      account: '*******3703',
      accountType: 'Certificate of Deposit',
      portfolioTotal: 100000.0,
      positions: [
        {
          symbol: 'CITI 4.25% CD 3703',
          name: 'Citi 11-Month Fixed Rate CD',
          category: 'CD',
          quantity: 1,
          value: 100000.0,
        },
      ],
    };

    // 2. Brokerage XLSX Extraction
    let brokExtraction: ExtractionResult;
    if (fs.existsSync(brokerageFile)) {
      const buf = fs.readFileSync(brokerageFile);
      const meta = parseFilenameMetadata('CITI_Brokerage_CZ5009836_Balances_Summary_10_07_2026.xlsx');
      brokExtraction = toExtractionResult(parseCitiWorkbook(buf.buffer, meta).accounts[0]);
    } else {
      brokExtraction = {
        institution: 'Citi',
        account: '***-9836',
        accountType: 'Brokerage',
        portfolioTotal: 101185.96,
        positions: [
          { symbol: 'Cash (USD)', name: 'Cash', category: 'Cash', value: 12.67, quantity: 1 },
          { symbol: 'CITI_HOLDINGS', name: 'Holdings', category: 'Stock', value: 101173.29, quantity: 1 },
        ],
      };
    }

    // 3. IRA XLSX Extraction
    let iraExtraction: ExtractionResult;
    if (fs.existsSync(iraFile)) {
      const buf = fs.readFileSync(iraFile);
      const meta = parseFilenameMetadata('Citi_IRA_CZ5009834_Balances_Summary_10_07_2026.xlsx');
      iraExtraction = toExtractionResult(parseCitiWorkbook(buf.buffer, meta).accounts[0]);
    } else {
      iraExtraction = {
        institution: 'Citi',
        account: '***-9834',
        accountType: 'Traditional IRA',
        portfolioTotal: 200069.68,
        positions: [
          { symbol: 'Cash (USD)', name: 'Cash', category: 'Cash', value: 536.26, quantity: 1 },
          { symbol: 'CITI_HOLDINGS', name: 'Holdings', category: 'Stock', value: 199533.42, quantity: 1 },
        ],
      };
    }

    // Combine all 3 distinct files into single batch
    const allExtractions = [cdExtraction, brokExtraction, iraExtraction];
    const consolidated = consolidateStatementExtractions(allExtractions);

    expect(consolidated.length).toBe(3);
    const accountsFound = consolidated.map((c) => c.account);
    expect(accountsFound.some((a) => a.includes('3703'))).toBe(true);
    expect(accountsFound.some((a) => a.includes('9836'))).toBe(true);
    expect(accountsFound.some((a) => a.includes('9834'))).toBe(true);
  });

  it('runs statement reconciliation audit with 0 gaps when portfolio matches statement batch', () => {
    const cdExtraction: ExtractionResult = {
      institution: 'Citi',
      account: '*******3703',
      accountType: 'Certificate of Deposit',
      portfolioTotal: 100000.0,
      positions: [
        {
          symbol: 'CITI 4.25% CD 3703',
          name: 'Citi 11-Month Fixed Rate Certificate of Deposit',
          category: 'CD',
          quantity: 1,
          value: 100000.0,
        },
      ],
    };

    const brokExtraction: ExtractionResult = {
      institution: 'Citi',
      account: '***-9836',
      accountType: 'Brokerage',
      portfolioTotal: 101185.96,
      positions: [
        { symbol: 'Cash (USD)', name: 'Cash Balance', category: 'Cash', value: 12.67, quantity: 1 },
        { symbol: 'CITI_HOLDINGS', name: 'Citi Brokerage Holdings', category: 'Stock', value: 101173.29, quantity: 1 },
      ],
    };

    const iraExtraction: ExtractionResult = {
      institution: 'Citi',
      account: '***-9834',
      accountType: 'Traditional IRA',
      portfolioTotal: 200069.68,
      positions: [
        { symbol: 'Cash (USD)', name: 'Cash Balance', category: 'Cash', value: 536.26, quantity: 1 },
        { symbol: 'CITI_HOLDINGS', name: 'Citi IRA Holdings', category: 'Stock', value: 199533.42, quantity: 1 },
      ],
    };

    const scope: AuditTargetScope = {
      mode: 'institution',
      institution: 'Citi',
    };

    const report = runStatementReconciliationAudit(
      scope,
      [cdExtraction, brokExtraction, iraExtraction],
      mockPortfolioAccounts,
      mockPortfolioPositions
    );

    expect(report.totalGapsFound).toBe(0);
    expect(report.overallReconciled).toBe(true);
    expect(report.accounts.length).toBe(3);
  });

  it('detects target scope mismatch if a WeBull file is uploaded when Citi is target', () => {
    const webullExtraction: ExtractionResult = {
      institution: 'WeBull',
      account: '***-XLW4',
      accountType: 'Individual Cash',
      portfolioTotal: 5000,
      positions: [],
    };

    const scope: AuditTargetScope = {
      mode: 'institution',
      institution: 'Citi',
    };

    const validation = validateAuditTargetScope(scope, [webullExtraction], mockPortfolioAccounts);
    expect(validation.isValid).toBe(false);
    expect(validation.mismatches.length).toBeGreaterThan(0);
    expect(validation.mismatches[0]).toContain('Target Mismatch');
  });

  it('supports generic SheetJS sheet_to_csv parsing through CSVRouter', () => {
    // Generate a minimal Excel workbook in-memory
    const wsData = [
      ['Symbol', 'Description', 'Quantity', 'Price', 'Market Value'],
      ['AAPL', 'Apple Inc.', '10', '180.00', '1800.00'],
      ['CASH', 'Cash Balance', '1', '500.00', '500.00'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Positions');

    const csvText = XLSX.utils.sheet_to_csv(ws);
    const router = new CSVRouter();
    const parsed = router.routeAndParse(csvText, 'audit-user');

    expect(parsed.accounts.length).toBeGreaterThan(0);
    expect(parsed.accounts[0].positions.length).toBeGreaterThan(0);
  });
});
