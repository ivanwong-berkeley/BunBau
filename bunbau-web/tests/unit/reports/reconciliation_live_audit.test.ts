import { describe, it, expect } from 'vitest';
import { parseFilenameMetadata } from '../../../src/lib/ingestion/filenameParser';
import {
  isSameInstitution,
  normalizeInstitution,
  validateAuditTargetScope,
  consolidateStatementExtractions,
  runStatementReconciliationAudit,
  AuditTargetScope,
} from '../../../src/lib/reports/reconciliationAuditor';
import { CanonicalAccount, CanonicalPosition, ExtractionResult } from '../../../src/lib/portfolio/types';

describe('Statement Reconciliation Live Audit Engine (Citi CD & Cross-Institution)', () => {
  const citiAccount: CanonicalAccount = {
    id: 'acc_citi_cd_3703',
    institution: 'Citi Bank',
    accountType: 'Certificate of Deposit',
    maskedAccount: '*******3703',
    positions: [],
    updatedAt: '2026-10-07T00:00:00Z',
  };

  const webullAccount: CanonicalAccount = {
    id: 'acc_wb_cash',
    institution: 'WeBull',
    accountType: 'Individual Cash',
    maskedAccount: '***-XLW4',
    positions: [],
    updatedAt: '2026-10-07T00:00:00Z',
  };

  const portfolioAccounts: CanonicalAccount[] = [citiAccount, webullAccount];

  const portfolioPositions: CanonicalPosition[] = [
    {
      id: 'pos_citi_cd',
      institution: 'Citi Bank',
      accountId: 'acc_citi_cd_3703',
      symbol: 'CITI 4.25% CD 3703',
      name: 'Citi 11-Month Fixed Rate Certificate of Deposit',
      assetClass: 'CD',
      quantity: 1,
      marketValue: 100000.0,
      costBasis: 100000.0,
      fixedIncomeDetails: {
        couponRate: 0.0425,
        maturityDate: '2027-09-15',
        paymentFrequency: 'AT_MATURITY',
      },
    },
    {
      id: 'pos_wb_stock',
      institution: 'WeBull',
      accountId: 'acc_wb_cash',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      assetClass: 'Stock',
      quantity: 50,
      marketValue: 11500.0,
      costBasis: 10000.0,
    },
  ];

  describe('Institution Normalization & Fuzzy Matching', () => {
    it('normalizes various Citi institution spellings to "citi"', () => {
      expect(normalizeInstitution('Citi')).toBe('citi');
      expect(normalizeInstitution('Citi Bank')).toBe('citi');
      expect(normalizeInstitution('Citibank')).toBe('citi');
      expect(normalizeInstitution('Citigold')).toBe('citi');
      expect(normalizeInstitution('CITI PERSONAL WEALTH MANAGEMENT')).toBe('citi');
    });

    it('matches Citi variations symmetrically using isSameInstitution', () => {
      expect(isSameInstitution('Citi', 'Citi Bank')).toBe(true);
      expect(isSameInstitution('Citibank', 'Citi')).toBe(true);
      expect(isSameInstitution('Citi Bank', 'Citibank')).toBe(true);
      expect(isSameInstitution('Citi', 'WeBull')).toBe(false);
      expect(isSameInstitution('Fidelity', 'Schwab')).toBe(false);
    });
  });

  describe('Target Scope Validation for Citi CD', () => {
    it('validates scope successfully when user selects Citi institution and uploads Citi CD statement', () => {
      const scope: AuditTargetScope = {
        mode: 'institution',
        institution: 'Citi',
      };

      const extractions: ExtractionResult[] = [
        {
          institution: 'Citi Bank',
          account: '*******3703',
          accountType: 'Certificate of Deposit',
          portfolioTotal: 100000,
          positions: [
            {
              symbol: 'CITI CD 3703',
              value: 100000,
              category: 'CD',
              quantity: 1,
            },
          ],
        },
      ];

      const validation = validateAuditTargetScope(scope, extractions, portfolioAccounts);
      expect(validation.isValid).toBe(true);
      expect(validation.mismatches).toHaveLength(0);
    });

    it('flags mismatch when user selects Citi institution but uploads WeBull file', () => {
      const scope: AuditTargetScope = {
        mode: 'institution',
        institution: 'Citi',
      };

      const extractions: ExtractionResult[] = [
        {
          institution: 'WeBull',
          account: 'CUX5XLW4',
          portfolioTotal: 11500,
          positions: [{ symbol: 'AAPL', value: 11500, quantity: 50 }],
        },
      ];

      const validation = validateAuditTargetScope(scope, extractions, portfolioAccounts);
      expect(validation.isValid).toBe(false);
      expect(validation.mismatches[0]).toContain('Target Mismatch: Selected Citi, but uploaded file belongs to WeBull');
    });
  });

  describe('End-to-End Statement Ingestion and Reconciliation for Citi CD Screenshot', () => {
    it('correctly parses Citi CD screenshot filename and reconciles against Citi Bank account', () => {
      const filename = 'Citi_CD_3703_Image_20261007.png';
      const meta = parseFilenameMetadata(filename);

      expect(meta.institution).toBe('Citi');
      expect(meta.accountType).toBe('Certificate of Deposit');
      expect(meta.accountSuffix).toBe('3703');
      expect(meta.asOfDate).toBe('2026-10-07');

      // Emulate extraction result from Vision or local fallback
      const extraction: ExtractionResult = {
        institution: meta.institution!,
        account: `***-${meta.accountSuffix}`,
        accountType: meta.accountType || 'Certificate of Deposit',
        portfolioTotal: 100000.0,
        asOfDate: meta.asOfDate,
        positions: [
          {
            symbol: 'CITI 4.25% CD 3703',
            name: 'Citi 11-Month Fixed Rate Certificate of Deposit',
            value: 100000.0,
            quantity: 1,
            category: 'CD',
          },
        ],
        reconciliation: {
          statedTotal: 100000.0,
          computedTotal: 100000.0,
          diff: 0,
          ok: true,
        },
      };

      const scope: AuditTargetScope = {
        mode: 'institution',
        institution: 'Citi',
      };

      const report = runStatementReconciliationAudit(
        scope,
        [extraction],
        portfolioAccounts,
        portfolioPositions
      );

      // Verify non-empty and properly matched
      expect(report.accounts).toHaveLength(1);
      const accReport = report.accounts[0];
      expect(accReport.accountId).toBe('acc_citi_cd_3703');
      expect(accReport.statementBalance).toBe(100000.0);
      expect(accReport.portfolioBalance).toBe(100000.0);
      expect(accReport.balanceDiff).toBe(0);
      expect(accReport.isBalanceReconciled).toBe(true);
      expect(accReport.matchedCount).toBe(1);
      expect(accReport.discrepancyCount).toBe(0);
      expect(report.totalGapsFound).toBe(0);
      expect(report.overallReconciled).toBe(true);

      const cdItem = accReport.items[0];
      expect(cdItem.symbol).toBe('CITI 4.25% CD 3703');
      expect(cdItem.status).toBe('MATCHED');
      expect(cdItem.statementValue).toBe(100000.0);
      expect(cdItem.portfolioValue).toBe(100000.0);
    });

    it('prevents overallReconciled from being true when 0 accounts match scope', () => {
      const scope: AuditTargetScope = {
        mode: 'institution',
        institution: 'Schwab',
      };

      // Upload has Citi extraction, but user scoped to Schwab
      const extractions: ExtractionResult[] = [
        {
          institution: 'Citi',
          account: '***-3703',
          positions: [{ symbol: 'CD', value: 100000 }],
        },
      ];

      const report = runStatementReconciliationAudit(
        scope,
        extractions,
        portfolioAccounts,
        portfolioPositions
      );

      // scopedExtractions will be empty
      expect(report.accounts).toHaveLength(0);
      expect(report.overallReconciled).toBe(false);
    });

    it('correctly consolidates multi-screenshot CD uploads without duplicating rows', () => {
      const extractions: ExtractionResult[] = [
        {
          institution: 'Citi Bank',
          account: '*******3703',
          asOfDate: '2026-10-07',
          portfolioTotal: 100000.0,
          positions: [
            { symbol: 'CITI 4.25% CD 3703', value: 100000.0, category: 'CD', quantity: 1 },
          ],
        },
        {
          institution: 'Citi',
          account: '***-3703',
          asOfDate: '2026-10-07',
          portfolioTotal: 100000.0,
          positions: [
            { symbol: 'CITI 4.25% CD 3703', value: 100000.0, category: 'CD', quantity: 1 },
          ],
        },
      ];

      const consolidated = consolidateStatementExtractions(extractions);
      expect(consolidated).toHaveLength(1);
      expect(consolidated[0].positions).toHaveLength(1);
      expect(consolidated[0].portfolioTotal).toBe(100000.0);
    });
  });
});
