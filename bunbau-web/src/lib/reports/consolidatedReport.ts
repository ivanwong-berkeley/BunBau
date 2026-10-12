import { CanonicalPosition, CanonicalAccount, AssetClass } from '../portfolio/types';
import { extractAccountSuffix } from '../portfolio/accountId';
import {
  getEquityDrilldown,
  getNetWorthDrilldown,
  getFreeCashDrilldown,
  getBlendedApyDrilldown,
  getOptionCollateralDrilldown,
  getCryptoDrilldown,
  EquityDrilldownRow,
  NetWorthDrilldownRow,
  FreeCashDrilldownRow,
  ApyDrilldownRow,
  OptionCollateralDrilldownRow,
  CryptoDrilldownRow,
} from '../portfolio/drilldownSelectors';
import { netWorth, cashSummary, blendedApy, cspReserve, round2 } from '../portfolio/selectors';

export interface FlatAuditLedgerRow {
  institution: string;
  accountId: string;
  accountMasked: string;
  accountType: string;
  assetClass: AssetClass;
  symbol: string;
  name: string;
  quantity: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnl?: number;
  apy?: number;
  maturityDate?: string;
  optionRight?: 'PUT' | 'CALL';
  optionStrike?: number;
  optionContracts?: number;
  optionExpiry?: string;
  collateralLocked: number;
  coveredCallStatus: string;
  accountStatedTotal?: number;
  accountComputedTotal?: number;
  accountReconciliationStatus?: string;
}

export interface AccountReconciliationSummary {
  institution: string;
  accountId: string;
  accountMasked: string;
  accountType: string;
  statedTotal: number;
  computedTotal: number;
  variance: number;
  isReconciled: boolean;
  cashValue: number;
  equitiesValue: number;
  optionsValue: number;
  fixedIncomeValue: number;
  cryptoValue: number;
  positionCount: number;
}

export interface FormattedEquityRow extends EquityDrilldownRow {
  ccStatus: string;
  percentOfAccount: number;
  unrealizedPnl?: number;
}

export interface AccountEquitiesGroup {
  institution: string;
  accountId: string;
  accountMasked: string;
  accountType: string;
  totalAccountValue: number;
  totalAccountShares: number;
  totalAccountCostBasis: number;
  totalAccountUnrealizedPnl: number;
  positionCount: number;
  section1AnchorValue: number;
  isAnchorReconciled: boolean;
  rows: FormattedEquityRow[];
}

export interface InstitutionEquitiesGroup {
  institution: string;
  totalInstitutionValue: number;
  totalInstitutionShares: number;
  accountCount: number;
  positionCount: number;
  accounts: AccountEquitiesGroup[];
}

export interface ConsolidatedPortfolioReport {
  metadata: {
    title: string;
    generatedAt: string;
    asOfDate: string;
    mode: 'Live' | 'Demo';
    institutionsCount: number;
    accountsCount: number;
    positionsCount: number;
  };
  section1_ExecutiveSummary: {
    statedNetWorth: number;
    computedNetWorth: number;
    variance: number;
    isReconciled: boolean;
    rawCash: number;
    cspReserve: number;
    netFreeCash: number;
    equitiesValue: number;
    optionsNetValue: number;
    fixedIncomeValue: number;
    cryptoValue: number;
    blendedApy: number;
    /** Income / yield-bearing assets only (blendedApy is income / all owned assets). */
    yieldBearingApy: number;
    accountsReconciliation: AccountReconciliationSummary[];
  };
  section2_CashManager: {
    totalRawCash: number;
    totalCspReserve: number;
    totalNetFreeCash: number;
    rows: FreeCashDrilldownRow[];
  };
  section3_Equities: {
    totalEquitiesValue: number;
    totalShares: number;
    uniqueInstitutions: number;
    uniqueHoldingAccounts: number;
    rows: FormattedEquityRow[];
    institutionGroups: InstitutionEquitiesGroup[];
  };
  section4_ActiveOptions: {
    totalCollateralLocked: number;
    activePutsCount: number;
    activeCallsCount: number;
    rows: OptionCollateralDrilldownRow[];
  };
  section5_FixedIncome: {
    totalYieldValue: number;
    totalAnnualIncome: number;
    blendedApy: number;
    rows: ApyDrilldownRow[];
  };
  section6_DigitalCurrency: {
    totalCryptoValue: number;
    totalCostBasis: number;
    totalUnrealizedPnl: number;
    totalUnrealizedPnlPct: number;
    uniqueAssetsCount: number;
    rows: CryptoDrilldownRow[];
  };
  section7_MasterFlatLedger: FlatAuditLedgerRow[];
  /** Backward compatibility alias */
  section6_MasterFlatLedger?: FlatAuditLedgerRow[];
}

