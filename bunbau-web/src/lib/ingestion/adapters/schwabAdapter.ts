/**
 * Deterministic Charles Schwab CSV Export Adapter
 * Location: src/lib/ingestion/adapters/schwabAdapter.ts
 */

import { parseCSV, cleanNumeric } from './csvParser';
import type {
  CanonicalAccountPayload,
  CanonicalPosition,
  CanonicalOptionDetails,
  AssetCategory,
} from '../../types/ingestion';

export interface SchwabAdapterParseResult {
  accounts: CanonicalAccountPayload[];
  sourceType: 'CSV';
}

const SCHWAB_OPTION_REGEX = /^([A-Z]+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d+(?:\.\d+)?)\s+([CP])$/i;

import type { FilenameMetadata } from '../filenameParser';

export class SchwabCSVAdapter {
  id = 'schwab_csv';
  name = 'Charles Schwab CSV Adapter';

  canHandle(headers: string[], firstRows: string[][], rawText: string): boolean {
    const textLower = rawText.toLowerCase();
    const headersLower = headers.map((h) => h.toLowerCase()).join(',');

    return (
      textLower.includes('positions for account') ||
      textLower.includes('charles schwab & co') ||
      (headersLower.includes('symbol') &&
        headersLower.includes('description') &&
        (headersLower.includes('cost basis') || headersLower.includes('market value')))
    );
  }

