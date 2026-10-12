import { CanonicalPosition, CanonicalAccount, AssetClass } from './types';
import { extractAccountSuffix } from './accountId';
import { round2 } from './selectors';

export interface EquityDrilldownRow {
  institution: string;
  accountId: string;
  accountMasked: string;
  accountType: string;
  symbol: string;
  name: string;
  quantity: number;
  currentPrice: number;
  costBasis: number;
  marketValue: number;
  unrealizedPnl?: number;
  percentOfSymbol: number;
  isCovered: boolean;
  isPartial?: boolean;
  coveredShares?: number;
  availableShares?: number;
}

export interface NetWorthDrilldownRow {
  institution: string;
  accountId: string;
  accountMasked: string;
  accountType: string;
  cashValue: number;
  equitiesValue: number;
  optionsValue: number;
  fixedIncomeValue: number;
  cryptoValue: number;
  totalNetWorth: number;
  percentOfPortfolio: number;
  positionCount: number;
}

export interface FreeCashDrilldownRow {
  institution: string;
  accountId: string;
  accountMasked: string;
  accountType: string;
  rawCash: number;
  cspReserve: number;
  netFreeCash: number;
  coreFund: string;
}

export interface ApyDrilldownRow {
  institution: string;
  accountId: string;
  accountMasked: string;
  symbol: string;
  name: string;
  category: string;
  marketValue: number;
  apy: number;
  annualIncome: number;
  weightedContribution: number;
  maturityDate?: string;
}

export interface OptionCollateralDrilldownRow {
  institution: string;
  accountId: string;
  accountMasked: string;
  symbol: string;
  underlying: string;
  strike: number;
  contracts: number;
  right: 'PUT' | 'CALL';
  expiry?: string;
  collateralLocked: number;
  premiumReceived: number;
}

export interface AssetAllocationDrilldownRow {
  assetClass: string;
  institution: string;
  accountMasked: string;
  symbol: string;
  name: string;
  quantity: number;
  marketValue: number;
  percentOfClass: number;
}

const isOption = (p: CanonicalPosition) =>
  p.assetClass === 'CSP' ||
  p.assetClass === 'CoveredCall' ||
  (p.assetClass as string) === 'Option' ||
  !!p.option;

const isEquity = (p: CanonicalPosition) =>
  p.assetClass === 'Stock' || p.assetClass === 'ETF';

const isFixedIncome = (p: CanonicalPosition) =>
  p.assetClass === 'CD' ||
  p.assetClass === 'Treasury' ||
  p.assetClass === 'BondETF' ||
  (p.assetClass as string) === 'FixedIncome';

/**
 * Breakdown of an Equity (Stock / ETF) across all accounts and institutions.
 */
export function getEquityDrilldown(
  positions: CanonicalPosition[],
  accounts: CanonicalAccount[],
  targetSymbol?: string
): EquityDrilldownRow[] {
  const equityPositions = positions.filter((p) => {
    if (!isEquity(p)) return false;
    if (targetSymbol) {
      return p.symbol.toUpperCase() === targetSymbol.toUpperCase();
    }
    return true;
  });

  const totalSymbolValue = equityPositions.reduce((acc, p) => acc + (p.marketValue || 0), 0) || 1;

  // Active covered calls per account & symbol (contracts * 100 shares locked)
  const coveredSharesPerAccount = new Map<string, number>();
  positions
    .filter(
      (p) =>
        p.assetClass === 'CoveredCall' ||
        (isOption(p) && (p.option?.right === 'CALL' || (p as any).optionType === 'Call'))
    )
    .forEach((p) => {
      const underlying = (
        p.option?.underlying ||
        (p as any).underlying ||
        p.symbol.split(' ')[0]
      ).toUpperCase();
      const key = `${p.accountId}_${underlying}`;
      const contracts = Math.abs(p.quantity || p.option?.contracts || 1);
      const lockedShares = contracts * 100;
      coveredSharesPerAccount.set(key, (coveredSharesPerAccount.get(key) || 0) + lockedShares);
    });

  return equityPositions.map((pos) => {
    const parent = accounts.find((a) => a.id === pos.accountId);
    const masked = parent?.maskedAccount || `***-${extractAccountSuffix(pos.accountId)}`;
    const acctType = parent?.accountType || 'Brokerage';
    const price =
      (pos as any).currentPrice || (pos.quantity ? Math.abs(pos.marketValue / pos.quantity) : 0);
    const coveredKey = `${pos.accountId}_${pos.symbol.toUpperCase()}`;
    const lockedShares = coveredSharesPerAccount.get(coveredKey) || 0;
    const isCovered = lockedShares >= pos.quantity && pos.quantity > 0;
    const isPartial = lockedShares > 0 && lockedShares < pos.quantity;
    const availableShares = Math.max(0, pos.quantity - lockedShares);

    return {
      institution: pos.institution,
      accountId: pos.accountId,
      accountMasked: masked,
      accountType: acctType,
      symbol: pos.symbol,
      name: (pos as any).description || pos.name || pos.symbol,
      quantity: pos.quantity,
      currentPrice: price,
      costBasis: pos.costBasis || 0,
      marketValue: pos.marketValue,
      unrealizedPnl: (pos as any).unrealizedPnl ?? (pos.costBasis ? Math.round((pos.marketValue - pos.costBasis) * 100) / 100 : 0),
      percentOfSymbol: (pos.marketValue / totalSymbolValue) * 100,
      isCovered,
      isPartial,
      coveredShares: Math.min(lockedShares, pos.quantity),
      availableShares,
    };
  });
}