export interface BuildReportOptions {
  asOfDate?: string;
  isDemo?: boolean;
  filterAccountIds?: string[];
  reportTitle?: string;
}

export function buildConsolidatedReport(
  positions: CanonicalPosition[],
  accounts: CanonicalAccount[],
  options: BuildReportOptions = {}
): ConsolidatedPortfolioReport {
  // Apply account filtering if specified
  const targetAccounts = options.filterAccountIds && options.filterAccountIds.length > 0
    ? accounts.filter((a) => options.filterAccountIds!.includes(a.id))
    : accounts;

  const targetAccountIds = new Set(targetAccounts.map((a) => a.id));

  const targetPositions = options.filterAccountIds && options.filterAccountIds.length > 0
    ? positions.filter((p) => targetAccountIds.has(p.accountId))
    : positions;

  const asOfDate = options.asOfDate || new Date().toISOString().slice(0, 10);
  const isDemo = !!options.isDemo;

  // Level 1 & Level 2 Drilldowns
  const netWorthData = getNetWorthDrilldown(targetAccounts, targetPositions);
  const freeCashData = getFreeCashDrilldown(targetPositions, targetAccounts);
  const equityData = getEquityDrilldown(targetPositions, targetAccounts);
  const optionCollateralData = getOptionCollateralDrilldown(targetPositions, targetAccounts);
  const blendedApyData = getBlendedApyDrilldown(targetPositions, targetAccounts);

  const cash = cashSummary(targetPositions);
  const totalWorth = netWorth(targetPositions);
  const blendedApyPct = blendedApy(targetPositions);
  const totalCsp = cspReserve(targetPositions);

  // Section 1: Executive Summary & Account Reconciliation
  const accountsReconciliation: AccountReconciliationSummary[] = netWorthData.map((nw) => {
    // In our architecture, account net worth is computed sum of owned assets minus short liabilities
    const computed = nw.totalNetWorth;
    // If account has statedTotal recorded, use it; otherwise defaults to computed
    const parentAccount = targetAccounts.find((a) => a.id === nw.accountId);
    const stated = (parentAccount as any)?.statedTotal ?? (parentAccount as any)?.netAccountValue ?? computed;
    const variance = Math.round((computed - stated) * 100) / 100;
    const isReconciled = Math.abs(variance) <= 0.05;

    return {
      institution: nw.institution,
      accountId: nw.accountId,
      accountMasked: nw.accountMasked,
      accountType: nw.accountType,
      statedTotal: stated,
      computedTotal: computed,
      variance,
      isReconciled,
      cashValue: nw.cashValue,
      equitiesValue: nw.equitiesValue,
      optionsValue: nw.optionsValue,
      fixedIncomeValue: nw.fixedIncomeValue,
      cryptoValue: nw.cryptoValue,
      positionCount: nw.positionCount,
    };
  });

  const statedNetWorth = accountsReconciliation.reduce((sum, a) => sum + a.statedTotal, 0);
  const computedNetWorth = accountsReconciliation.reduce((sum, a) => sum + a.computedTotal, 0);
  const totalVariance = Math.round((computedNetWorth - statedNetWorth) * 100) / 100;
  const isReconciled = Math.abs(totalVariance) <= 0.05;

  // Section 2: Cash Manager
  const totalRawCash = freeCashData.reduce((sum, r) => sum + r.rawCash, 0);
  const totalFreeCsp = freeCashData.reduce((sum, r) => sum + r.cspReserve, 0);
  const totalNetFree = freeCashData.reduce((sum, r) => sum + r.netFreeCash, 0);

  // Section 3: Equities with exact CC status strings and Hierarchical Subtotals by Institution & Account
  const accountPositionsMap = new Map<string, Array<EquityDrilldownRow & { ccStatus: string }>>();
  equityData.forEach((e) => {
    let ccStatus = 'Available';
    if (e.isCovered) {
      ccStatus = 'Covered (100 shs)';
    } else if (e.isPartial) {
      ccStatus = `Partial (${Math.round(e.coveredShares || 0)} cov / ${(e.availableShares || 0).toFixed(2)} free)`;
    }
    const acctKey = `${e.institution}__${e.accountId}`;
    if (!accountPositionsMap.has(acctKey)) {
      accountPositionsMap.set(acctKey, []);
    }
    accountPositionsMap.get(acctKey)!.push({ ...e, ccStatus });
  });

  // Build lookup map for Section 1 reconciliation anchors
  const reconAnchorMap = new Map<string, number>();
  accountsReconciliation.forEach((a) => {
    reconAnchorMap.set(`${a.institution.toLowerCase()}__${a.accountId}`, a.equitiesValue);
  });

  const accountGroupsList: AccountEquitiesGroup[] = [];
  const allFormattedRows: FormattedEquityRow[] = [];

  accountPositionsMap.forEach((rawRows) => {
    const first = rawRows[0];
    const totalAccountValue = rawRows.reduce((sum, r) => sum + r.marketValue, 0);
    const totalAccountShares = rawRows.reduce((sum, r) => sum + r.quantity, 0);
    const totalAccountCostBasis = rawRows.reduce((sum, r) => sum + (r.costBasis || 0), 0);
    const totalAccountUnrealizedPnl = Math.round(
      rawRows.reduce((sum, r) => sum + (r.unrealizedPnl ?? (r.costBasis ? r.marketValue - r.costBasis : 0)), 0) * 100
    ) / 100;

    const anchorValue = reconAnchorMap.get(`${first.institution.toLowerCase()}__${first.accountId}`) ?? totalAccountValue;
    const isAnchorReconciled = Math.abs(totalAccountValue - anchorValue) <= 0.05;

    // Calculate percentOfAccount and sort positions by Symbol ASC (BunBau Standard UX)
    const formattedRows: FormattedEquityRow[] = rawRows
      .map((r) => ({
        ...r,
        unrealizedPnl: r.unrealizedPnl ?? (r.costBasis ? Math.round((r.marketValue - r.costBasis) * 100) / 100 : 0),
        percentOfAccount: totalAccountValue > 0 ? (r.marketValue / totalAccountValue) * 100 : 0,
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol, undefined, { sensitivity: 'base' }));

    formattedRows.forEach((r) => allFormattedRows.push(r));

    accountGroupsList.push({
      institution: first.institution,
      accountId: first.accountId,
      accountMasked: first.accountMasked,
      accountType: first.accountType,
      totalAccountValue,
      totalAccountShares,
      totalAccountCostBasis,
      totalAccountUnrealizedPnl,
      positionCount: formattedRows.length,
      section1AnchorValue: anchorValue,
      isAnchorReconciled,
      rows: formattedRows,
    });
  });

  // Group accounts by Institution
  const institutionMap = new Map<string, AccountEquitiesGroup[]>();
  accountGroupsList.forEach((accGroup) => {
    const instKey = accGroup.institution;
    if (!institutionMap.has(instKey)) {
      institutionMap.set(instKey, []);
    }
    institutionMap.get(instKey)!.push(accGroup);
  });

  const institutionGroups: InstitutionEquitiesGroup[] = [];
  institutionMap.forEach((accs, institution) => {
    // Sort accounts by masked number
    accs.sort((a, b) => a.accountMasked.localeCompare(b.accountMasked));

    const totalInstitutionValue = accs.reduce((sum, a) => sum + a.totalAccountValue, 0);
    const totalInstitutionShares = accs.reduce((sum, a) => sum + a.totalAccountShares, 0);
    const positionCount = accs.reduce((sum, a) => sum + a.positionCount, 0);

    institutionGroups.push({
      institution,
      totalInstitutionValue,
      totalInstitutionShares,
      accountCount: accs.length,
      positionCount,
      accounts: accs,
    });
  });

  // Sort institutions alphabetically
  institutionGroups.sort((a, b) => a.institution.localeCompare(b.institution));

  const totalEquitiesValue = institutionGroups.reduce((sum, i) => sum + i.totalInstitutionValue, 0);
  const totalShares = institutionGroups.reduce((sum, i) => sum + i.totalInstitutionShares, 0);
  const uniqueHoldingAccounts = accountGroupsList.length;
  const uniqueHoldingInstitutions = institutionGroups.length;

  // Section 4: Options
  const totalCollateralLocked = optionCollateralData.reduce((sum, o) => sum + o.collateralLocked, 0);
  const activePutsCount = optionCollateralData.filter((o) => o.right === 'PUT').length;
  const activeCallsCount = optionCollateralData.filter((o) => o.right === 'CALL').length;

  // Section 5: Fixed Income & Yield
  const totalYieldValue = blendedApyData.reduce((sum, y) => sum + y.marketValue, 0);
  const totalAnnualIncome = blendedApyData.reduce((sum, y) => sum + y.annualIncome, 0);
  const reportBlendedApy = totalYieldValue > 0 ? (totalAnnualIncome / totalYieldValue) * 100 : blendedApyPct;

  // Section 6: Digital Currency & Crypto Assets
  const cryptoData = getCryptoDrilldown(targetPositions, targetAccounts);
  const totalCryptoValue = round2(cryptoData.reduce((sum, c) => sum + c.marketValue, 0));
  const totalCryptoCostBasis = round2(cryptoData.reduce((sum, c) => sum + c.costBasis, 0));
  const totalCryptoUnrealizedPnl = round2(totalCryptoValue - totalCryptoCostBasis);
  const totalCryptoUnrealizedPnlPct = totalCryptoCostBasis > 0 ? round2((totalCryptoUnrealizedPnl / totalCryptoCostBasis) * 100) : 0;

  // Section 7: Comprehensive Flat Master Audit Ledger
  // Build lookup maps for account reconciliation and CC status
  const reconMap = new Map<string, AccountReconciliationSummary>();
  accountsReconciliation.forEach((a) => reconMap.set(`${a.institution}_${a.accountId}`, a));

  const ccMap = new Map<string, string>();
  allFormattedRows.forEach((e) => ccMap.set(`${e.accountId}_${e.symbol.toUpperCase()}`, e.ccStatus));

  const flatRows: FlatAuditLedgerRow[] = targetPositions.map((pos) => {
    const parent = targetAccounts.find((a) => a.id === pos.accountId);
    const masked = parent?.maskedAccount || `***-${extractAccountSuffix(pos.accountId)}`;
    const acctType = parent?.accountType || 'Brokerage';
    const recon = reconMap.get(`${pos.institution}_${pos.accountId}`);
    const key = `${pos.accountId}_${pos.symbol.toUpperCase()}`;
    const ccStatus = ccMap.get(key) || (pos.assetClass === 'CoveredCall' ? 'Active CC Short Leg' : 'N/A');

    const price =
      (pos as any).currentPrice ||
      (pos.quantity ? Math.abs(pos.marketValue / pos.quantity) : 0);

    let collateralLocked = 0;
    if (pos.assetClass === 'CSP') {
      const strike = pos.option?.strike || 0;
      const contracts = pos.option?.contracts || Math.abs(pos.quantity || 1);
      collateralLocked = strike * 100 * contracts;
    }

    return {
      institution: pos.institution,
      accountId: pos.accountId,
      accountMasked: masked,
      accountType: acctType,
      assetClass: pos.assetClass,
      symbol: pos.symbol,
      name: (pos as any).description || pos.name || pos.symbol,
      quantity: pos.quantity,
      currentPrice: price,
      marketValue: pos.marketValue,
      costBasis: pos.costBasis || 0,
      unrealizedPnl: pos.unrealizedPnl,
      apy: pos.apy,
      maturityDate: pos.maturityDate,
      optionRight: pos.option?.right,
      optionStrike: pos.option?.strike,
      optionContracts: pos.option?.contracts,
      optionExpiry: pos.option?.expiry,
      collateralLocked,
      coveredCallStatus: ccStatus,
      accountStatedTotal: recon?.statedTotal,
      accountComputedTotal: recon?.computedTotal,
      accountReconciliationStatus: recon?.isReconciled ? 'Reconciled' : 'Variance',
    };
  });

  const uniqueInstitutions = new Set(targetPositions.map((p) => p.institution)).size;
  const uniqueAccountsCount = new Set(targetPositions.map((p) => `${p.institution}_${p.accountId}`)).size;

  return {
    metadata: {
      title: options.reportTitle || 'Portfolio Consolidated Audit Report',
      generatedAt: new Date().toISOString(),
      asOfDate,
      mode: isDemo ? 'Demo' : 'Live',
      institutionsCount: uniqueInstitutions,
      accountsCount: uniqueAccountsCount,
      positionsCount: targetPositions.length,
    },
    section1_ExecutiveSummary: {
      statedNetWorth,
      computedNetWorth,
      variance: totalVariance,
      isReconciled,
      rawCash: cash.rawCash,
      cspReserve: totalCsp,
      netFreeCash: cash.netFreeCash,
      equitiesValue: totalEquitiesValue,
      optionsNetValue: netWorthData.reduce((sum, nw) => sum + nw.optionsValue, 0),
      fixedIncomeValue: netWorthData.reduce((sum, nw) => sum + nw.fixedIncomeValue, 0),
      cryptoValue: netWorthData.reduce((sum, nw) => sum + (nw.cryptoValue || 0), 0),
      blendedApy: blendedApyPct,
      yieldBearingApy: reportBlendedApy,
      accountsReconciliation,
    },
    section2_CashManager: {
      totalRawCash,
      totalCspReserve: totalFreeCsp,
      totalNetFreeCash: totalNetFree,
      rows: freeCashData,
    },
    section3_Equities: {
      totalEquitiesValue,
      totalShares,
      uniqueInstitutions: uniqueHoldingInstitutions,
      uniqueHoldingAccounts,
      rows: allFormattedRows,
      institutionGroups,
    },
    section4_ActiveOptions: {
      totalCollateralLocked,
      activePutsCount,
      activeCallsCount,
      rows: optionCollateralData,
    },
    section5_FixedIncome: {
      totalYieldValue,
      totalAnnualIncome,
      blendedApy: reportBlendedApy,
      rows: blendedApyData,
    },
    section6_DigitalCurrency: {
      totalCryptoValue,
      totalCostBasis: totalCryptoCostBasis,
      totalUnrealizedPnl: totalCryptoUnrealizedPnl,
      totalUnrealizedPnlPct: totalCryptoUnrealizedPnlPct,
      uniqueAssetsCount: new Set(cryptoData.map((c) => c.symbol)).size,
      rows: cryptoData,
    },
    section7_MasterFlatLedger: flatRows,
    section6_MasterFlatLedger: flatRows,
  };
}
