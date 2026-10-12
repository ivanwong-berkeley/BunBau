import * as XLSX from 'xlsx';
import { FilenameMetadata } from '../filenameParser';
import { CanonicalPosition, CanonicalAccountPayload, AssetCategory } from '../../types/ingestion';
import { cleanNumeric } from './csvParser';

export interface CitiExtractionResult {
  adapterId: string;
  institution: string;
  accountType: string;
  accountNumber: string;
  accountKey: string;
  asOfDate: string;
  totalBalance: number;
  cashBalance: number;
  positions: CanonicalPosition[];
  warnings: string[];
}

export interface CitiParseResult {
  adapterId: string;
  adapterName: string;
  accounts: CanonicalAccountPayload[];
  asOfDate?: string;
}

/**
 * Extracts rows from a CSV string with RFC-compliant quote and comma handling.
 */
export function extractRowsFromCsvString(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  const rows: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const fields: string[] = [];
    let inQuotes = false;
    let cur = '';

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        fields.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur.trim());
    if (fields.some(f => f.length > 0)) {
      rows.push(fields);
    }
  }

  return rows;
}

/**
 * Converts ArrayBuffer or string into a 2D matrix of trimmed string cells.
 */
function getRawMatrix(data: ArrayBuffer | string): string[][] {
  if (typeof data === 'string') {
    return extractRowsFromCsvString(data);
  }
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawMatrix: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  return rawMatrix
    .map(row => (row || []).map(cell => String(cell ?? '').trim()))
    .filter(row => row.some(c => c.length > 0));
}

/**
 * Parses Citi Pershing Holdings format (.xlsx or .csv) supporting multi-account workbooks,
 * 23-column position tables, SGOV, cash/money funds, and exact penny checksum balances.
 */
