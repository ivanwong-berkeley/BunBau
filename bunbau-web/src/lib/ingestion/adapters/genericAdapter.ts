/**
 * Generic Fallback CSV Export Adapter
 * Location: src/lib/ingestion/adapters/genericAdapter.ts
 */

import { parseCSV, cleanNumeric } from './csvParser';
import type {
  CanonicalAccountPayload,
  CanonicalPosition,
  AssetCategory,
} from '../../types/ingestion';

export class GenericFallbackAdapter {
  id = 'generic_csv';
  name = 'Generic Brokerage CSV Adapter';

  canHandle(headers: string[], firstRows: string[][], rawText: string): boolean {
    const headersLower = headers.map((h) => h.toLowerCase()).join(',');
    return (
      headersLower.includes('symbol') ||
      headersLower.includes('ticker') ||
      headersLower.includes('security')
    );
  }

  parse(rawText: string, userId: string = 'demo-user'): { accounts: CanonicalAccountPayload[]; sourceType: 'CSV' } {
    const { headers, rows } = parseCSV(rawText);

    if (rows.length === 0) {
      return { accounts: [], sourceType: 'CSV' };
    }

    const colIndex = {
      symbol: headers.findIndex((h) => /^(symbol|ticker|code|security)$/i.test(h)),
      description: headers.findIndex((h) => /^(description|name|security name)$/i.test(h)),
      quantity: headers.findIndex((h) => /^(quantity|qty|shares|units)$/i.test(h)),
      price: headers.findIndex((h) => /^(price|last price|close price|market price)$/i.test(h)),
      marketValue: headers.findIndex((h) => /^(current value|market value|value|amount|total)$/i.test(h)),
      costBasis: headers.findIndex((h) => /^(cost basis|cost|total cost|book value)$/i.test(h)),
    };

    let totalCashBalance = 0;
    const positions: CanonicalPosition[] = [];
    const maskedAcc = '9999';
    const accountKey = `generic_${maskedAcc}`;

    for (const row of rows) {
      const symbolCell = (row[colIndex.symbol >= 0 ? colIndex.symbol : 0] || '').trim();
      const descCell = (row[colIndex.description >= 0 ? colIndex.description : 1] || '').trim();
      const qty = cleanNumeric(row[colIndex.quantity >= 0 ? colIndex.quantity : 2]);
      const price = cleanNumeric(row[colIndex.price >= 0 ? colIndex.price : 3]);
      const mktVal = cleanNumeric(row[colIndex.marketValue >= 0 ? colIndex.marketValue : 4]);
      const costBasis = cleanNumeric(row[colIndex.costBasis >= 0 ? colIndex.costBasis : 5]);

      if (symbolCell.toLowerCase().includes('cash') || descCell.toLowerCase().includes('cash')) {
        totalCashBalance += mktVal || qty;
        continue;
      }

      if (!symbolCell && !descCell) {
        continue;
      }

      const assetCategory: AssetCategory = 'Stock';
      const positionKey = `${accountKey}_${symbolCell || 'ITEM'}_${assetCategory}`;

      positions.push({
        positionKey,
        accountKey,
        symbol: symbolCell || 'ITEM',
        description: descCell || symbolCell,
        assetCategory,
        quantity: qty,
        costBasis,
        currentPrice: price,
        marketValue: mktVal || qty * price,
        unrealizedGainLoss: (mktVal || qty * price) - costBasis,
        unrealizedGainLossPct: costBasis > 0 ? (((mktVal || qty * price) - costBasis) / costBasis) * 100 : 0,
        dataSource: 'CSV',
        updatedAt: new Date().toISOString(),
      });
    }

    const totalPosValue = positions.reduce((acc, p) => acc + p.marketValue, 0);

    const payload: CanonicalAccountPayload = {
      accountKey,
      institution: 'Generic Brokerage',
      accountName: 'Standard Account',
      accountMaskedNumber: `***-${maskedAcc}`,
      accountType: 'Brokerage',
      totalValue: totalCashBalance + totalPosValue,
      cashBalance: totalCashBalance,
      positions,
      rawSourceFiles: [],
      sourceType: 'CSV',
      extractedAt: new Date().toISOString(),
      version: 1,
    };

    return {
      accounts: [payload],
      sourceType: 'CSV',
    };
  }
}
