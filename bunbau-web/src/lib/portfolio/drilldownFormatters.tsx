import React from 'react';
import { CanonicalPosition, CanonicalAccount } from './types';
import {
  getEquityDrilldown,
  getNetWorthDrilldown,
  getFreeCashDrilldown,
  getBlendedApyDrilldown,
  getPortfolioApyDrilldown,
  getOptionCollateralDrilldown,
  getAssetAllocationDrilldown,
  getCryptoDrilldown,
} from './drilldownSelectors';
import { blendedApyBreakdown } from './selectors';
import {
  DrillDownChart,
  buildYieldContributionCharts,
  buildPortfolioApyCharts,
} from './apyCharts';
import {
  DrillDownColumn,
  DrillDownRow,
  SummaryCardItem,
} from '../../components/dashboard/DashboardDrillDownModal';

export interface DrillDownConfig {
  title: string;
  subtitle?: string;
  infoDescription?: string;
  columns: DrillDownColumn[];
  rows: DrillDownRow[];
  summaryCards: SummaryCardItem[];
  /** Optional chart view. Receives the rows currently shown (after tab/search filters). */
  charts?: (rows: DrillDownRow[]) => DrillDownChart[];
  /** Which view opens first when `charts` exists. Defaults to the table. */
  defaultView?: 'table' | 'pie';
  /** Optional link to a related drill-down (e.g. the income asset table). */
  related?: { label: string; build: () => DrillDownConfig };
}

