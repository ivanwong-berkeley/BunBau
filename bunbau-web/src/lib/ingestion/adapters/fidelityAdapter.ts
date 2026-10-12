/**
 * Deterministic Fidelity CSV Export Adapter
 * Location: src/lib/ingestion/adapters/fidelityAdapter.ts
 */

import { parseCSV, cleanNumeric } from './csvParser';
import { extractAccountSuffix } from '../../portfolio/accountId';
import type {
  CanonicalAccountPayload,
  CanonicalPosition,
  CanonicalOptionDetails,
  AssetCategory,
} from '../../types/ingestion';

export interface FidelityAdapterParseResult {
  accounts: CanonicalAccountPayload[];
  extractedTimestamp?: string;
  sourceType: 'CSV';
}

/**
 * Regex for Fidelity OCC option symbols with optional leading space/hyphen:
 * e.g. " -AAPL261023P310", "-MSFT261023P475", "-SLV261016C68"
 */
const FIDELITY_OCC_REGEX = /^\s*-?\s*([A-Z]+)(\d{2})(\d{2})(\d{2})([CP])(\d+(?:\.\d+)?)$/;

import type { FilenameMetadata } from '../filenameParser';

export class FidelityCSVAdapter {
  id = 'fidelity_csv';
  name = 'Fidelity CSV Adapter';

  canHandle(headers: string[], firstRows: string[][], rawText: string): boolean {
    const joinedHeaders = headers.map((h) => h.toLowerCase()).join(',');
    const hasFidelityHeaders =
      joinedHeaders.includes('account number') &&
      joinedHeaders.includes('symbol') &&
      joinedHeaders.includes('current value');

    const hasFidelityIndicators =
      rawText.includes('HELD IN FCASH') ||
      rawText.includes('SPAXX') ||
      rawText.includes('Fidelity Brokerage Services') ||
      rawText.includes('Date downloaded');

    return hasFidelityHeaders || hasFidelityIndicators;
  }