  parse(rawText: string, userId: string = 'demo-user', filenameMeta?: FilenameMetadata): SchwabAdapterParseResult {
    const { headers, rows } = parseCSV(rawText);

    if (rows.length === 0) {
      return { accounts: [], sourceType: 'CSV' };
    }

    const colIndex = {
      symbol: headers.findIndex((h) => /symbol/i.test(h)),
      description: headers.findIndex((h) => /description/i.test(h)),
      quantity: headers.findIndex((h) => /qty|quantity/i.test(h)),
      price: headers.findIndex((h) => /^price$/i.test(h) || /^price\s/i.test(h)),
      amount: headers.findIndex((h) => /mkt\s*val|market\s*val|current\s*val|amount/i.test(h)),
      costBasis: headers.findIndex((h) => /cost\s*basis/i.test(h)),
    };

    let totalCashBalance = 0;
    const positions: CanonicalPosition[] = [];
    let maskedAcc = filenameMeta?.accountSuffix || (rawText.match(/\.{2,}\s*(\d{3,4})/) ? rawText.match(/\.{2,}\s*(\d{3,4})/)![1].padStart(4, '0') : '8888');
    let accountName = filenameMeta?.accountType ? `Schwab ${filenameMeta.accountType}` : 'Schwab Brokerage';

    for (const row of rows) {
      const symbolCell = (row[colIndex.symbol >= 0 ? colIndex.symbol : 0] || '').trim();
      const descCell = (row[colIndex.description >= 0 ? colIndex.description : 1] || '').trim();
      const amountVal = cleanNumeric(row[colIndex.amount >= 0 ? colIndex.amount : 4]);

      // Skip summary or footer rows
      if (symbolCell.toLowerCase().includes('positions total') || descCell.toLowerCase().includes('positions total')) {
        continue;
      }

      // Check for cash line
      if (
        symbolCell.toLowerCase().includes('cash') ||
        descCell.toLowerCase().includes('cash & cash investments') ||
        (symbolCell === '--' && descCell.toLowerCase().includes('cash'))
      ) {
        totalCashBalance += amountVal;
        continue;
      }

      if (!symbolCell && !descCell) {
        continue;
      }

      // Check for CD / Fixed Income
      const isCD = /CERTIFICATE OF DEPOSIT|CD\b/i.test(descCell);
      if (isCD) {
        const matMatch = descCell.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
        const apyMatch = descCell.match(/(\d+(?:\.\d+)?)\s*%/);

        let maturityDate: string | undefined;
        if (matMatch) {
          const m = matMatch[1].padStart(2, '0');
          const d = matMatch[2].padStart(2, '0');
          const y = matMatch[3].length === 2 ? `20${matMatch[3]}` : matMatch[3];
          maturityDate = `${y}-${m}-${d}`;
        }
        const yieldApy = apyMatch ? parseFloat(apyMatch[1]) : undefined;

        const qty = cleanNumeric(row[colIndex.quantity >= 0 ? colIndex.quantity : 2]);
        const costBasis = cleanNumeric(row[colIndex.costBasis >= 0 ? colIndex.costBasis : 5]);
        const price = cleanNumeric(row[colIndex.price >= 0 ? colIndex.price : 3]);

        const accountKey = `schwab_${maskedAcc}`;
        const positionKey = `${accountKey}_CD_${symbolCell || 'CD'}_${maturityDate || 'NA'}`;

        positions.push({
          positionKey,
          accountKey,
          symbol: symbolCell || 'CD',
          description: descCell,
          assetCategory: 'CD',
          quantity: qty,
          costBasis,
          currentPrice: price,
          marketValue: amountVal,
          unrealizedGainLoss: amountVal - costBasis,
          unrealizedGainLossPct: costBasis > 0 ? ((amountVal - costBasis) / costBasis) * 100 : 0,
          maturityDate,
          yieldApy,
          dataSource: 'CSV',
          updatedAt: new Date().toISOString(),
        });
        continue;
      }

      // Check for Option
      const optMatch = symbolCell.match(SCHWAB_OPTION_REGEX);
      if (optMatch || /(CALL|PUT)/i.test(descCell)) {
        let underlying = '';
        let optType: 'CALL' | 'PUT' = 'PUT';
        let strike = 0;
        let expirationDate = '';

        if (optMatch) {
          underlying = optMatch[1];
          const [m, d, y] = optMatch[2].split('/');
          expirationDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          strike = parseFloat(optMatch[3]);
          optType = optMatch[4].toUpperCase() === 'P' ? 'PUT' : 'CALL';
        } else {
          underlying = symbolCell.replace(/[^A-Z]/g, '');
          optType = /PUT/i.test(descCell) ? 'PUT' : 'CALL';
          const strikeMatch = descCell.match(/\$(\d+(?:\.\d+)?)/);
          strike = strikeMatch ? parseFloat(strikeMatch[1]) : 0;
        }

        const qty = cleanNumeric(row[colIndex.quantity >= 0 ? colIndex.quantity : 2]);
        const contractsCount = Math.abs(qty) || 1;
        const costBasis = cleanNumeric(row[colIndex.costBasis >= 0 ? colIndex.costBasis : 5]);
        const price = cleanNumeric(row[colIndex.price >= 0 ? colIndex.price : 3]);

        const optionDetails: CanonicalOptionDetails = {
          underlying,
          type: optType,
          strike,
          expirationDate,
          isCollateralizedCsp: optType === 'PUT',
          contractsCount,
          premium: Math.abs(price),
        };

        // Calculate annualized option yield
        let annualizedYield: number | undefined;
        if (strike > 0 && expirationDate) {
          const dte = Math.max(1, Math.round((new Date(expirationDate).getTime() - Date.now()) / (1000 * 3600 * 24)));
          const collateral = optType === 'PUT' ? strike * 100 : amountVal > 0 ? amountVal : strike * 100;
          const prem = Math.abs(costBasis) || Math.abs(amountVal);
          if (collateral > 0 && prem > 0) {
            annualizedYield = Number(((prem / collateral) * (365 / dte) * 100).toFixed(2));
          }
        }
        if (annualizedYield && optionDetails) {
          optionDetails.annualizedYield = annualizedYield;
        }

        const accountKey = `schwab_${maskedAcc}`;
        const positionKey = `${accountKey}_OPT_${underlying}_${expirationDate}_${optType}_${strike}`;

        positions.push({
          positionKey,
          accountKey,
          symbol: symbolCell,
          description: descCell || `${underlying} ${optType} $${strike}`,
          assetCategory: 'Option',
          quantity: qty,
          costBasis: Math.abs(costBasis),
          currentPrice: price,
          marketValue: amountVal,
          unrealizedGainLoss: amountVal - (costBasis ? -Math.abs(costBasis) : 0),
          unrealizedGainLossPct: 0,
          optionDetails,
          dataSource: 'CSV',
          updatedAt: new Date().toISOString(),
        });
        continue;
      }

      // Standard Equities / ETFs / CDs / Treasuries
      const qty = cleanNumeric(row[colIndex.quantity >= 0 ? colIndex.quantity : 2]);
      const price = cleanNumeric(row[colIndex.price >= 0 ? colIndex.price : 3]);
      const costBasis = cleanNumeric(row[colIndex.costBasis >= 0 ? colIndex.costBasis : 5]);

      let assetCategory: AssetCategory = 'Stock';
      let maturityDate: string | undefined;
      let yieldApy: number | undefined;

      const isCd = /CERTIFICATE OF DEPOSIT|\bCD\b/i.test(descCell) || /\bCD\b/i.test(symbolCell);
      const isTreasury = /TREASURY|NOTE|BOND/i.test(descCell) || symbolCell === 'SGOV';

      if (isCd) {
        assetCategory = 'CD';
        const dateMatch = descCell.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d\d|\d{2})\b/);
        if (dateMatch) {
          const d = new Date(dateMatch[0]);
          if (!isNaN(d.getTime())) maturityDate = d.toISOString().slice(0, 10);
        }
        const apyMatch = descCell.match(/(\d+(?:\.\d+)?)\s*%/);
        if (apyMatch) yieldApy = parseFloat(apyMatch[1]);
      } else if (isTreasury) {
        assetCategory = 'Bond_SGOV';
        const apyMatch = descCell.match(/(\d+(?:\.\d+)?)\s*%/);
        yieldApy = apyMatch ? parseFloat(apyMatch[1]) : (symbolCell === 'SGOV' ? 5.1 : undefined);
      } else if (descCell.toLowerCase().includes('etf') || symbolCell === 'SPY' || symbolCell === 'QQQ') {
        assetCategory = 'ETF';
      }