/**
 * Breakdown of Net Worth by Institution & Account.
 */
export function getNetWorthDrilldown(
  accounts: CanonicalAccount[],
  positions: CanonicalPosition[]
): NetWorthDrilldownRow[] {
  const totalPortfolioValue =
    positions
      .filter((p) => !isOption(p))
      .reduce((sum, p) => sum + p.marketValue, 0) || 1;

  if (accounts.length === 0) {
    const grouped = new Map<string, CanonicalPosition[]>();
    for (const p of positions) {
      const key = `${p.institution}_${p.accountId}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(p);
    }

    return Array.from(grouped.entries()).map(([, acctPositions]) => {
      const inst = acctPositions[0].institution;
      const acctId = acctPositions[0].accountId;
      const cash = acctPositions
        .filter((p) => p.assetClass === 'Cash')
        .reduce((s, p) => s + p.marketValue, 0);
      const equities = acctPositions
        .filter((p) => isEquity(p))
        .reduce((s, p) => s + p.marketValue, 0);
      const options = acctPositions
        .filter((p) => isOption(p))
        .reduce((s, p) => s + p.marketValue, 0);
      const fixed = acctPositions
        .filter((p) => isFixedIncome(p))
        .reduce((s, p) => s + p.marketValue, 0);
      const crypto = acctPositions
        .filter((p) => p.assetClass === 'Crypto')
        .reduce((s, p) => s + p.marketValue, 0);
      const net = cash + equities + fixed + crypto;

      return {
        institution: inst,
        accountId: acctId,
        accountMasked: `***-${extractAccountSuffix(acctId)}`,
        accountType: 'Brokerage',
        cashValue: cash,
        equitiesValue: equities,
        optionsValue: options,
        fixedIncomeValue: fixed,
        cryptoValue: crypto,
        totalNetWorth: net,
        percentOfPortfolio: (net / totalPortfolioValue) * 100,
        positionCount: acctPositions.length,
      };
    });
  }

  return accounts.map((acct) => {
    const acctPositions = positions.filter((p) => p.accountId === acct.id);
    const cash = acctPositions
      .filter((p) => p.assetClass === 'Cash')
      .reduce((s, p) => s + p.marketValue, 0);
    const equities = acctPositions
      .filter((p) => isEquity(p))
      .reduce((s, p) => s + p.marketValue, 0);
    const options = acctPositions
      .filter((p) => isOption(p))
      .reduce((s, p) => s + p.marketValue, 0);
    const fixed = acctPositions
      .filter((p) => isFixedIncome(p))
      .reduce((s, p) => s + p.marketValue, 0);
    const crypto = acctPositions
      .filter((p) => p.assetClass === 'Crypto')
      .reduce((s, p) => s + p.marketValue, 0);
    const net = cash + equities + fixed + crypto;

    return {
      institution: acct.institution,
      accountId: acct.id,
      accountMasked: acct.maskedAccount,
      accountType: acct.accountType || 'Brokerage',
      cashValue: cash,
      equitiesValue: equities,
      optionsValue: options,
      fixedIncomeValue: fixed,
      cryptoValue: crypto,
      totalNetWorth: net,
      percentOfPortfolio: (net / totalPortfolioValue) * 100,
      positionCount: acctPositions.length,
    };
  });
}

/**
 * Breakdown of Raw Cash, CSP Reserve, and Net Free Cash by Account.
 */
export function getFreeCashDrilldown(
  positions: CanonicalPosition[],
  accounts: CanonicalAccount[]
): FreeCashDrilldownRow[] {
  const acctMap = new Map<
    string,
    { rawCash: number; cspReserve: number; coreFund: string; inst: string; masked: string; type: string }
  >();

  // Initialize from accounts
  for (const acct of accounts) {
    acctMap.set(acct.id, {
      rawCash: 0,
      cspReserve: 0,
      coreFund: 'Cash',
      inst: acct.institution,
      masked: acct.maskedAccount,
      type: acct.accountType || 'Brokerage',
    });
  }

  // Populate cash and CSP reserve
  for (const p of positions) {
    if (!acctMap.has(p.accountId)) {
      acctMap.set(p.accountId, {
        rawCash: 0,
        cspReserve: 0,
        coreFund: 'Cash',
        inst: p.institution,
        masked: `***-${extractAccountSuffix(p.accountId)}`,
        type: 'Brokerage',
      });
    }

    const current = acctMap.get(p.accountId)!;

    if (p.assetClass === 'Cash') {
      current.rawCash += p.marketValue;
      if (p.symbol && p.symbol !== 'USD' && p.symbol !== 'Cash') {
        current.coreFund = p.symbol;
      }
    } else if (
      p.assetClass === 'CSP' ||
      (isOption(p) && (p.option?.right === 'PUT' || (p as any).optionType === 'Put'))
    ) {
      const strike = p.option?.strike || (p as any).strikePrice || 0;
      const contracts = p.option?.contracts || Math.abs(p.quantity) || 1;
      current.cspReserve += strike * contracts * 100;
    }
  }

  // Filter to accounts with either cash or CSP reserves
  return Array.from(acctMap.entries())
    .filter(([, a]) => a.rawCash > 0 || a.cspReserve > 0)
    .map(([id, a]) => ({
      institution: a.inst,
      accountId: id,
      accountMasked: a.masked,
      accountType: a.type,
      rawCash: a.rawCash,
      cspReserve: a.cspReserve,
      netFreeCash: a.rawCash - a.cspReserve,
      coreFund: a.coreFund,
    }));
}

/**
 * Breakdown of all Yield-bearing Assets contributing to Blended APY%.
 */
export function getBlendedApyDrilldown(
  positions: CanonicalPosition[],
  accounts: CanonicalAccount[]
): ApyDrilldownRow[] {
  const yieldPositions = positions.filter(
    (p) => !isOption(p) && p.apy !== undefined && p.apy > 0 && p.marketValue > 0
  );
  const totalYieldValue = yieldPositions.reduce((s, p) => s + p.marketValue, 0) || 1;

  return yieldPositions.map((p) => {
    const parent = accounts.find((a) => a.id === p.accountId);
    const masked = parent?.maskedAccount || `***-${extractAccountSuffix(p.accountId)}`;
    const annualIncome = p.marketValue * ((p.apy || 0) / 100);
    const weightedContribution = (p.marketValue * (p.apy || 0)) / totalYieldValue;

    return {
      institution: p.institution,
      accountId: p.accountId,
      accountMasked: masked,
      symbol: p.symbol,
      name: (p as any).description || p.name || p.symbol,
      category: p.assetClass,
      marketValue: p.marketValue,
      apy: p.apy || 0,
      annualIncome,
      weightedContribution,
      maturityDate: p.maturityDate,
    };
  });
}

export interface PortfolioApyRow extends ApyDrilldownRow {
  /** True when the asset reports APY > 0 (generates income). */
  generatesIncome: boolean;
}

/**
 * Every owned (non-option) asset with its contribution to the PORTFOLIO blended APY.
 * Contributions use total owned value as the base, so they sum to the dashboard card figure.
 */
export function getPortfolioApyDrilldown(
  positions: CanonicalPosition[],
  accounts: CanonicalAccount[]
): PortfolioApyRow[] {
  const owned = positions.filter((p) => !isOption(p) && p.marketValue > 0);
  const totalValue = owned.reduce((s, p) => s + p.marketValue, 0) || 1;
  return owned.map((p) => {
    const parent = accounts.find((a) => a.id === p.accountId);
    const masked = parent?.maskedAccount || `***-${extractAccountSuffix(p.accountId)}`;
    const apy = p.apy && p.apy > 0 ? p.apy : 0;
    const annualIncome = p.marketValue * (apy / 100);
    return {
      institution: p.institution,
      accountId: p.accountId,
      accountMasked: masked,
      symbol: p.symbol,
      name: (p as any).description || p.name || p.symbol,
      category: p.assetClass,
      marketValue: p.marketValue,
      apy,
      annualIncome,
      weightedContribution: (p.marketValue * apy) / totalValue,
      maturityDate: p.maturityDate,
      generatesIncome: apy > 0,
    };
  });
}

/**
 * Breakdown of active options and locked collateral by Account.
 */
export function getOptionCollateralDrilldown(
  positions: CanonicalPosition[],
  accounts: CanonicalAccount[]
): OptionCollateralDrilldownRow[] {
  const optionPositions = positions.filter((p) => isOption(p));

  return optionPositions.map((p) => {
    const parent = accounts.find((a) => a.id === p.accountId);
    const masked = parent?.maskedAccount || `***-${extractAccountSuffix(p.accountId)}`;
    const right = (p.option?.right || ((p as any).optionType === 'Call' || p.assetClass === 'CoveredCall' ? 'CALL' : 'PUT')) as 'PUT' | 'CALL';
    const strike = p.option?.strike || (p as any).strikePrice || 0;
    const contracts = p.option?.contracts || Math.abs(p.quantity) || 1;
    const collateral = right === 'PUT' ? strike * contracts * 100 : 0;
    const premium = Math.abs(p.marketValue);

    return {
      institution: p.institution,
      accountId: p.accountId,
      accountMasked: masked,
      symbol: p.symbol,
      underlying: p.option?.underlying || (p as any).underlying || p.symbol.split(' ')[0],
      strike,
      contracts,
      right,
      expiry: p.option?.expiry || (p.option as any)?.expiration || (p as any).expirationDate,
      collateralLocked: collateral,
      premiumReceived: premium,
    };
  });
}

/**
 * Breakdown of positions by Asset Allocation Category across Accounts.
 */
export function getAssetAllocationDrilldown(
  positions: CanonicalPosition[],
  accounts: CanonicalAccount[],
  filterClass?: string
): AssetAllocationDrilldownRow[] {
  const filtered = positions.filter((p) => {
    if (filterClass) return p.assetClass === filterClass;
    return !isOption(p);
  });

  const classTotals = new Map<string, number>();
  for (const p of filtered) {
    classTotals.set(p.assetClass, (classTotals.get(p.assetClass) || 0) + p.marketValue);
  }

  return filtered.map((p) => {
    const parent = accounts.find((a) => a.id === p.accountId);
    const masked = parent?.maskedAccount || `***-${extractAccountSuffix(p.accountId)}`;
    const totalForClass = classTotals.get(p.assetClass) || 1;

    return {
      assetClass: p.assetClass,
      institution: p.institution,
      accountMasked: masked,
      symbol: p.symbol,
      name: (p as any).description || p.name || p.symbol,
      quantity: p.quantity,
      marketValue: p.marketValue,
      percentOfClass: (p.marketValue / totalForClass) * 100,
    };
  });
}

export interface CryptoDrilldownRow {
  symbol: string;
  name: string;
  quantity: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  institution: string;
  accountId: string;
  accountMasked: string;
  accountType: string;
  percentOfCrypto: number;
  percentOfPortfolio: number;
}

/**
 * Breakdown of direct Crypto holdings across Accounts.
 */
export function getCryptoDrilldown(
  positions: CanonicalPosition[],
  accounts: CanonicalAccount[],
  filterSymbol?: string
): CryptoDrilldownRow[] {
  const cryptoPositions = positions.filter((p) => {
    if (p.assetClass !== 'Crypto') return false;
    if (filterSymbol && p.symbol.toUpperCase() !== filterSymbol.toUpperCase()) return false;
    return true;
  });

  const totalCryptoValue = positions
    .filter((p) => p.assetClass === 'Crypto')
    .reduce((s, p) => s + p.marketValue, 0);
  const totalNet = positions
    .filter((p) => !isOption(p))
    .reduce((s, p) => s + p.marketValue, 0);

  return cryptoPositions.map((p) => {
    const parent = accounts.find((a) => a.id === p.accountId);
    const masked = parent?.maskedAccount || `***-${extractAccountSuffix(p.accountId)}`;
    const cost = round2(p.costBasis || 0);
    const pnl = round2(p.marketValue - cost);
    const pnlPct = cost > 0 ? round2((pnl / cost) * 100) : 0;
    const price = p.quantity > 0 ? round2(p.marketValue / p.quantity) : 0;

    return {
      symbol: p.symbol,
      name: (p as any).description || p.name || p.symbol,
      quantity: p.quantity,
      currentPrice: price,
      marketValue: p.marketValue,
      costBasis: cost,
      unrealizedPnl: pnl,
      unrealizedPnlPct: pnlPct,
      institution: p.institution,
      accountId: p.accountId,
      accountMasked: masked,
      accountType: parent?.accountType || 'Crypto',
      percentOfCrypto: totalCryptoValue > 0 ? round2((p.marketValue / totalCryptoValue) * 100) : 0,
      percentOfPortfolio: totalNet > 0 ? round2((p.marketValue / totalNet) * 100) : 0,
    };
  });
}