  parse(rawText: string, userId: string = 'demo-user', filenameMeta?: FilenameMetadata): FidelityAdapterParseResult {
    const { headers, rows } = parseCSV(rawText);

    if (headers.length === 0 || rows.length === 0) {
      return { accounts: [], sourceType: 'CSV' };
    }

    const colIndex = {
      accountNumber: headers.findIndex((h) => /account\s*number/i.test(h)),
      accountName: headers.findIndex((h) => /account\s*name/i.test(h)),
      symbol: headers.findIndex((h) => /^symbol$/i.test(h)),
      description: headers.findIndex((h) => /^description$/i.test(h)),
      quantity: headers.findIndex((h) => /^quantity$/i.test(h)),
      lastPrice: headers.findIndex((h) => /last\s*price$/i.test(h)),
      currentValue: headers.findIndex((h) => /current\s*value$/i.test(h)),
      costBasis: headers.findIndex((h) => /cost\s*basis\s*total/i.test(h)),
      type: headers.findIndex((h) => /^type$/i.test(h)),
    };

    let extractedTimestamp = new Date().toISOString();
    let accountRawNumber = 'Fidelity-Account';
    let accountName = 'Fidelity Brokerage';
    let totalCashBalance = 0;
    const rawPositions: CanonicalPosition[] = [];

    // First scan for metadata / date downloaded
    for (const row of rows) {
      const lineText = row.join(' ');
      const dateMatch = lineText.match(/Date downloaded\s+([^,]+)/i);
      if (dateMatch) {
        extractedTimestamp = dateMatch[1].trim();
      }
    }

    // Process data rows
    for (const row of rows) {
      // Skip empty or legal disclaimer rows
      const firstCell = (row[0] || '').trim();
      const secondCell = (row[1] || '').trim();
      const symbolCell = (row[colIndex.symbol >= 0 ? colIndex.symbol : 2] || '').trim();
      const descCell = (row[colIndex.description >= 0 ? colIndex.description : 3] || '').trim();
      const rowText = row.join(' ');

      const isDisclaimer =
        /The data and information|Brokerage services are provided|Neither Fidelity|Fidelity Digital Assets|national trust bank|Date downloaded/i.test(rowText);

      if (isDisclaimer || (firstCell.length === 0 && symbolCell.length === 0)) {
        continue;
      }

      if (colIndex.accountNumber >= 0 && row[colIndex.accountNumber]) {
        const raw = row[colIndex.accountNumber].trim();
        if (/^[\w-]{3,20}$/.test(raw) && !/bank|trust|assets/i.test(raw)) {
          accountRawNumber = raw;
        }
      }
      if (colIndex.accountName >= 0 && row[colIndex.accountName]) {
        const rawName = row[colIndex.accountName].trim();
        if (rawName && !/bank|trust|neither/i.test(rawName)) {
          accountName = rawName;
        }
      }

      // 1. Check for Cash / Core Money Market rows
      const isCoreCash =
        symbolCell.includes('FCASH') ||
        symbolCell.includes('SPAXX') ||
        symbolCell.includes('FDRXX') ||
        symbolCell.includes('USD***') ||
        descCell.includes('HELD IN FCASH') ||
        descCell.includes('HELD IN SPAXX') ||
        descCell.includes('HELD IN MONEY MARKET') ||
        descCell.includes('US DOLLARS') ||
        symbolCell.toLowerCase().includes('pending activity') ||
        descCell.toLowerCase().includes('pending activity');

      if (isCoreCash) {
        const cashVal = cleanNumeric(row[colIndex.currentValue >= 0 ? colIndex.currentValue : 7]);
        totalCashBalance += cashVal;
        continue;
      }

      // If symbol is blank and description is blank, skip
      if (!symbolCell && !descCell) {
        continue;
      }

      // 2. Check for Option OCC row
      const occMatch = symbolCell.match(FIDELITY_OCC_REGEX);
      const isOptionDesc = /OCT|NOV|DEC|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP/i.test(descCell) &&
        /(CALL|PUT)/i.test(descCell);

      if (occMatch || isOptionDesc) {
        let underlying = '';
        let optType: 'CALL' | 'PUT' = 'PUT';
        let strike = 0;
        let expirationDate = '';

        if (occMatch) {
          underlying = occMatch[1];
          const yy = occMatch[2];
          const mm = occMatch[3];
          const dd = occMatch[4];
          const cp = occMatch[5];
          strike = parseFloat(occMatch[6]);
          optType = cp === 'P' ? 'PUT' : 'CALL';
          expirationDate = `20${yy}-${mm}-${dd}`;
        } else {
          // Parse from description: e.g. "AAPL OCT 23 2026 $310 PUT"
          const parts = descCell.split(/\s+/);
          underlying = parts[0] || symbolCell.replace(/[^A-Z]/g, '');
          optType = /PUT/i.test(descCell) ? 'PUT' : 'CALL';
          const strikeMatch = descCell.match(/\$(\d+(?:\.\d+)?)/);
          if (strikeMatch) {
            strike = parseFloat(strikeMatch[1]);
          }
        }

        const rawQty = cleanNumeric(row[colIndex.quantity >= 0 ? colIndex.quantity : 4]);
        const contractsCount = Math.abs(rawQty) || 1;
        const currentVal = cleanNumeric(row[colIndex.currentValue >= 0 ? colIndex.currentValue : 7]);
        const costBasis = cleanNumeric(row[colIndex.costBasis >= 0 ? colIndex.costBasis : 13]);
        const lastPrice = cleanNumeric(row[colIndex.lastPrice >= 0 ? colIndex.lastPrice : 5]);

        const optionDetails: CanonicalOptionDetails = {
          underlying,
          type: optType,
          strike,
          expirationDate,
          isCollateralizedCsp: optType === 'PUT',
          contractsCount,
          premium: Math.abs(lastPrice),
        };

        // Calculate annualized option yield if strike and expiry are valid
        let annualizedYield: number | undefined;
        if (strike > 0 && expirationDate) {
          const dte = Math.max(1, Math.round((new Date(expirationDate).getTime() - Date.now()) / (1000 * 3600 * 24)));
          const collateral = optType === 'PUT' ? strike * 100 : currentVal > 0 ? currentVal : strike * 100;
          const prem = Math.abs(costBasis) || Math.abs(currentVal);
          if (collateral > 0 && prem > 0) {
            annualizedYield = Number(((prem / collateral) * (365 / dte) * 100).toFixed(2));
          }
        }
        if (annualizedYield && optionDetails) {
          optionDetails.annualizedYield = annualizedYield;
        }

        const maskedAcc = getMaskedSuffix(accountRawNumber);
        const accountKey = `fidelity_${maskedAcc}`;
        const positionKey = `${accountKey}_OPT_${underlying}_${expirationDate}_${optType}_${strike}`;

        rawPositions.push({
          positionKey,
          accountKey,
          symbol: symbolCell.trim(),
          description: descCell || `${underlying} ${optType} $${strike}`,
          assetCategory: 'Option',
          quantity: rawQty,
          costBasis: Math.abs(costBasis),
          currentPrice: lastPrice,
          marketValue: currentVal,
          unrealizedGainLoss: currentVal - (costBasis ? -Math.abs(costBasis) : 0),
          unrealizedGainLossPct: 0,
          optionDetails,
          dataSource: 'CSV',
          updatedAt: new Date().toISOString(),
        });
        continue;
      }

      // 3. Equities / ETFs / CDs / Bonds / Crypto
      const qty = cleanNumeric(row[colIndex.quantity >= 0 ? colIndex.quantity : 4]);
      const lastPrice = cleanNumeric(row[colIndex.lastPrice >= 0 ? colIndex.lastPrice : 5]);
      const currentVal = cleanNumeric(row[colIndex.currentValue >= 0 ? colIndex.currentValue : 7]);
      const costBasis = cleanNumeric(row[colIndex.costBasis >= 0 ? colIndex.costBasis : 13]);

      let assetCategory: AssetCategory = 'Stock';
      let maturityDate: string | undefined;
      let yieldApy: number | undefined;

      const isCd = /CERTIFICATE OF DEPOSIT|\bCD\b/i.test(descCell) || /\bCD\b/i.test(symbolCell);
      const isTreasury = /TREASURY|NOTE|BOND/i.test(descCell) || symbolCell === 'SGOV';

      if (isCd) {
        assetCategory = 'CD';
        // Extract maturity date from desc e.g. "11/20/2026" or "Nov-20-2026"
        const dateMatch = descCell.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d\d|\d{2})\b/) ||
                          descCell.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-(\d{1,2})-(\d{2,4})\b/i);
        if (dateMatch) {
          const d = new Date(dateMatch[0].replace(/-/g, ' '));
          if (!isNaN(d.getTime())) maturityDate = d.toISOString().slice(0, 10);
        }
        // Extract coupon rate e.g. "05.00000%" or "4.85%"
        const apyMatch = descCell.match(/(\d+(?:\.\d+)?)\s*%/);
        if (apyMatch) yieldApy = parseFloat(apyMatch[1]);
      } else if (isTreasury) {
        assetCategory = 'Bond_SGOV';
        const apyMatch = descCell.match(/(\d+(?:\.\d+)?)\s*%/);
        yieldApy = apyMatch ? parseFloat(apyMatch[1]) : (symbolCell === 'SGOV' ? 5.1 : undefined);
      } else if (symbolCell === 'GLDM' || symbolCell === 'SLV' || symbolCell === 'FBTC') {
        assetCategory = 'ETF';
      } else if (symbolCell.includes('BTC') || symbolCell.includes('ETH') || /BITCOIN|ETHEREUM|CRYPTO/i.test(descCell)) {
        assetCategory = 'Crypto';
      } else if (/FUND|TR|INDEX/i.test(descCell)) {
        assetCategory = 'ETF';
      }

      // Handle Fidelity BrokerageLink container line in Oracle 401(k)
      const isBrokerageLinkContainer = /BROKERAGELINK/i.test(descCell) || /BROKERAGELINK/i.test(symbolCell);
      const effectiveSymbol = isBrokerageLinkContainer ? 'BROKERAGELINK' : symbolCell;

      const maskedAcc = getMaskedSuffix(accountRawNumber);
      const accountKey = `fidelity_${maskedAcc}`;
      const positionKey = `${accountKey}_${effectiveSymbol}_${assetCategory}`;

      rawPositions.push({
        positionKey,
        accountKey,
        symbol: effectiveSymbol,
        description: descCell || effectiveSymbol,
        assetCategory,
        quantity: qty,
        costBasis,
        currentPrice: lastPrice,
        marketValue: currentVal,
        unrealizedGainLoss: currentVal - costBasis,
        unrealizedGainLossPct: costBasis > 0 ? ((currentVal - costBasis) / costBasis) * 100 : 0,
        yieldApy,
        maturityDate,
        dataSource: 'CSV',
        updatedAt: new Date().toISOString(),
      });
    }

    const maskedAcc = getMaskedSuffix(accountRawNumber);
    const accountKey = `fidelity_${maskedAcc}`;

    // Calculate total portfolio value: cash + sum of position market values
    const totalPosValue = rawPositions.reduce((acc, p) => acc + p.marketValue, 0);
    const totalValue = totalCashBalance + totalPosValue;

    let accountType = filenameMeta?.accountType || 'Brokerage';
    if (!filenameMeta?.accountType) {
      if (/brokeragelink/i.test(accountName)) accountType = 'BrokerageLink';
      else if (/401k|401\(k\)/i.test(accountName)) accountType = '401(k)';
      else if (/crypto/i.test(accountName)) accountType = 'Crypto';
      else if (/roth/i.test(accountName)) accountType = 'Roth IRA';
      else if (/ira/i.test(accountName)) accountType = 'Traditional IRA';
    }

    const payload: CanonicalAccountPayload = {
      accountKey,
      institution: 'Fidelity',
      accountName: accountName || 'Individual - TOD',
      accountMaskedNumber: `***-${maskedAcc}`,
      accountType,
      totalValue,
      cashBalance: totalCashBalance,
      positions: rawPositions,
      rawSourceFiles: [],
      sourceType: 'CSV',
      extractedAt: filenameMeta?.asOfDate || extractedTimestamp,
      version: 1,
    };

    return {
      accounts: [payload],
      extractedTimestamp: filenameMeta?.asOfDate || extractedTimestamp,
      sourceType: 'CSV',
    };
  }
}

function getMaskedSuffix(accStr: string): string {
  return extractAccountSuffix(accStr);
}