      const accountKey = `schwab_${maskedAcc}`;
      const positionKey = `${accountKey}_${symbolCell}_${assetCategory}`;

      positions.push({
        positionKey,
        accountKey,
        symbol: symbolCell,
        description: descCell || symbolCell,
        assetCategory,
        quantity: qty,
        costBasis,
        currentPrice: price,
        marketValue: amountVal,
        unrealizedGainLoss: amountVal - costBasis,
        unrealizedGainLossPct: costBasis > 0 ? ((amountVal - costBasis) / costBasis) * 100 : 0,
        yieldApy,
        maturityDate,
        dataSource: 'CSV',
        updatedAt: new Date().toISOString(),
      });
    }

    const accountKey = `schwab_${maskedAcc}`;
    const totalPosValue = positions.reduce((acc, p) => acc + p.marketValue, 0);

    // Parse date from header if present: e.g. "as of 08:59 PM ET, 2026/10/07"
    const headerDateMatch = rawText.match(/as of [^,]+,\s*(20\d{2})[-/](\d{2})[-/](\d{2})/i);
    const dateFromHeader = headerDateMatch ? `${headerDateMatch[1]}-${headerDateMatch[2]}-${headerDateMatch[3]}` : undefined;
    const extractedAt = filenameMeta?.asOfDate || dateFromHeader || new Date().toISOString();

    const accountType = filenameMeta?.accountType || (rawText.toLowerCase().includes('ira') ? 'Traditional IRA' : 'Brokerage');
    const finalAccountName = filenameMeta?.accountType ? `Schwab ${filenameMeta.accountType}` : accountName;

    const payload: CanonicalAccountPayload = {
      accountKey,
      institution: 'Charles Schwab',
      accountName: finalAccountName,
      accountMaskedNumber: `***-${maskedAcc}`,
      accountType,
      totalValue: totalCashBalance + totalPosValue,
      cashBalance: totalCashBalance,
      positions,
      rawSourceFiles: [],
      sourceType: 'CSV',
      extractedAt,
      version: 1,
    };

    return {
      accounts: [payload],
      sourceType: 'CSV',
    };
  }
}
