import { parseCSV, cleanNumeric } from './csvParser';
import { FilenameMetadata } from '../filenameParser';
import type {
  CanonicalAccountPayload,
  CanonicalPosition,
  CanonicalOptionDetails,
  AssetCategory,
} from '../../types/ingestion';

export interface WebullReconstructionResult {
  accounts: CanonicalAccountPayload[];
  sourceType: 'CSV';
  extractedTimestamp?: string;
}

const OCC_OPTION_REGEX = /^([A-Z]+)(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/;

export class WebullOrdersAdapter {
  id = 'webull_orders';
  name = 'WeBull Order Records Reconstructor';

  canHandle(headers: string[], firstRows: string[][], rawText: string): boolean {
    const joined = headers.map(h => h.toLowerCase()).join(',');
    const hasWebullHeaders =
      joined.includes('time-in-force') &&
      joined.includes('placed time') &&
      joined.includes('filled time') &&
      joined.includes('avg price');

    const hasWebullMarkers =
      rawText.includes('Time-in-Force') ||
      rawText.includes('Filled Time') ||
      /webull/i.test(rawText);

    return hasWebullHeaders || hasWebullMarkers;
  }

  parse(rawText: string, userId: string = 'demo-user', filenameMeta?: FilenameMetadata): WebullReconstructionResult {
    const { headers, rows } = parseCSV(rawText);
    if (headers.length === 0 || rows.length === 0) {
      return { accounts: [], sourceType: 'CSV' };
    }

    const colIndex = {
      name: headers.findIndex(h => /^name$/i.test(h)),
      symbol: headers.findIndex(h => /^symbol$/i.test(h)),
      side: headers.findIndex(h => /^side$/i.test(h)),
      status: headers.findIndex(h => /^status$/i.test(h)),
      filled: headers.findIndex(h => /^filled$/i.test(h)),
      avgPrice: headers.findIndex(h => /^avg price$/i.test(h)),
      filledTime: headers.findIndex(h => /^filled time$/i.test(h)),
    };

    // Tracking position aggregation per symbol:
    interface RunningPosition {
      name: string;
      symbol: string;
      netQty: number;
      totalBuyCost: number;
      totalBuyQty: number;
      totalSellProceeds: number;
      lastPrice: number;
      isOption: boolean;
      optionDetails?: CanonicalOptionDetails;
    }

    const positionMap: Record<string, RunningPosition> = {};

    for (const row of rows) {
      const status = (row[colIndex.status >= 0 ? colIndex.status : 3] || '').trim();
      if (!/filled/i.test(status)) continue; // Only process filled orders

      const symbol = (row[colIndex.symbol >= 0 ? colIndex.symbol : 1] || '').trim().toUpperCase();
      const name = (row[colIndex.name >= 0 ? colIndex.name : 0] || '').trim();
      const side = (row[colIndex.side >= 0 ? colIndex.side : 2] || '').trim().toLowerCase();
      const filledQty = cleanNumeric(row[colIndex.filled >= 0 ? colIndex.filled : 4]);
      const avgPrice = cleanNumeric(row[colIndex.avgPrice >= 0 ? colIndex.avgPrice : 7]);

      if (!symbol || filledQty <= 0) continue;

      if (!positionMap[symbol]) {
        // Check if option
        const occMatch = symbol.match(OCC_OPTION_REGEX);
        let isOption = false;
        let optDetails: CanonicalOptionDetails | undefined;

        if (occMatch) {
          isOption = true;
          const underlying = occMatch[1];
          const yy = occMatch[2];
          const mm = occMatch[3];
          const dd = occMatch[4];
          const cp = occMatch[5];
          const strike = parseInt(occMatch[6], 10) / 1000;
          const expirationDate = `20${yy}-${mm}-${dd}`;

          optDetails = {
            underlying,
            type: cp === 'P' ? 'PUT' : 'CALL',
            strike,
            expirationDate,
            isCollateralizedCsp: cp === 'P',
            contractsCount: Math.abs(filledQty),
            premium: avgPrice,
          };
        }

        positionMap[symbol] = {
          name: name || symbol,
          symbol,
          netQty: 0,
          totalBuyCost: 0,
          totalBuyQty: 0,
          totalSellProceeds: 0,
          lastPrice: avgPrice,
          isOption,
          optionDetails: optDetails,
        };
      }

      const p = positionMap[symbol];
      p.lastPrice = avgPrice > 0 ? avgPrice : p.lastPrice;

      if (side === 'buy') {
        p.netQty += filledQty;
        p.totalBuyQty += filledQty;
        p.totalBuyCost += filledQty * avgPrice;
      } else if (side === 'sell') {
        p.netQty -= filledQty;
        p.totalSellProceeds += filledQty * avgPrice;
      }
    }

    const maskedAcc = filenameMeta?.accountSuffix || 'XLW4';
    const accountKey = `webull_${maskedAcc}`;
    const accountType = filenameMeta?.accountType || 'Brokerage';
    const extractedTimestamp = filenameMeta?.asOfDate || new Date().toISOString().slice(0, 10);

    const positions: CanonicalPosition[] = [];
    let totalPositionsValue = 0;

    for (const [sym, data] of Object.entries(positionMap)) {
      if (Math.abs(data.netQty) < 0.000001) continue; // Closed / flat position

      const isLong = data.netQty > 0;
      const absQty = Math.abs(data.netQty);
      const avgCost = data.totalBuyQty > 0 ? data.totalBuyCost / data.totalBuyQty : data.lastPrice;
      const marketVal = data.isOption ? absQty * data.lastPrice * 100 : absQty * data.lastPrice;
      const costBasis = data.isOption ? absQty * avgCost * 100 : absQty * avgCost;

      let assetCategory: AssetCategory = 'Stock';
      if (data.isOption) {
        assetCategory = 'Option';
        if (data.optionDetails) {
          data.optionDetails.contractsCount = Math.round(absQty);
        }
      } else if (sym === 'SPY' || sym === 'QQQ' || sym === 'SGOV') {
        assetCategory = 'ETF';
      }

      totalPositionsValue += isLong ? marketVal : -marketVal;

      positions.push({
        positionKey: `${accountKey}_${sym}_${assetCategory}`,
        accountKey,
        symbol: sym,
        description: data.name,
        assetCategory,
        quantity: isLong ? absQty : -absQty,
        costBasis,
        currentPrice: data.lastPrice,
        marketValue: isLong ? marketVal : -marketVal,
        unrealizedGainLoss: marketVal - costBasis,
        unrealizedGainLossPct: costBasis > 0 ? ((marketVal - costBasis) / costBasis) * 100 : 0,
        optionDetails: data.optionDetails || null,
        dataSource: 'CSV',
        updatedAt: new Date().toISOString(),
      });
    }

    const payload: CanonicalAccountPayload = {
      accountKey,
      institution: 'WeBull',
      accountName: `WeBull ${accountType}`,
      accountMaskedNumber: `***-${maskedAcc}`,
      accountType,
      totalValue: totalPositionsValue,
      cashBalance: 0, // Cash reconstructed or topped up by account summary
      positions,
      rawSourceFiles: [],
      sourceType: 'CSV',
      extractedAt: extractedTimestamp,
      version: 1,
    };

    return {
      accounts: [payload],
      extractedTimestamp,
      sourceType: 'CSV',
    };
  }
}
