import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { FidelityCSVAdapter } from '../../../src/lib/ingestion/adapters/fidelityAdapter';
import { toExtractionResult, toLegacyPosition } from '../../../src/lib/types/ingestion';
import {
  validateAuditTargetScope,
  runStatementReconciliationAudit,
  generateAuditGapCsv,
  consolidateStatementExtractions,
  AuditTargetScope,
} from '../../../src/lib/reports/reconciliationAuditor';
import { CanonicalAccount, CanonicalPosition, ExtractionResult } from '../../../src/lib/portfolio/types';

describe('Reconciliation Auditor & Statement Gap Engine', () => {
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
      id: 'acc_fid',
      institution: 'Fidelity',
      accountType: 'Brokerage',
      maskedAccount: '***-6238',
      positions: [],
      updatedAt: '2026-10-10T00:00:00Z',
    },
  ];

  const positions: CanonicalPosition[] = [
    {
      id: 'pos_1',
      institution: 'WeBull',
      accountId: 'acc_wb_cash',
      symbol: 'AMD',
      assetClass: 'Stock',
      quantity: 20.58465,
      marketValue: 13314.98,
    },
    {
      id: 'pos_2',
      institution: 'WeBull',
      accountId: 'acc_wb_cash',
      symbol: 'SOFI',
      assetClass: 'Stock',
      quantity: 114.11157,
      marketValue: 1788.13,
    },
    {
      id: 'pos_3',
      institution: 'WeBull',
      accountId: 'acc_wb_cash',
      symbol: 'SOFI 21.5 Call',
      assetClass: 'CoveredCall',
      quantity: -1,
      marketValue: -1.0,
      option: {
        underlying: 'SOFI',
        strike: 21.5,
        right: 'CALL',
        expiry: '2026-10-09',
        contracts: 1,
      },
    },
  ];

  describe('Target Scope Validation & Missing Statement Alerts', () => {
    it('detects target mismatch when user selects Fidelity but uploads WeBull statement', () => {
      const scope: AuditTargetScope = {
        mode: 'institution',
        institution: 'Fidelity',
      };

      const extractions: ExtractionResult[] = [
        {
          institution: 'WeBull',
          account: 'CUX5XLW4',
          positions: [{ symbol: 'AMD', value: 1000, category: 'Stock' }],
        },
      ];

      const validation = validateAuditTargetScope(scope, extractions, accounts);
      expect(validation.isValid).toBe(false);
      expect(validation.mismatches).toHaveLength(1);
      expect(validation.mismatches[0]).toContain('Target Mismatch: Selected Fidelity, but uploaded file belongs to WeBull');
    });

    it('detects missing statement when auditing WeBull institution but only 1 of 2 accounts is uploaded', () => {
      const scope: AuditTargetScope = {
        mode: 'institution',
        institution: 'WeBull',
      };

      // Only Individual Cash uploaded, Rollover IRA missing
      const extractions: ExtractionResult[] = [
        {
          institution: 'WeBull',
          account: '***-XLW4',
          positions: [{ symbol: 'AMD', value: 1000, category: 'Stock' }],
        },
      ];

      const validation = validateAuditTargetScope(scope, extractions, accounts);
      expect(validation.isValid).toBe(true); // No hard mismatch
      expect(validation.missingAccounts).toHaveLength(1);
      expect(validation.missingAccounts[0]).toContain('Rollover IRA');
      expect(validation.warnings[0]).toContain('Missing statement upload for 1 account(s)');
    });

    it('passes validation when uploaded statement matches target account exactly', () => {
      const scope: AuditTargetScope = {
        mode: 'account',
        institution: 'WeBull',
        accountId: 'acc_wb_cash',
      };

      const extractions: ExtractionResult[] = [
        {
          institution: 'WeBull',
          account: '***-XLW4',
          positions: [{ symbol: 'AMD', value: 1000, category: 'Stock' }],
        },
      ];

      const validation = validateAuditTargetScope(scope, extractions, accounts);
      expect(validation.isValid).toBe(true);
      expect(validation.mismatches).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });
  });

  describe('Deep Audit Gap Analysis & Discrepancy Reporting', () => {
    it('reports 100% matched when statement holdings match portfolio holdings', () => {
      const scope: AuditTargetScope = {
        mode: 'account',
        accountId: 'acc_wb_cash',
      };

      const extractions: ExtractionResult[] = [
        {
          institution: 'WeBull',
          account: '***-XLW4',
          accountType: 'Individual Cash',
          positions: [
            { symbol: 'AMD', category: 'Stock', value: 13314.98, quantity: 20.58465 },
            { symbol: 'SOFI', category: 'Stock', value: 1788.13, quantity: 114.11157 },
            {
              symbol: 'SOFI 21.5 Call',
              category: 'CoveredCall',
              value: -1.0,
              quantity: -1,
              metadata: { strikePrice: 21.5, expiry: '2026-10-09' },
            },
          ],
          portfolioTotal: 15103.11, // 13314.98 + 1788.13
          reconciliation: {
            statedTotal: 15103.11,
            computedTotal: 15103.11,
            diff: 0,
            ok: true,
          },
        },
      ];

      const audit = runStatementReconciliationAudit(scope, extractions, accounts, positions);
      expect(audit.totalGapsFound).toBe(0);
      expect(audit.overallReconciled).toBe(true);
      expect(audit.accounts[0].matchedCount).toBe(3);
      expect(audit.accounts[0].discrepancyCount).toBe(0);
    });

    it('identifies missing positions and quantity discrepancies', () => {
      const scope: AuditTargetScope = {
        mode: 'account',
        accountId: 'acc_wb_cash',
      };

      // Statement has:
      // 1. AMD with quantity mismatch (25 vs 20.58)
      // 2. TSM which is missing from portfolio
      const extractions: ExtractionResult[] = [
        {
          institution: 'WeBull',
          account: '***-XLW4',
          positions: [
            { symbol: 'AMD', category: 'Stock', value: 16000.0, quantity: 25.0 },
            { symbol: 'TSM', category: 'Stock', value: 3870.57, quantity: 8.16611 },
          ],
          portfolioTotal: 19870.57,
          reconciliation: {
            statedTotal: 19870.57,
            computedTotal: 19870.57,
            diff: 0,
            ok: true,
          },
        },
      ];

      const audit = runStatementReconciliationAudit(scope, extractions, accounts, positions);
      expect(audit.totalGapsFound).toBeGreaterThan(0);
      expect(audit.overallReconciled).toBe(false);

      const items = audit.accounts[0].items;
      const amdItem = items.find((i) => i.symbol === 'AMD');
      const tsmItem = items.find((i) => i.symbol === 'TSM');
      const sofiItem = items.find((i) => i.symbol === 'SOFI');

      expect(amdItem?.status).toBe('QUANTITY_MISMATCH');
      expect(tsmItem?.status).toBe('MISSING_IN_PORTFOLIO');
      expect(sofiItem?.status).toBe('EXTRA_IN_PORTFOLIO');

      // Generates CSV
      const csv = generateAuditGapCsv(audit);
      expect(csv).toContain('BUNBAU STATEMENT RECONCILIATION AUDIT GAP REPORT');
      expect(csv).toContain('QUANTITY_MISMATCH');
      expect(csv).toContain('MISSING_IN_PORTFOLIO');
    });

    it('consolidates 4 multi-screenshot extractions into exactly 1 extraction without duplicate rows', () => {
      // Simulating user uploading 4 screenshots for WeBull Rollover IRA (***-QSX4)
      const fourScreenshotExtractions: ExtractionResult[] = [
        {
          institution: 'WeBull',
          account: 'CVS8QSX4',
          portfolioTotal: 219702.33,
          positions: [
            { symbol: 'AAPL', category: 'Stock', value: 50000, quantity: 200 },
            { symbol: 'MSFT', category: 'Stock', value: 40000, quantity: 100 },
          ],
        },
        {
          institution: 'WeBull',
          account: 'CVS8QSX4',
          portfolioTotal: 219702.33,
          positions: [
            { symbol: 'AAPL', category: 'Stock', value: 50000, quantity: 200 }, // Overlapping row
            { symbol: 'NVDA', category: 'Stock', value: 35000, quantity: 250 },
          ],
        },
        {
          institution: 'WeBull',
          account: 'CVS8QSX4',
          portfolioTotal: 219702.33,
          positions: [
            { symbol: 'GOOGL', category: 'Stock', value: 30000, quantity: 180 },
          ],
        },
        {
          institution: 'WeBull',
          account: 'CVS8QSX4',
          portfolioTotal: 219702.33,
          positions: [
            { symbol: 'AMZN', category: 'Stock', value: 25000, quantity: 130 },
          ],
        },
      ];

      const consolidated = consolidateStatementExtractions(fourScreenshotExtractions);
      expect(consolidated).toHaveLength(1);
      expect(consolidated[0].institution).toBe('WeBull');
      // Total unique symbols: AAPL, MSFT, NVDA, GOOGL, AMZN = 5
      expect(consolidated[0].positions).toHaveLength(5);
      expect(consolidated[0].portfolioTotal).toBe(219702.33);
    });

    it('enforces single-account scope strictness and eliminates duplicate blocks in CSV gap report', () => {
      // User selects single account: acc_wb_ira (***-QSX4)
      const scope: AuditTargetScope = {
        mode: 'account',
        institution: 'WeBull',
        accountId: 'acc_wb_ira',
        accountMasked: '***-QSX4',
      };

      // Upload contains 4 screenshots for QSX4 + 1 extra screenshot for XLW4
      const extractions: ExtractionResult[] = [
        {
          institution: 'WeBull',
          account: 'CVS8QSX4',
          portfolioTotal: 219702.33,
          positions: [{ symbol: 'AMD', category: 'Stock', value: 3000, quantity: 20 }],
        },
        {
          institution: 'WeBull',
          account: 'CVS8QSX4',
          portfolioTotal: 219702.33,
          positions: [{ symbol: 'AMD', category: 'Stock', value: 3000, quantity: 20 }],
        },
        {
          institution: 'WeBull',
          account: 'CVS8QSX4',
          portfolioTotal: 219702.33,
          positions: [{ symbol: 'AMD', category: 'Stock', value: 3000, quantity: 20 }],
        },
        {
          institution: 'WeBull',
          account: 'CVS8QSX4',
          portfolioTotal: 219702.33,
          positions: [{ symbol: 'AMD', category: 'Stock', value: 3000, quantity: 20 }],
        },
        // Unrelated account
        {
          institution: 'WeBull',
          account: 'CUX5XLW4',
          portfolioTotal: 15103.11,
          positions: [{ symbol: 'SOFI', category: 'Stock', value: 1788.13, quantity: 114.11157 }],
        },
      ];

      const audit = runStatementReconciliationAudit(scope, extractions, accounts, positions);

      // Must strictly produce exactly 1 account report (no 4x duplication, and no XLW4)
      expect(audit.accounts).toHaveLength(1);
      expect(audit.accounts[0].accountId).toBe('acc_wb_ira');
      expect(audit.accounts[0].accountMasked).toBe('***-QSX4');

      // CSV must contain exactly ONE occurrence of "--- ACCOUNT: WeBull ***-QSX4"
      const csv = generateAuditGapCsv(audit);
      const occurrences = (csv.match(/--- ACCOUNT: WeBull \*\*\*-QSX4/g) || []).length;
      expect(occurrences).toBe(1);
    });

    it('TC-AUDIT-OPTION-01: achieves $0.00 variance and 100% reconciled for Fidelity Brokerage ***-6238 with 6 options', () => {
      const fixturesDir = path.resolve(__dirname, '../../fixtures/real_uploads');
      const csvPath = path.join(fixturesDir, 'Fidelity/CSV/Fidelity_Brokerage_X24336238_Portfolio_Positions_Oct-07-2026.csv');
      const content = fs.readFileSync(csvPath, 'utf-8');
      const adapter = new FidelityCSVAdapter();
      const parseRes = adapter.parse(content, 'test-user');
      const fidAccountPayload = parseRes.accounts[0];

      const fidAccount: CanonicalAccount = {
        id: fidAccountPayload.accountKey,
        institution: fidAccountPayload.institution,
        accountType: fidAccountPayload.accountType,
        maskedAccount: fidAccountPayload.accountMaskedNumber,
        positions: fidAccountPayload.positions.map(toLegacyPosition),
        updatedAt: '2026-10-10T00:00:00Z',
      };

      const fidPositions: CanonicalPosition[] = [
        {
          id: `pos_${fidAccount.id}_CASH`,
          symbol: 'Cash (USD)',
          name: 'Cash Balance',
          assetClass: 'Cash',
          quantity: fidAccountPayload.cashBalance,
          marketValue: fidAccountPayload.cashBalance,
          institution: fidAccount.institution,
          accountId: fidAccount.id,
        },
        ...fidAccount.positions,
      ];

      // Convert statement account to ExtractionResult using toExtractionResult
      const statementExtraction = toExtractionResult(fidAccountPayload);

      const scope: AuditTargetScope = {
        mode: 'account',
        institution: 'Fidelity',
        accountId: fidAccount.id,
      };

      const audit = runStatementReconciliationAudit(
        scope,
        [statementExtraction],
        [fidAccount],
        fidPositions
      );

      expect(audit.accounts).toHaveLength(1);
      const rep = audit.accounts[0];

      // Stated statement balance: $678,892.09
      expect(rep.statementBalance).toBeCloseTo(678892.09, 2);
      // Portfolio balance must match statement liquidation value: $678,892.09 (not $679,472.09!)
      expect(rep.portfolioBalance).toBeCloseTo(678892.09, 2);
      // Balance variance MUST be $0.00
      expect(rep.balanceDiff).toBe(0);
      expect(rep.isBalanceReconciled).toBe(true);
      expect(rep.discrepancyCount).toBe(0);
      expect(rep.matchedCount).toBe(16); // 1 cash + 9 equities/ETFs/treasuries + 6 options
      expect(audit.totalGapsFound).toBe(0);
      expect(audit.overallReconciled).toBe(true);

      // Verify generated gap CSV format
      const csv = generateAuditGapCsv(audit);
      expect(csv).toContain('Overall Audit Status,RECONCILED (100% MATCH)');
      expect(csv).toContain('Statement Total,$678892.09');
      expect(csv).toContain('Portfolio Total,$678892.09');
      expect(csv).toContain('Variance,$0.00');
      expect(csv).toContain('Account Status,Reconciled');
    });
  });
});