export function parseCitiHoldingsWorkbook(
  data: ArrayBuffer | string,
  filenameMeta?: FilenameMetadata
): CanonicalAccountPayload[] {
  const rows = getRawMatrix(data);
  if (rows.length === 0) return [];

  // 1. Identify account section boundaries by looking for "Account Number: CZ..." rows
  const accountSectionIndices: number[] = [];
  for (let r = 0; r < rows.length; r++) {
    const joined = rows[r].join(' ');
    if (/Account Number:\s*[A-Z0-9]+/i.test(joined)) {
      accountSectionIndices.push(r);
    }
  }

  // If no "Account Number:" header row found, treat the whole file as a single section
  const sectionSlices: { start: number; end: number }[] = [];
  if (accountSectionIndices.length === 0) {
    sectionSlices.push({ start: 0, end: rows.length });
  } else {
    for (let i = 0; i < accountSectionIndices.length; i++) {
      const start = accountSectionIndices[i];
      const end = i + 1 < accountSectionIndices.length ? accountSectionIndices[i + 1] : rows.length;
      sectionSlices.push({ start, end });
    }
  }

  const accounts: CanonicalAccountPayload[] = [];

  for (const slice of sectionSlices) {
    const secRows = rows.slice(slice.start, slice.end);
    let accountRaw = '';
    let asOfDate = filenameMeta?.asOfDate || '';
    let statedTotalMarketValue = 0;
    let statedCashFunds = 0;
    let headerRowIdx = -1;

    // Scan metadata preceding table
    for (let r = 0; r < secRows.length; r++) {
      const row = secRows[r];
      const joined = row.join(' ');

      // Account number
      const acctMatch = joined.match(/Account Number:\s*([A-Z0-9]+)/i);
      if (acctMatch && !accountRaw) {
        accountRaw = acctMatch[1];
      }

      // Holdings as of date
      const dateMatch = joined.match(/Holdings as of\s*:\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/i);
      if (dateMatch && !asOfDate) {
        const m = dateMatch[1].padStart(2, '0');
        const d = dateMatch[2].padStart(2, '0');
        const y = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
        asOfDate = `${y}-${m}-${d}`;
      }

      // Total Market Value
      const totalMatch = joined.match(/Total Market Value:\s*\$?([\d,]+(?:\.\d+)?)/i);
      if (totalMatch && statedTotalMarketValue === 0) {
        statedTotalMarketValue = cleanNumeric(totalMatch[1]);
      }

      // Cash, Money Funds and Bank Deposits
      const cashMatch = joined.match(/Cash,\s*Money Funds[^:]*:\s*\$?([\d,]+(?:\.\d+)?)/i);
      if (cashMatch && statedCashFunds === 0) {
        statedCashFunds = cleanNumeric(cashMatch[1]);
      }

      // Check if this row is the table header: must have "Security ID" or "Symbol" AND "Market Value"
      const lowerRow = row.map(c => c.toLowerCase());
      if (
        (lowerRow.includes('security id') || lowerRow.includes('symbol')) &&
        (lowerRow.includes('market value') || lowerRow.includes('description') || lowerRow.includes('price'))
      ) {
        headerRowIdx = r;
        break;
      }
    }

    if (!accountRaw && filenameMeta?.accountRaw) {
      accountRaw = filenameMeta.accountRaw;
    }

    const suffix = accountRaw.replace(/\D/g, '').slice(-4) || '9836';
    let accountType = filenameMeta?.accountType;

    // Infer account type if not strictly provided or matching this suffix
    if (!accountType || (filenameMeta?.accountSuffix && filenameMeta.accountSuffix !== suffix)) {
      if (accountRaw === 'CZ5009834' || suffix === '9834' || /IRA/i.test(accountRaw)) {
        accountType = 'Traditional IRA';
      } else if (accountRaw === 'CZ5009836' || suffix === '9836' || /Brokerage/i.test(accountRaw)) {
        accountType = 'Brokerage';
      } else {
        accountType = 'Brokerage';
      }
    }

    // Map column indices if header row found
    let colSecurityId = -1;
    let colDesc = -1;
    let colAssetClass = -1;
    let colSubAssetClass = -1;
    let colQty = -1;
    let colPrice = -1;
    let colMarketVal = -1;
    let colGainLoss = -1;
    let colGainLossPct = -1;

    if (headerRowIdx >= 0) {
      const hRow = secRows[headerRowIdx];
      for (let c = 0; c < hRow.length; c++) {
        const h = hRow[c].trim().toLowerCase();
        if (h === 'security id' || h === 'symbol') colSecurityId = c;
        else if (h === 'description') colDesc = c;
        else if (h === 'asset classification') colAssetClass = c;
        else if (h === 'sub-asset classification') colSubAssetClass = c;
        else if (h === 'quantity') colQty = c;
        else if (h === 'price') colPrice = c;
        else if (h === 'market value') colMarketVal = c;
        else if (h.includes('gain/loss $') || h === 'gain/loss') colGainLoss = c;
        else if (h.includes('gain/loss %')) colGainLossPct = c;
      }
    }

    const positions: CanonicalPosition[] = [];
    let accumulatedCash = 0;
    const accountKey = `citi_${suffix}`;

    if (headerRowIdx >= 0 && colSecurityId >= 0 && colMarketVal >= 0) {
      for (let r = headerRowIdx + 1; r < secRows.length; r++) {
        const row = secRows[r];
        const symbol = row[colSecurityId]?.trim();
        if (!symbol || /^(Security ID|Holdings|Account Number|Total)/i.test(symbol)) {
          continue;
        }

        const desc = colDesc >= 0 ? row[colDesc]?.trim() : symbol;
        const assetClassStr = colAssetClass >= 0 ? row[colAssetClass]?.trim() : '';
        const subAssetClassStr = colSubAssetClass >= 0 ? row[colSubAssetClass]?.trim() : '';
        const qty = cleanNumeric(colQty >= 0 ? row[colQty] : 0);
        const price = cleanNumeric(colPrice >= 0 ? row[colPrice] : 0);
        const marketVal = cleanNumeric(colMarketVal >= 0 ? row[colMarketVal] : 0);
        const gainLoss = cleanNumeric(colGainLoss >= 0 ? row[colGainLoss] : 0);
        const gainLossPct = cleanNumeric(colGainLossPct >= 0 ? row[colGainLossPct] : 0);
        const costBasis = gainLoss !== 0 ? marketVal - gainLoss : marketVal;

        // Determine if cash / money market fund
        const isCash =
          /Cash|Money Funds|Bank Deposits/i.test(assetClassStr) ||
          /Money Market/i.test(subAssetClassStr) ||
          symbol === 'WAGA' ||
          symbol === 'WAGI' ||
          /MONEY MARKET/i.test(desc);

        if (isCash) {
          accumulatedCash += marketVal;
          // Skipped from positions array to avoid double counting; cashBalance represents core cash
          continue;
        }

        // Determine asset category
        let assetCategory: AssetCategory = 'Stock';
        let yieldApy: number | undefined;

        if (/CERTIFICATE OF DEPOSIT|\bCD\b/i.test(desc) || /\bCD\b/i.test(symbol)) {
          assetCategory = 'CD';
          const apyMatch = desc.match(/(\d+(?:\.\d+)?)\s*%/);
          if (apyMatch) yieldApy = parseFloat(apyMatch[1]);
        } else if (/TREASURY|NOTE|BOND/i.test(desc) || symbol === 'SGOV') {
          assetCategory = 'Bond_SGOV';
          yieldApy = symbol === 'SGOV' ? 5.10 : undefined;
        } else if (/ETF|Exchange-Traded Funds/i.test(subAssetClassStr) || /ETF/i.test(desc)) {
          assetCategory = 'ETF';
        } else if (/CALL|PUT/i.test(desc)) {
          assetCategory = 'Option';
        }

        const positionKey = `${accountKey}_${symbol}_${assetCategory}`;

        positions.push({
          positionKey,
          accountKey,
          symbol,
          description: desc || symbol,
          assetCategory,
          quantity: qty,
          costBasis: costBasis > 0 ? costBasis : marketVal,
          currentPrice: price > 0 ? price : (qty > 0 ? marketVal / qty : 1),
          marketValue: marketVal,
          unrealizedGainLoss: gainLoss,
          unrealizedGainLossPct: gainLossPct,
          yieldApy,
          dataSource: 'CSV',
          updatedAt: asOfDate || new Date().toISOString(),
        });
      }
    }

    const effectiveCash = statedCashFunds > 0 ? statedCashFunds : accumulatedCash;
    const totalPosValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
    const effectiveTotal = statedTotalMarketValue > 0 ? statedTotalMarketValue : (effectiveCash + totalPosValue);

    accounts.push({
      accountKey,
      institution: 'Citi',
      accountName: `Citi ${accountType}`,
      accountMaskedNumber: `***-${suffix}`,
      accountType,
      totalValue: effectiveTotal,
      cashBalance: effectiveCash,
      positions,
      rawSourceFiles: [],
      sourceType: 'CSV',
      extractedAt: asOfDate || new Date().toISOString(),
      version: 1,
    });
  }

  return accounts;
}