const fmtCurrency = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNumber = (n: number, decimals: number = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

export function buildNetWorthDrillDown(
  accounts: CanonicalAccount[],
  positions: CanonicalPosition[]
): DrillDownConfig {
  const data = getNetWorthDrilldown(accounts, positions);
  const totalNW = data.reduce((sum, r) => sum + r.totalNetWorth, 0);

  const columns: DrillDownColumn[] = [
    { key: 'institution', label: 'Institution', align: 'left' },
    { key: 'accountMasked', label: 'Account #', align: 'left' },
    { key: 'accountType', label: 'Account Type', align: 'left' },
    { key: 'cashValue', label: 'Cash & Sweeps', align: 'right' },
    { key: 'equitiesValue', label: 'Equities (Stocks/ETFs)', align: 'right' },
    { key: 'optionsValue', label: 'Options Net', align: 'right' },
    { key: 'fixedIncomeValue', label: 'Fixed Income', align: 'right' },
    { key: 'cryptoValue', label: 'Crypto', align: 'right' },
    { key: 'totalNetWorth', label: 'Total Net Worth', align: 'right' },
    { key: 'percentOfPortfolio', label: '% of Portfolio', align: 'right' },
  ];

  const rows: DrillDownRow[] = data.map((r) => ({
    id: `${r.institution}_${r.accountId}`,
    institution: r.institution,
    cells: {
      institution: React.createElement(
        'span',
        { className: 'font-semibold text-slate-900 dark:text-white' },
        r.institution
      ),
      accountMasked: React.createElement(
        'span',
        {
          className:
            'font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        },
        r.accountMasked
      ),
      accountType: React.createElement(
        'span',
        {
          className:
            'text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        },
        r.accountType
      ),
      cashValue: React.createElement('span', { className: 'font-mono' }, fmtCurrency(r.cashValue)),
      equitiesValue: React.createElement('span', { className: 'font-mono' }, fmtCurrency(r.equitiesValue)),
      optionsValue: React.createElement('span', { className: 'font-mono' }, fmtCurrency(r.optionsValue)),
      fixedIncomeValue: React.createElement(
        'span',
        { className: 'font-mono' },
        fmtCurrency(r.fixedIncomeValue)
      ),
      cryptoValue: React.createElement(
        'span',
        { className: 'font-mono' },
        fmtCurrency(r.cryptoValue)
      ),
      totalNetWorth: React.createElement(
        'span',
        { className: 'font-mono font-bold text-slate-900 dark:text-white' },
        fmtCurrency(r.totalNetWorth)
      ),
      percentOfPortfolio: React.createElement(
        'span',
        { className: 'font-mono font-medium text-emerald-600 dark:text-emerald-400' },
        fmtPct(r.percentOfPortfolio)
      ),
    },
    rawValues: {
      institution: r.institution,
      accountMasked: r.accountMasked,
      accountType: r.accountType,
      cashValue: r.cashValue,
      equitiesValue: r.equitiesValue,
      optionsValue: r.optionsValue,
      fixedIncomeValue: r.fixedIncomeValue,
      cryptoValue: r.cryptoValue,
      totalNetWorth: r.totalNetWorth,
      percentOfPortfolio: r.percentOfPortfolio,
    },
  }));

  const summaryCards: SummaryCardItem[] = [
    { label: 'Aggregated Net Worth', value: fmtCurrency(totalNW), colorClass: 'text-primary-mint' },
    { label: 'Active Accounts', value: `${data.length}` },
    {
      label: 'Largest Account',
      value:
        data.length > 0 ? `${data[0].accountMasked} (${fmtPct(data[0].percentOfPortfolio)})` : 'N/A',
      colorClass: 'text-blue-500',
    },
  ];

  return {
    title: 'Total Net Worth Breakdown',
    subtitle: 'Detailed multi-account balance reconciliation across all brokerages',
    infoDescription:
      'Calculated as the sum of all long positions, cash balances, and fixed income assets per account, minus short liabilities.',
    columns,
    rows,
    summaryCards,
  };
}

export function buildFreeCashDrillDown(
  positions: CanonicalPosition[],
  accounts: CanonicalAccount[]
): DrillDownConfig {
  const data = getFreeCashDrilldown(positions, accounts);
  const totalRaw = data.reduce((sum, r) => sum + r.rawCash, 0);
  const totalCsp = data.reduce((sum, r) => sum + r.cspReserve, 0);
  const totalNetFree = data.reduce((sum, r) => sum + r.netFreeCash, 0);

  const columns: DrillDownColumn[] = [
    { key: 'institution', label: 'Institution', align: 'left' },
    { key: 'accountMasked', label: 'Account #', align: 'left' },
    { key: 'accountType', label: 'Account Type', align: 'left' },
    { key: 'coreFund', label: 'Core / Sweep Fund', align: 'left' },
    { key: 'rawCash', label: 'Raw Cash Available', align: 'right' },
    { key: 'cspReserve', label: 'Locked CSP Collateral', align: 'right' },
    { key: 'netFreeCash', label: 'Global Net Free Cash', align: 'right' },
  ];

  const rows: DrillDownRow[] = data.map((r) => ({
    id: `${r.institution}_${r.accountId}`,
    institution: r.institution,
    cells: {
      institution: React.createElement(
        'span',
        { className: 'font-semibold text-slate-900 dark:text-white' },
        r.institution
      ),
      accountMasked: React.createElement(
        'span',
        {
          className:
            'font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        },
        r.accountMasked
      ),
      accountType: React.createElement(
        'span',
        {
          className:
            'text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        },
        r.accountType
      ),
      coreFund: React.createElement(
        'span',
        { className: 'font-mono text-xs text-slate-500 dark:text-slate-400' },
        r.coreFund
      ),
      rawCash: React.createElement('span', { className: 'font-mono' }, fmtCurrency(r.rawCash)),
      cspReserve: React.createElement(
        'span',
        { className: 'font-mono text-amber-600 dark:text-amber-500' },
        r.cspReserve > 0 ? `-${fmtCurrency(r.cspReserve)}` : '$0.00'
      ),
      netFreeCash: React.createElement(
        'span',
        { className: 'font-mono font-bold text-emerald-600 dark:text-emerald-400' },
        fmtCurrency(r.netFreeCash)
      ),
    },
    rawValues: {
      institution: r.institution,
      accountMasked: r.accountMasked,
      accountType: r.accountType,
      coreFund: r.coreFund,
      rawCash: r.rawCash,
      cspReserve: r.cspReserve,
      netFreeCash: r.netFreeCash,
    },
  }));

  const summaryCards: SummaryCardItem[] = [
    { label: 'Aggregated Raw Cash', value: fmtCurrency(totalRaw) },
    {
      label: 'Locked CSP Collateral',
      value: `-${fmtCurrency(totalCsp)}`,
      colorClass: 'text-amber-500',
    },
    {
      label: 'Global Net Free Cash',
      value: fmtCurrency(totalNetFree),
      colorClass: 'text-emerald-500',
    },
  ];

  return {
    title: 'Global Net Free Cash Breakdown',
    subtitle: 'Account-by-account liquid reserves and Cash-Secured Put allocations',
    infoDescription:
      'Net Free Cash represents liquid capital readily available to write new CSPs or deploy without triggering margin debit interest.',
    columns,
    rows,
    summaryCards,
  };
}

export function buildApyDrillDown(
  positions: CanonicalPosition[],
  accounts: CanonicalAccount[]
): DrillDownConfig {
  const data = getBlendedApyDrilldown(positions, accounts);
  const totalYieldValue = data.reduce((sum, r) => sum + r.marketValue, 0);
  const totalAnnualIncome = data.reduce((sum, r) => sum + r.annualIncome, 0);
  const portfolioBlendedApy = totalYieldValue > 0 ? (totalAnnualIncome / totalYieldValue) * 100 : 0;

  const columns: DrillDownColumn[] = [
    { key: 'institution', label: 'Institution', align: 'left' },
    { key: 'accountMasked', label: 'Account #', align: 'left' },
    { key: 'symbol', label: 'Asset / Symbol', align: 'left' },
    { key: 'category', label: 'Yield Category', align: 'left' },
    { key: 'marketValue', label: 'Market Value', align: 'right' },
    { key: 'apy', label: 'Stated APY%', align: 'right' },
    { key: 'annualIncome', label: 'Est. Annual Income', align: 'right' },
    { key: 'weightedContribution', label: 'Contrib. to Blended %', align: 'right' },
  ];

  const rows: DrillDownRow[] = data.map((r, idx) => ({
    id: `${r.institution}_${r.accountId}_${r.symbol}_${idx}`,
    institution: r.institution,
    cells: {
      institution: React.createElement(
        'span',
        { className: 'font-semibold text-slate-900 dark:text-white' },
        r.institution
      ),
      accountMasked: React.createElement(
        'span',
        {
          className:
            'font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        },
        r.accountMasked
      ),
      symbol: React.createElement('div', null, [
        React.createElement(
          'span',
          { key: 'sym', className: 'font-mono font-bold text-slate-900 dark:text-white' },
          r.symbol
        ),
        React.createElement(
          'span',
          {
            key: 'name',
            className: 'block text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px]',
          },
          r.name
        ),
      ]),
      category: React.createElement(
        'span',
        {
          className:
            'text-xs px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
        },
        r.category
      ),
      marketValue: React.createElement('span', { className: 'font-mono' }, fmtCurrency(r.marketValue)),
      apy: React.createElement(
        'span',
        { className: 'font-mono font-bold text-purple-600 dark:text-purple-400' },
        fmtPct(r.apy)
      ),
      annualIncome: React.createElement(
        'span',
        { className: 'font-mono font-medium text-emerald-600 dark:text-emerald-400' },
        fmtCurrency(r.annualIncome)
      ),
      weightedContribution: React.createElement(
        'span',
        { className: 'font-mono text-xs text-slate-600 dark:text-slate-300' },
        `+${fmtPct(r.weightedContribution)}`
      ),
    },
    rawValues: {
      institution: r.institution,
      accountMasked: r.accountMasked,
      symbol: r.symbol,
      category: r.category,
      marketValue: r.marketValue,
      apy: r.apy,
      annualIncome: r.annualIncome,
      weightedContribution: r.weightedContribution,
    },
  }));

  const bd = blendedApyBreakdown(positions);
  const summaryCards: SummaryCardItem[] = [
    { label: 'Yield-Bearing Assets', value: fmtCurrency(totalYieldValue) },
    {
      label: 'Est. Annual Income',
      value: fmtCurrency(totalAnnualIncome),
      colorClass: 'text-emerald-500',
    },
    {
      label: 'Yield-bearing assets APY',
      value: fmtPct(portfolioBlendedApy),
      colorClass: 'text-teal-500',
    },
    {
      label: 'Portfolio Blended APY',
      value: fmtPct(bd.apyPortfolio),
      colorClass: 'text-secondary-violet',
    },
  ];

  return {
    title: 'Yield-bearing Assets APY Breakdown',
    subtitle:
      'Weighted annual percentage yield across cash sweeps, CDs, Treasuries, and money markets (yield-bearing assets only)',
    infoDescription:
      'Income divided by the market value of yield-bearing assets only (APY > 0). Assets with no APY are excluded here; see "Portfolio Blended APY" for the figure across all owned assets.',
    columns,
    rows,
    summaryCards,
    charts: buildYieldContributionCharts,
  };
}

export function buildPortfolioApyDrillDown(
  positions: CanonicalPosition[],
  accounts: CanonicalAccount[]
): DrillDownConfig {
  const data = getPortfolioApyDrilldown(positions, accounts);
  const bd = blendedApyBreakdown(positions);

  const columns: DrillDownColumn[] = [
    { key: 'institution', label: 'Institution', align: 'left' },
    { key: 'accountMasked', label: 'Account #', align: 'left' },
    { key: 'symbol', label: 'Asset / Symbol', align: 'left' },
    { key: 'category', label: 'Asset Class', align: 'left' },
    { key: 'incomeStatus', label: 'Income Status', align: 'center' },
    { key: 'marketValue', label: 'Market Value', align: 'right' },
    { key: 'apy', label: 'Stated APY%', align: 'right' },
    { key: 'annualIncome', label: 'Est. Annual Income', align: 'right' },
    { key: 'weightedContribution', label: 'Contrib. to Portfolio APY', align: 'right' },
  ];

  const rows: DrillDownRow[] = data.map((r, idx) => ({
    id: `${r.institution}_${r.accountId}_${r.symbol}_${idx}`,
    institution: r.institution,
    cells: {
      institution: React.createElement(
        'span',
        { className: 'font-semibold text-slate-900 dark:text-white' },
        r.institution
      ),
      accountMasked: React.createElement(
        'span',
        {
          className:
            'font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        },
        r.accountMasked
      ),
      symbol: React.createElement('div', null, [
        React.createElement(
          'span',
          { key: 'sym', className: 'font-mono font-bold text-slate-900 dark:text-white' },
          r.symbol
        ),
        React.createElement(
          'span',
          {
            key: 'name',
            className: 'block text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px]',
          },
          r.name
        ),
      ]),
      category: React.createElement(
        'span',
        { className: 'text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
        r.category
      ),
      incomeStatus: React.createElement(
        'span',
        {
          className: `text-xs px-2 py-0.5 rounded-full font-semibold ${
            r.generatesIncome
              ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
          }`,
        },
        r.generatesIncome ? 'Income' : 'Non-income'
      ),
      marketValue: React.createElement('span', { className: 'font-mono' }, fmtCurrency(r.marketValue)),
      apy: React.createElement(
        'span',
        { className: 'font-mono font-bold text-purple-600 dark:text-purple-400' },
        fmtPct(r.apy)
      ),
      annualIncome: React.createElement(
        'span',
        { className: 'font-mono font-medium text-emerald-600 dark:text-emerald-400' },
        fmtCurrency(r.annualIncome)
      ),
      weightedContribution: React.createElement(
        'span',
        { className: 'font-mono text-xs text-slate-600 dark:text-slate-300' },
        `+${r.weightedContribution.toFixed(4)}%`
      ),
    },
    rawValues: {
      institution: r.institution,
      accountMasked: r.accountMasked,
      symbol: r.symbol,
      category: r.category,
      incomeStatus: r.generatesIncome ? 'Income' : 'Non-income',
      generatesIncome: r.generatesIncome ? 1 : 0,
      marketValue: r.marketValue,
      apy: r.apy,
      annualIncome: r.annualIncome,
      weightedContribution: r.weightedContribution,
    },
  }));

  const summaryCards: SummaryCardItem[] = [
    {
      label: 'Portfolio Blended APY',
      value: fmtPct(bd.apyPortfolio),
      colorClass: 'text-secondary-violet',
    },
    { label: 'Total Owned Assets', value: fmtCurrency(bd.totalValue) },
    {
      label: 'Income-generating',
      value: `${fmtCurrency(bd.yieldValue)} (${fmtPct(bd.yieldSharePct)})`,
      colorClass: 'text-teal-500',
    },
    {
      label: 'Non-income (0% APY)',
      value: `${fmtCurrency(bd.nonYieldValue)} (${fmtPct(100 - bd.yieldSharePct)})`,
      colorClass: 'text-slate-500',
    },
  ];

  return {
    title: 'Portfolio Blended APY Breakdown',
    subtitle: 'Why the portfolio-level APY is lower than the yield on income assets alone',
    infoDescription:
      'Estimated annual income divided by ALL owned assets (options excluded). Assets with no stated APY count at 0%, so they dilute the blended figure. Contributions in the table add up to the card value.',
    columns,
    rows,
    summaryCards,
    charts: buildPortfolioApyCharts,
    defaultView: 'pie',
    related: {
      label: 'View income-generating assets table (yield-bearing APY)',
      build: () => buildApyDrillDown(positions, accounts),
    },
  };
}

export function buildOptionCollateralDrillDown(
  positions: CanonicalPosition[],
  accounts: CanonicalAccount[]
): DrillDownConfig {
  const data = getOptionCollateralDrilldown(positions, accounts);
  const totalLocked = data.reduce((sum, r) => sum + r.collateralLocked, 0);
  const puts = data.filter((r) => r.right === 'PUT');
  const calls = data.filter((r) => r.right === 'CALL');

  const columns: DrillDownColumn[] = [
    { key: 'institution', label: 'Institution', align: 'left' },
    { key: 'accountMasked', label: 'Account #', align: 'left' },
    { key: 'symbol', label: 'Option Symbol', align: 'left' },
    { key: 'underlying', label: 'Underlying', align: 'left' },
    { key: 'right', label: 'Type', align: 'center' },
    { key: 'strike', label: 'Strike', align: 'right' },
    { key: 'contracts', label: 'Contracts', align: 'right' },
    { key: 'expiry', label: 'Expiration', align: 'center' },
    { key: 'collateralLocked', label: 'Locked Collateral', align: 'right' },
  ];

  const rows: DrillDownRow[] = data.map((r, idx) => ({
    id: `${r.institution}_${r.accountId}_${r.symbol}_${idx}`,
    institution: r.institution,
    cells: {
      institution: React.createElement(
        'span',
        { className: 'font-semibold text-slate-900 dark:text-white' },
        r.institution
      ),
      accountMasked: React.createElement(
        'span',
        {
          className:
            'font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        },
        r.accountMasked
      ),
      symbol: React.createElement('span', { className: 'font-mono text-xs' }, r.symbol),
      underlying: React.createElement(
        'span',
        { className: 'font-mono font-bold text-slate-900 dark:text-white' },
        r.underlying
      ),
      right: React.createElement(
        'span',
        {
          className: `text-xs px-2 py-0.5 rounded-full font-bold ${
            r.right === 'PUT'
              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
              : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
          }`,
        },
        r.right
      ),
      strike: React.createElement('span', { className: 'font-mono' }, `$${fmtNumber(r.strike)}`),
      contracts: React.createElement(
        'span',
        { className: 'font-mono font-semibold' },
        r.contracts
      ),
      expiry: React.createElement(
        'span',
        { className: 'text-xs text-slate-600 dark:text-slate-300' },
        r.expiry || 'N/A'
      ),
      collateralLocked: React.createElement(
        'span',
        { className: 'font-mono font-bold text-amber-600 dark:text-amber-500' },
        fmtCurrency(r.collateralLocked)
      ),
    },
    rawValues: {
      institution: r.institution,
      accountMasked: r.accountMasked,
      symbol: r.symbol,
      underlying: r.underlying,
      right: r.right,
      strike: r.strike,
      contracts: r.contracts,
      expiry: r.expiry || '',
      collateralLocked: r.collateralLocked,
    },
  }));

  const summaryCards: SummaryCardItem[] = [
    {
      label: 'Total Collateral Locked',
      value: fmtCurrency(totalLocked),
      colorClass: 'text-amber-500',
    },
    { label: 'Active Put Contracts', value: `${puts.length}` },
    { label: 'Active Call Contracts', value: `${calls.length}` },
  ];

  return {
    title: 'Option Collateral Breakdown',
    subtitle: 'Active Cash-Secured Puts and Covered Calls locking capital across accounts',
    infoDescription:
      'For short Put contracts (CSP), collateral locked = strike * contracts * 100. This cash cannot be withdrawn or used for other trades.',
    columns,
    rows,
    summaryCards,
  };
}

export function buildEquityDrillDown(
  positions: CanonicalPosition[],
  accounts: CanonicalAccount[],
  targetSymbol?: string
): DrillDownConfig {
  const data = getEquityDrilldown(positions, accounts, targetSymbol);
  const totalValue = data.reduce((sum, r) => sum + r.marketValue, 0);
  const totalShares = data.reduce((sum, r) => sum + r.quantity, 0);

  const title = targetSymbol
    ? `${targetSymbol.toUpperCase()} Multi-Account Breakdown`
    : 'Equities Portfolio Breakdown (Stocks & ETFs)';

  const subtitle = targetSymbol
    ? `Holdings of ${targetSymbol.toUpperCase()} across all institutions and accounts`
    : 'All equity holdings aggregated across institutions with account-level attribution';

  const columns: DrillDownColumn[] = [
    { key: 'institution', label: 'Institution', align: 'left' },
    { key: 'accountMasked', label: 'Account #', align: 'left' },
    { key: 'accountType', label: 'Type', align: 'left' },
    { key: 'symbol', label: 'Symbol', align: 'left' },
    { key: 'quantity', label: 'Shares', align: 'right' },
    { key: 'currentPrice', label: 'Price', align: 'right' },
    { key: 'marketValue', label: 'Market Value', align: 'right' },
    { key: 'percentOfSymbol', label: '% of Holding', align: 'right' },
    { key: 'isCovered', label: 'CC Status', align: 'center' },
  ];

  const rows: DrillDownRow[] = data.map((r, idx) => ({
    id: `${r.institution}_${r.accountId}_${r.symbol}_${idx}`,
    institution: r.institution,
    cells: {
      institution: React.createElement(
        'span',
        { className: 'font-semibold text-slate-900 dark:text-white' },
        r.institution
      ),
      accountMasked: React.createElement(
        'span',
        {
          className:
            'font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        },
        r.accountMasked
      ),
      accountType: React.createElement(
        'span',
        {
          className:
            'text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        },
        r.accountType
      ),
      symbol: React.createElement('div', null, [
        React.createElement(
          'span',
          { key: 'sym', className: 'font-mono font-bold text-slate-900 dark:text-white' },
          r.symbol
        ),
        React.createElement(
          'span',
          {
            key: 'name',
            className: 'block text-xs text-slate-500 dark:text-slate-400 truncate max-w-[130px]',
          },
          r.name
        ),
      ]),
      quantity: React.createElement('span', { className: 'font-mono' }, fmtNumber(r.quantity, 3)),
      currentPrice: React.createElement('span', { className: 'font-mono' }, fmtCurrency(r.currentPrice)),
      marketValue: React.createElement(
        'span',
        { className: 'font-mono font-bold text-slate-900 dark:text-white' },
        fmtCurrency(r.marketValue)
      ),
      percentOfSymbol: React.createElement(
        'span',
        { className: 'font-mono font-medium text-blue-600 dark:text-blue-400' },
        fmtPct(r.percentOfSymbol)
      ),
      isCovered: r.isCovered
        ? React.createElement(
            'span',
            {
              className:
                'text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium',
            },
            'Covered'
          )
        : r.isPartial
        ? React.createElement(
            'span',
            {
              className:
                'text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-medium',
            },
            `Partial (${fmtNumber(r.coveredShares || 0, 0)} cov / ${fmtNumber(r.availableShares || 0, 2)} free)`
          )
        : React.createElement(
            'span',
            {
              className:
                'text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium',
            },
            'Available'
          ),
    },
    rawValues: {
      institution: r.institution,
      accountMasked: r.accountMasked,
      accountType: r.accountType,
      symbol: r.symbol,
      quantity: r.quantity,
      currentPrice: r.currentPrice,
      marketValue: r.marketValue,
      percentOfSymbol: r.percentOfSymbol,
      isCovered: r.isCovered ? 'Covered' : r.isPartial ? 'Partial' : 'Available',
    },
  }));

  const uniqueHoldingAccounts = new Set(data.map((r) => `${r.institution}_${r.accountId}`)).size;

  const summaryCards: SummaryCardItem[] = [
    {
      label: 'Aggregated Equity Value',
      value: fmtCurrency(totalValue),
      colorClass: 'text-primary-mint',
    },
    { label: 'Total Shares', value: fmtNumber(totalShares, 2) },
    { label: 'Holding Accounts', value: `${uniqueHoldingAccounts}` },
  ];

  return {
    title,
    subtitle,
    infoDescription:
      'Shows how equities and ETFs are distributed across accounts, including whether shares are locked by active Covered Calls.',
    columns,
    rows,
    summaryCards,
  };
}

export function buildAssetAllocationDrillDown(
  positions: CanonicalPosition[],
  accounts: CanonicalAccount[],
  targetClass?: string
): DrillDownConfig {
  const data = getAssetAllocationDrilldown(positions, accounts, targetClass);
  const totalValue = data.reduce((sum, r) => sum + r.marketValue, 0);

  const columns: DrillDownColumn[] = [
    { key: 'assetClass', label: 'Asset Class', align: 'left' },
    { key: 'institution', label: 'Institution', align: 'left' },
    { key: 'accountMasked', label: 'Account #', align: 'left' },
    { key: 'symbol', label: 'Symbol / Holding', align: 'left' },
    { key: 'quantity', label: 'Quantity', align: 'right' },
    { key: 'marketValue', label: 'Market Value', align: 'right' },
    { key: 'percentOfClass', label: '% of Asset Class', align: 'right' },
  ];

  const rows: DrillDownRow[] = data.map((r, idx) => ({
    id: `${r.assetClass}_${r.institution}_${r.accountMasked}_${r.symbol}_${idx}`,
    institution: r.institution,
    cells: {
      assetClass: React.createElement(
        'span',
        {
          className:
            'text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        },
        r.assetClass
      ),
      institution: React.createElement(
        'span',
        { className: 'font-semibold text-slate-900 dark:text-white' },
        r.institution
      ),
      accountMasked: React.createElement(
        'span',
        {
          className:
            'font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        },
        r.accountMasked
      ),
      symbol: React.createElement('div', null, [
        React.createElement(
          'span',
          { key: 'sym', className: 'font-mono font-bold text-slate-900 dark:text-white' },
          r.symbol
        ),
        React.createElement(
          'span',
          {
            key: 'name',
            className: 'block text-xs text-slate-500 dark:text-slate-400 truncate max-w-[130px]',
          },
          r.name
        ),
      ]),
      quantity: React.createElement(
        'span',
        { className: 'font-mono' },
        r.quantity > 0 ? fmtNumber(r.quantity, 2) : '-'
      ),
      marketValue: React.createElement(
        'span',
        { className: 'font-mono font-bold text-slate-900 dark:text-white' },
        fmtCurrency(r.marketValue)
      ),
      percentOfClass: React.createElement(
        'span',
        { className: 'font-mono font-medium text-emerald-600 dark:text-emerald-400' },
        fmtPct(r.percentOfClass)
      ),
    },
    rawValues: {
      assetClass: r.assetClass,
      institution: r.institution,
      accountMasked: r.accountMasked,
      symbol: r.symbol,
      quantity: r.quantity,
      marketValue: r.marketValue,
      percentOfClass: r.percentOfClass,
    },
  }));

  const summaryCards: SummaryCardItem[] = [
    {
      label: 'Aggregated Asset Value',
      value: fmtCurrency(totalValue),
      colorClass: 'text-primary-mint',
    },
    { label: 'Allocated Holdings', value: `${data.length}` },
  ];

  return {
    title: targetClass ? `${targetClass} Allocation Breakdown` : 'Asset Allocation Breakdown',
    subtitle: 'Granular breakdown of positions by asset class across all brokerages',
    infoDescription:
      'Provides complete transparency into how asset classes are distributed across individual accounts and institutions.',
    columns,
    rows,
    summaryCards,
  };
}

/**
 * Detailed Drill-down modal for Digital Currency / Crypto Holdings.
 */
export function buildCryptoDrillDown(
  positions: CanonicalPosition[],
  accounts: CanonicalAccount[],
  filterSymbol?: string
): DrillDownConfig {
  const data = getCryptoDrilldown(positions, accounts, filterSymbol);
  const totalCryptoValue = data.reduce((sum, r) => sum + r.marketValue, 0);
  const totalCostBasis = data.reduce((sum, r) => sum + r.costBasis, 0);
  const totalPnl = totalCryptoValue - totalCostBasis;
  const totalPnlPct = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0;
  const uniqueCoins = Array.from(new Set(data.map((r) => r.symbol)));

  const columns: DrillDownColumn[] = [
    { key: 'symbol', label: 'Symbol / Asset', align: 'left' },
    { key: 'institution', label: 'Institution', align: 'left' },
    { key: 'accountMasked', label: 'Account #', align: 'left' },
    { key: 'quantity', label: 'Holding Qty', align: 'right' },
    { key: 'currentPrice', label: 'Current Price', align: 'right' },
    { key: 'marketValue', label: 'Market Value', align: 'right' },
    { key: 'costBasis', label: 'Cost Basis', align: 'right' },
    { key: 'unrealizedPnl', label: 'Unrealized P&L', align: 'right' },
    { key: 'percentOfCrypto', label: '% of Crypto', align: 'right' },
    { key: 'percentOfPortfolio', label: '% of Portfolio', align: 'right' },
  ];

  const rows: DrillDownRow[] = data.map((r, idx) => ({
    id: `crypto_${r.institution}_${r.accountMasked}_${r.symbol}_${idx}`,
    institution: r.institution,
    cells: {
      symbol: React.createElement('div', { className: 'flex flex-col' }, [
        React.createElement(
          'span',
          { key: 'sym', className: 'font-mono font-bold text-slate-900 dark:text-white' },
          r.symbol
        ),
        React.createElement(
          'span',
          {
            key: 'name',
            className: 'block text-xs text-slate-500 dark:text-slate-400 truncate max-w-[130px]',
          },
          r.name
        ),
      ]),
      institution: React.createElement(
        'span',
        { className: 'font-semibold text-slate-800 dark:text-slate-200' },
        r.institution
      ),
      accountMasked: React.createElement(
        'span',
        {
          className:
            'font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        },
        r.accountMasked
      ),
      quantity: React.createElement(
        'span',
        { className: 'font-mono text-xs' },
        r.quantity < 1 ? r.quantity.toFixed(8).replace(/\.?0+$/, '') : fmtNumber(r.quantity, 4)
      ),
      currentPrice: React.createElement(
        'span',
        { className: 'font-mono' },
        fmtCurrency(r.currentPrice)
      ),
      marketValue: React.createElement(
        'span',
        { className: 'font-mono font-bold text-slate-900 dark:text-white' },
        fmtCurrency(r.marketValue)
      ),
      costBasis: React.createElement(
        'span',
        { className: 'font-mono text-slate-600 dark:text-slate-400' },
        r.costBasis > 0 ? fmtCurrency(r.costBasis) : 'N/A'
      ),
      unrealizedPnl: React.createElement(
        'span',
        {
          className: `font-mono font-bold ${
            r.unrealizedPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`,
        },
        `${r.unrealizedPnl >= 0 ? '+' : ''}${fmtCurrency(r.unrealizedPnl)} (${r.unrealizedPnl >= 0 ? '+' : ''}${fmtPct(r.unrealizedPnlPct)})`
      ),
      percentOfCrypto: React.createElement(
        'span',
        { className: 'font-mono font-medium text-amber-600 dark:text-amber-400' },
        fmtPct(r.percentOfCrypto)
      ),
      percentOfPortfolio: React.createElement(
        'span',
        { className: 'font-mono text-slate-600 dark:text-slate-300' },
        fmtPct(r.percentOfPortfolio)
      ),
    },
    rawValues: {
      symbol: r.symbol,
      name: r.name,
      institution: r.institution,
      accountMasked: r.accountMasked,
      quantity: r.quantity,
      currentPrice: r.currentPrice,
      marketValue: r.marketValue,
      costBasis: r.costBasis,
      unrealizedPnl: r.unrealizedPnl,
      unrealizedPnlPct: r.unrealizedPnlPct,
      percentOfCrypto: r.percentOfCrypto,
      percentOfPortfolio: r.percentOfPortfolio,
    },
  }));

  const summaryCards: SummaryCardItem[] = [
    {
      label: 'Total Crypto Value',
      value: fmtCurrency(totalCryptoValue),
      colorClass: 'text-amber-500',
    },
    {
      label: 'Total Cost Basis',
      value: totalCostBasis > 0 ? fmtCurrency(totalCostBasis) : 'N/A',
    },
    {
      label: 'Unrealized Gain / Loss',
      value: `${totalPnl >= 0 ? '+' : ''}${fmtCurrency(totalPnl)} (${totalPnl >= 0 ? '+' : ''}${fmtPct(totalPnlPct)})`,
      colorClass: totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500',
    },
    {
      label: 'Unique Coins',
      value: `${uniqueCoins.length} (${data.length} accounts)`,
    },
  ];

  return {
    title: filterSymbol ? `${filterSymbol} Holding Drill-down` : 'Digital Currency & Crypto Holdings',
    subtitle: 'Direct crypto and digital currency positions held across brokerages and digital vaults',
    infoDescription:
      'Direct crypto assets are tracked with native fractional token quantity, cost basis, unrealized gain/loss, and portfolio weighting.',
    columns,
    rows,
    summaryCards,
    related: {
      label: 'View Asset Allocation',
      build: () => buildAssetAllocationDrillDown(positions, accounts, 'Crypto'),
    },
  };
}

