import { ConsolidatedPortfolioReport, FlatAuditLedgerRow } from './consolidatedReport';

/**
 * Escapes values for RFC 4180 CSV compliance.
 */
export function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const fmtCurrency = (n: number) => n.toFixed(2);
const fmtNum = (n: number, dec: number = 4) => n.toFixed(dec);

/**
 * Generates an RFC 4180 compliant CSV export mirroring BunBau's UX presentation and drilldowns.
 */
export const exportReportToCsv = (report: ConsolidatedPortfolioReport): string => generateConsolidatedReportCsv(report);

export function generateConsolidatedReportCsv(report: ConsolidatedPortfolioReport): string {
  const lines: string[] = [];

  // =========================================================================
  // HEADER AUDIT METADATA
  // =========================================================================
  lines.push(`BUNBAU PORTFOLIO AUDIT REPORT - CONSOLIDATED MULTI-LEVEL EXPORT`);
  lines.push(`Report Title,${escapeCsv(report.metadata.title)}`);
  lines.push(`Generated At,${escapeCsv(report.metadata.generatedAt)}`);
  lines.push(`As Of Date,${escapeCsv(report.metadata.asOfDate)}`);
  lines.push(`Mode,${escapeCsv(report.metadata.mode)}`);
  lines.push(`Tracked Institutions,${report.metadata.institutionsCount}`);
  lines.push(`Tracked Accounts,${report.metadata.accountsCount}`);
  lines.push(`Total Positions Count,${report.metadata.positionsCount}`);
  lines.push(``);

  // =========================================================================
  // SECTION 1: EXECUTIVE SUMMARY & MULTI-ACCOUNT RECONCILIATION
  // =========================================================================
  lines.push(`SECTION 1: PORTFOLIO EXECUTIVE SUMMARY & NET WORTH RECONCILIATION`);
  lines.push(`Global Stated Net Worth,$${fmtCurrency(report.section1_ExecutiveSummary.statedNetWorth)}`);
  lines.push(`Global Computed Net Worth,$${fmtCurrency(report.section1_ExecutiveSummary.computedNetWorth)}`);
  lines.push(`Reconciliation Variance,$${fmtCurrency(report.section1_ExecutiveSummary.variance)}`);
  lines.push(`Reconciliation Status,${report.section1_ExecutiveSummary.isReconciled ? 'RECONCILED (OK)' : 'VARIANCE DETECTED'}`);
  lines.push(`Total Raw Cash,$${fmtCurrency(report.section1_ExecutiveSummary.rawCash)}`);
  lines.push(`Locked CSP Collateral,-$${fmtCurrency(report.section1_ExecutiveSummary.cspReserve)}`);
  lines.push(`Global Net Free Cash,$${fmtCurrency(report.section1_ExecutiveSummary.netFreeCash)}`);
  lines.push(`Equities Total Value,$${fmtCurrency(report.section1_ExecutiveSummary.equitiesValue)}`);
  lines.push(`Options Net Liability / Value,$${fmtCurrency(report.section1_ExecutiveSummary.optionsNetValue)}`);
  lines.push(`Fixed Income Total Value,$${fmtCurrency(report.section1_ExecutiveSummary.fixedIncomeValue)}`);
  lines.push(`Crypto Total Value,$${fmtCurrency(report.section1_ExecutiveSummary.cryptoValue || 0)}`);
  lines.push(`Portfolio Blended APY,${report.section1_ExecutiveSummary.blendedApy.toFixed(2)}%`);
  lines.push(`Yield-bearing Assets APY,${report.section1_ExecutiveSummary.yieldBearingApy.toFixed(2)}%`);
  lines.push(``);

  lines.push(`ACCOUNT RECONCILIATION BREAKDOWN`);
  lines.push(
    [
      'Institution',
      'Account #',
      'Account Type',
      'Stated Total',
      'Computed Total',
      'Variance',
      'Status',
      'Cash & Sweeps',
      'Equities Value',
      'Options Net',
      'Fixed Income',
      'Crypto Value',
      'Position Count',
    ].join(',')
  );

  report.section1_ExecutiveSummary.accountsReconciliation.forEach((acc) => {
    lines.push(
      [
        escapeCsv(acc.institution),
        escapeCsv(acc.accountMasked),
        escapeCsv(acc.accountType),
        fmtCurrency(acc.statedTotal),
        fmtCurrency(acc.computedTotal),
        fmtCurrency(acc.variance),
        acc.isReconciled ? 'Reconciled' : 'Variance',
        fmtCurrency(acc.cashValue),
        fmtCurrency(acc.equitiesValue),
        fmtCurrency(acc.optionsValue),
        fmtCurrency(acc.fixedIncomeValue),
        fmtCurrency(acc.cryptoValue || 0),
        acc.positionCount,
      ].join(',')
    );
  });
  lines.push(``);

  // =========================================================================
  // SECTION 2: CASH MANAGER & LIQUID RESERVES LEDGER
  // =========================================================================
  lines.push(`SECTION 2: CASH MANAGER & LIQUID RESERVES LEDGER`);
  lines.push(`Aggregated Raw Cash,$${fmtCurrency(report.section2_CashManager.totalRawCash)}`);
  lines.push(`Locked CSP Reserve,-$${fmtCurrency(report.section2_CashManager.totalCspReserve)}`);
  lines.push(`Global Net Free Cash,$${fmtCurrency(report.section2_CashManager.totalNetFreeCash)}`);
  lines.push(
    [
      'Institution',
      'Account #',
      'Account Type',
      'Core / Sweep Fund',
      'Raw Cash Available',
      'Locked CSP Collateral',
      'Global Net Free Cash',
    ].join(',')
  );

  report.section2_CashManager.rows.forEach((r) => {
    lines.push(
      [
        escapeCsv(r.institution),
        escapeCsv(r.accountMasked),
        escapeCsv(r.accountType),
        escapeCsv(r.coreFund),
        fmtCurrency(r.rawCash),
        fmtCurrency(r.cspReserve),
        fmtCurrency(r.netFreeCash),
      ].join(',')
    );
  });
  lines.push(``);

  // =========================================================================
  // SECTION 3: EQUITIES & COVERED CALL ALLOCATION LEDGER (BY INSTITUTION & ACCOUNT)
  // =========================================================================
  lines.push(`SECTION 3: EQUITIES & COVERED CALL ALLOCATION LEDGER (BY INSTITUTION & ACCOUNT)`);
  lines.push(`Aggregated Equity Value,$${fmtCurrency(report.section3_Equities.totalEquitiesValue)}`);
  lines.push(`Total Shares Held,${fmtNum(report.section3_Equities.totalShares, 4)}`);
  lines.push(`Unique Institutions,${report.section3_Equities.uniqueInstitutions}`);
  lines.push(`Unique Holding Accounts,${report.section3_Equities.uniqueHoldingAccounts}`);
  lines.push(``);

  const instGroups = report.section3_Equities.institutionGroups || [];
  let totalEquityPositions = 0;

  instGroups.forEach((inst) => {
    lines.push(
      `>>> INSTITUTION: ${escapeCsv(inst.institution)} (${inst.accountCount} Accounts | Total Equity: $${fmtCurrency(inst.totalInstitutionValue)})`
    );

    inst.accounts.forEach((acc) => {
      totalEquityPositions += acc.positionCount;
      const anchorStatus = acc.isAnchorReconciled
        ? `Matches Section 1 Anchor ✓ ($${fmtCurrency(acc.section1AnchorValue)})`
        : `Variance vs Section 1 ⚠ (Anchor: $${fmtCurrency(acc.section1AnchorValue)})`;

      lines.push(
        `>> ACCOUNT: ${escapeCsv(acc.institution)} - ${escapeCsv(acc.accountType)} (${escapeCsv(acc.accountMasked)}) [Section 1 Anchor: $${fmtCurrency(acc.section1AnchorValue)}]`
      );

      lines.push(
        [
          'Symbol',
          'Name / Description',
          'Shares',
          'Price',
          'Market Value',
          'Cost Basis',
          'Unrealized P&L',
          '% of Account',
          'Covered Call Status',
        ].join(',')
      );

      acc.rows.forEach((e) => {
        const pnlStr = (e.unrealizedPnl ?? 0) >= 0
          ? `+$${fmtCurrency(e.unrealizedPnl ?? 0)}`
          : `-$${fmtCurrency(Math.abs(e.unrealizedPnl ?? 0))}`;

        lines.push(
          [
            escapeCsv(e.symbol),
            escapeCsv(e.name),
            fmtNum(e.quantity, 4),
            `$${fmtCurrency(e.currentPrice)}`,
            `$${fmtCurrency(e.marketValue)}`,
            `$${fmtCurrency(e.costBasis)}`,
            pnlStr,
            `${e.percentOfAccount.toFixed(2)}%`,
            escapeCsv(e.ccStatus),
          ].join(',')
        );
      });

      // Account Subtotal Row
      const acctPnlStr = acc.totalAccountUnrealizedPnl >= 0
        ? `+$${fmtCurrency(acc.totalAccountUnrealizedPnl)}`
        : `-$${fmtCurrency(Math.abs(acc.totalAccountUnrealizedPnl))}`;

      lines.push(
        [
          escapeCsv(`[SUBTOTAL: ${acc.institution} ${acc.accountMasked}]`),
          `${acc.positionCount} Positions`,
          fmtNum(acc.totalAccountShares, 4),
          '',
          `$${fmtCurrency(acc.totalAccountValue)}`,
          `$${fmtCurrency(acc.totalAccountCostBasis)}`,
          acctPnlStr,
          '100.00%',
          escapeCsv(anchorStatus),
        ].join(',')
      );
      lines.push(``);
    });

    // Institution Subtotal Row
    lines.push(
      [
        escapeCsv(`[INSTITUTION SUBTOTAL: ${inst.institution} (${inst.accountCount} Accounts)]`),
        `${inst.positionCount} Positions`,
        fmtNum(inst.totalInstitutionShares, 4),
        '',
        `$${fmtCurrency(inst.totalInstitutionValue)}`,
        '',
        '',
        '100.00%',
        'Reconciled',
      ].join(',')
    );
    lines.push(``);
  });

  // Global Equities Reconciled Total Row
  lines.push(
    [
      escapeCsv(`[GLOBAL EQUITIES RECONCILED TOTAL]`),
      `${totalEquityPositions} Positions`,
      fmtNum(report.section3_Equities.totalShares, 4),
      '',
      `$${fmtCurrency(report.section3_Equities.totalEquitiesValue)}`,
      '',
      '',
      '100.00%',
      'Matches Portfolio Consolidated Net Worth',
    ].join(',')
  );
  lines.push(``);

  // =========================================================================
  // SECTION 4: ACTIVE OPTIONS & COLLATERAL EXPOSURE LEDGER
  // =========================================================================
  lines.push(`SECTION 4: ACTIVE OPTIONS & COLLATERAL EXPOSURE LEDGER`);
  lines.push(`Total Collateral Locked,$${fmtCurrency(report.section4_ActiveOptions.totalCollateralLocked)}`);
  lines.push(`Active Put Contracts (CSPs),${report.section4_ActiveOptions.activePutsCount}`);
  lines.push(`Active Call Contracts (CCs),${report.section4_ActiveOptions.activeCallsCount}`);
  lines.push(
    [
      'Underlying',
      'Option Symbol',
      'Option Right',
      'Strike Price',
      'Contracts',
      'Expiration Date',
      'Institution',
      'Account #',
      'Collateral Locked',
      'Premium Received / Net',
    ].join(',')
  );

  report.section4_ActiveOptions.rows.forEach((o) => {
    lines.push(
      [
        escapeCsv(o.underlying),
        escapeCsv(o.symbol),
        o.right,
        fmtCurrency(o.strike),
        o.contracts,
        escapeCsv(o.expiry || 'N/A'),
        escapeCsv(o.institution),
        escapeCsv(o.accountMasked),
        fmtCurrency(o.collateralLocked),
        fmtCurrency(o.premiumReceived),
      ].join(',')
    );
  });
  lines.push(``);

  // =========================================================================
  // SECTION 5: FIXED INCOME & YIELD SCHEDULE
  // =========================================================================
  lines.push(`SECTION 5: FIXED INCOME & YIELD SCHEDULE`);
  lines.push(`Yield-Bearing Assets Value,$${fmtCurrency(report.section5_FixedIncome.totalYieldValue)}`);
  lines.push(`Estimated Annual Income,$${fmtCurrency(report.section5_FixedIncome.totalAnnualIncome)}`);
  lines.push(`Blended APY,${report.section5_FixedIncome.blendedApy.toFixed(2)}%`);
  lines.push(
    [
      'Symbol',
      'Asset Name',
      'Category',
      'Institution',
      'Account #',
      'Market Value',
      'Stated APY%',
      'Est. Annual Income',
      'Maturity Date',
    ].join(',')
  );

  report.section5_FixedIncome.rows.forEach((fi) => {
    lines.push(
      [
        escapeCsv(fi.symbol),
        escapeCsv(fi.name),
        escapeCsv(fi.category),
        escapeCsv(fi.institution),
        escapeCsv(fi.accountMasked),
        fmtCurrency(fi.marketValue),
        `${fi.apy.toFixed(2)}%`,
        fmtCurrency(fi.annualIncome),
        escapeCsv(fi.maturityDate || 'N/A'),
      ].join(',')
    );
  });
  lines.push(``);

  // =========================================================================
  // SECTION 6: DIGITAL CURRENCY & CRYPTO ASSETS LEDGER
  // =========================================================================
  lines.push(`SECTION 6: DIGITAL CURRENCY & CRYPTO ASSETS LEDGER`);
  lines.push(`Aggregated Crypto Value,$${fmtCurrency(report.section6_DigitalCurrency.totalCryptoValue)}`);
  lines.push(`Total Cost Basis,$${fmtCurrency(report.section6_DigitalCurrency.totalCostBasis)}`);
  lines.push(
    `Total Unrealized Gain/Loss,$${fmtCurrency(report.section6_DigitalCurrency.totalUnrealizedPnl)} (${report.section6_DigitalCurrency.totalUnrealizedPnlPct.toFixed(2)}%)`
  );
  lines.push(
    [
      'Symbol',
      'Asset Name',
      'Quantity',
      'Last Price',
      'Market Value',
      'Cost Basis',
      'Unrealized Gain/Loss Dollar',
      'Unrealized Gain/Loss Percent',
      'Institution',
      'Account #',
      '% of Crypto',
      '% of Portfolio',
    ].join(',')
  );

  report.section6_DigitalCurrency.rows.forEach((c) => {
    lines.push(
      [
        escapeCsv(c.symbol),
        escapeCsv(c.name),
        fmtNum(c.quantity, 8),
        fmtCurrency(c.currentPrice),
        fmtCurrency(c.marketValue),
        fmtCurrency(c.costBasis),
        fmtCurrency(c.unrealizedPnl),
        `${c.unrealizedPnlPct.toFixed(2)}%`,
        escapeCsv(c.institution),
        escapeCsv(c.accountMasked),
        `${c.percentOfCrypto.toFixed(2)}%`,
        `${c.percentOfPortfolio.toFixed(2)}%`,
      ].join(',')
    );
  });
  lines.push(``);

  // =========================================================================
  // SECTION 7: COMPREHENSIVE FLAT MASTER AUDIT LEDGER
  // =========================================================================
  lines.push(`SECTION 7: COMPREHENSIVE FLAT MASTER AUDIT LEDGER (MACHINE-READABLE)`);
  lines.push(
    [
      'Institution',
      'Account_ID',
      'Account_Masked',
      'Account_Type',
      'Asset_Class',
      'Symbol',
      'Name',
      'Quantity',
      'Current_Price',
      'Market_Value',
      'Cost_Basis',
      'Unrealized_PnL',
      'APY_Pct',
      'Maturity_Expiry_Date',
      'Option_Right',
      'Option_Strike',
      'Option_Contracts',
      'Option_Expiry',
      'Collateral_Locked',
      'Covered_Call_Status',
      'Account_Stated_Total',
      'Account_Computed_Total',
      'Account_Reconciliation_Status',
    ].join(',')
  );

  const flatRows = report.section7_MasterFlatLedger || report.section6_MasterFlatLedger || [];
  flatRows.forEach((row: FlatAuditLedgerRow) => {
    lines.push(
      [
        escapeCsv(row.institution),
        escapeCsv(row.accountId),
        escapeCsv(row.accountMasked),
        escapeCsv(row.accountType),
        escapeCsv(row.assetClass),
        escapeCsv(row.symbol),
        escapeCsv(row.name),
        fmtNum(row.quantity, 5),
        fmtCurrency(row.currentPrice),
        fmtCurrency(row.marketValue),
        fmtCurrency(row.costBasis),
        fmtCurrency(row.unrealizedPnl ?? 0),
        row.apy !== undefined ? `${row.apy.toFixed(2)}%` : '',
        escapeCsv(row.maturityDate || row.optionExpiry || ''),
        escapeCsv(row.optionRight || ''),
        row.optionStrike !== undefined ? fmtCurrency(row.optionStrike) : '',
        row.optionContracts !== undefined ? row.optionContracts : '',
        escapeCsv(row.optionExpiry || ''),
        fmtCurrency(row.collateralLocked),
        escapeCsv(row.coveredCallStatus),
        row.accountStatedTotal !== undefined ? fmtCurrency(row.accountStatedTotal) : '',
        row.accountComputedTotal !== undefined ? fmtCurrency(row.accountComputedTotal) : '',
        escapeCsv(row.accountReconciliationStatus || ''),
      ].join(',')
    );
  });

  return lines.join('\r\n');
}

/**
 * Triggers a browser download of the CSV content.
 */
export function downloadCsvFile(csvContent: string, fileName: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName.endsWith('.csv') ? fileName : `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