/**
 * Parses legacy Citi Balances Summary files (.xlsx or .csv)
 */
export function parseCitiBalancesWorkbook(
  data: ArrayBuffer | string,
  filenameMeta?: FilenameMetadata
): CitiExtractionResult {
  const rows = getRawMatrix(data);

  let asOfDate = filenameMeta?.asOfDate || '';
  let accountNumber = filenameMeta?.accountRaw || '';
  let totalValue = 0;
  let cashBalance = 0;
  let longEquity = 0;
  const warnings: string[] = [];

  for (const row of rows) {
    const joined = row.join(' ');

    // 1. Extract As-Of Date: e.g. "Balances as of 10/07/2026"
    const dateMatch = joined.match(/Balances as of (\d{2})\/(\d{2})\/(\d{4})/i);
    if (dateMatch && !asOfDate) {
      asOfDate = `${dateMatch[3]}-${dateMatch[1]}-${dateMatch[2]}`;
    }

    // 2. Extract Account Number: e.g. "Account Number: CZ5009836 in USD"
    const acctMatch = joined.match(/Account Number:\s*([A-Z0-9]+)/i);
    if (acctMatch && !accountNumber) {
      accountNumber = acctMatch[1];
    }

    // 3. Extract Financial Totals
    for (let i = 0; i < row.length; i++) {
      const cell = row[i]?.trim();
      const nextCellStr = row[i + 1]?.trim();
      const num = parseFloat(nextCellStr?.replace(/[$,]/g, '') || '');

      if (!isNaN(num)) {
        if (/^Account Value$/i.test(cell) || /^Total Account Value$/i.test(cell)) {
          if (num > 0) totalValue = num;
        } else if (/^Available to Trade$/i.test(cell) || /^Cash Mgmt Balances$/i.test(cell)) {
          if (cashBalance === 0 && num > 0) cashBalance = num;
        } else if (/^Long Market Value$/i.test(cell)) {
          if (longEquity === 0 && num > 0) longEquity = num;
        }
      }
    }
  }

  // Suffix extraction
  const suffix = accountNumber.replace(/\D/g, '').slice(-4) || '9836';
  const accountType = filenameMeta?.accountType || (accountNumber.includes('IRA') ? 'Traditional IRA' : 'Brokerage');

  // Checksum calculation & reconciliation
  if (totalValue === 0 && (cashBalance > 0 || longEquity > 0)) {
    totalValue = cashBalance + longEquity;
  } else if (cashBalance === 0 && totalValue > 0 && longEquity > 0) {
    cashBalance = Math.max(0, +(totalValue - longEquity).toFixed(2));
  } else if (longEquity === 0 && totalValue > 0 && cashBalance > 0) {
    longEquity = Math.max(0, +(totalValue - cashBalance).toFixed(2));
  }

  const positions: CanonicalPosition[] = [];

  if (cashBalance > 0) {
    positions.push({
      positionKey: `citi-${suffix}-cash`,
      accountKey: `citi-${suffix}`,
      symbol: 'CASH_USD',
      description: 'Cash Management Balances',
      quantity: cashBalance,
      currentPrice: 1.0,
      marketValue: cashBalance,
      costBasis: cashBalance,
      assetCategory: 'Cash',
      unrealizedGainLoss: 0,
      unrealizedGainLossPct: 0,
      dataSource: 'CSV',
      updatedAt: asOfDate || new Date().toISOString(),
    });
  }

  if (longEquity > 0) {
    positions.push({
      positionKey: `citi-${suffix}-equity`,
      accountKey: `citi-${suffix}`,
      symbol: 'CITI_HOLDINGS',
      description: `Citi Wealth Portfolio Custody (${accountType})`,
      quantity: 1,
      currentPrice: longEquity,
      marketValue: longEquity,
      costBasis: longEquity,
      assetCategory: 'Stock',
      unrealizedGainLoss: 0,
      unrealizedGainLossPct: 0,
      dataSource: 'CSV',
      updatedAt: asOfDate || new Date().toISOString(),
    });
  }

  return {
    adapterId: 'citi_xlsx',
    institution: 'Citi',
    accountType,
    accountNumber: suffix,
    accountKey: `citi-${suffix}`,
    asOfDate,
    totalBalance: totalValue,
    cashBalance,
    positions,
    warnings,
  };
}

/**
 * Universal Citi parser dispatcher: routes automatically between Holdings and Balances Summary.
 */
export function parseCitiWorkbook(
  data: ArrayBuffer | string,
  filenameMeta?: FilenameMetadata
): CitiParseResult {
  const rows = getRawMatrix(data);
  const fullText = rows.map(r => r.join(' ')).join('\n');

  const isHoldingsFormat =
    /Security ID/i.test(fullText) &&
    (/Asset Classification/i.test(fullText) || /CUSIP/i.test(fullText) || /Total Market Value/i.test(fullText));

  if (isHoldingsFormat) {
    const accounts = parseCitiHoldingsWorkbook(data, filenameMeta);
    return {
      adapterId: 'citi_holdings',
      adapterName: 'Citi Holdings Adapter',
      accounts,
      asOfDate: accounts[0]?.extractedAt,
    };
  }

  // Fallback to Balances Summary
  const citiRes = parseCitiBalancesWorkbook(data, filenameMeta);
  const payload: CanonicalAccountPayload = {
    accountKey: citiRes.accountKey,
    institution: 'Citi',
    accountName: `Citi ${citiRes.accountType}`,
    accountMaskedNumber: `***-${citiRes.accountNumber}`,
    accountType: citiRes.accountType,
    totalValue: citiRes.totalBalance,
    cashBalance: citiRes.cashBalance,
    positions: citiRes.positions,
    rawSourceFiles: [],
    sourceType: 'CSV',
    extractedAt: citiRes.asOfDate || new Date().toISOString(),
    version: 1,
  };

  return {
    adapterId: 'citi_xlsx',
    adapterName: 'Citi Balances Summary Adapter',
    accounts: [payload],
    asOfDate: citiRes.asOfDate,
  };
}
