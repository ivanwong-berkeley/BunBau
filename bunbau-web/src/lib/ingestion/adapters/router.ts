/**
 * Ingestion Adapter Router
 * Location: src/lib/ingestion/adapters/router.ts
 */

import { parseCSV } from './csvParser';
import { FidelityCSVAdapter } from './fidelityAdapter';
import { SchwabCSVAdapter } from './schwabAdapter';
import { WebullOrdersAdapter } from './webullReconstructor';
import { parseCitiWorkbook } from './citiXlsxAdapter';
import { GenericFallbackAdapter } from './genericAdapter';
import type { FilenameMetadata } from '../filenameParser';
import type { CanonicalAccountPayload } from '../../types/ingestion';

export interface RouterParseResult {
  adapterId: string;
  adapterName: string;
  accounts: CanonicalAccountPayload[];
  sourceType: 'CSV';
  extractedTimestamp?: string;
}

export class CSVRouter {
  private adapters = [
    new FidelityCSVAdapter(),
    new SchwabCSVAdapter(),
    new WebullOrdersAdapter(),
    new GenericFallbackAdapter(),
  ];

  routeAndParse(
    rawCsvText: string,
    userId: string = 'demo-user',
    filenameMeta?: FilenameMetadata
  ): RouterParseResult {
    // Check if Citi format (Holdings or Balances Summary)
    if (
      filenameMeta?.institution === 'Citi' ||
      rawCsvText.includes('Balances as of') ||
      rawCsvText.includes('Long Market Value') ||
      rawCsvText.includes('CZ500') ||
      rawCsvText.includes('Total Market Value:') ||
      (rawCsvText.includes('Security ID') && (rawCsvText.includes('Pershing') || rawCsvText.includes('Asset Classification')))
    ) {
      const citiRes = parseCitiWorkbook(rawCsvText, filenameMeta);
      return {
        adapterId: citiRes.adapterId,
        adapterName: citiRes.adapterName,
        accounts: citiRes.accounts,
        sourceType: 'CSV',
        extractedTimestamp: citiRes.asOfDate,
      };
    }

    const { headers, rows } = parseCSV(rawCsvText);
    const firstRows = rows.slice(0, 5);

    for (const adapter of this.adapters) {
      if (adapter.canHandle(headers, firstRows, rawCsvText)) {
        const result = adapter.parse(rawCsvText, userId, filenameMeta);
        return {
          adapterId: adapter.id,
          adapterName: adapter.name,
          accounts: result.accounts,
          sourceType: 'CSV',
          extractedTimestamp: (result as { extractedTimestamp?: string }).extractedTimestamp,
        };
      }
    }

    // Default to generic fallback
    const fallback = new GenericFallbackAdapter();
    const fallbackRes = fallback.parse(rawCsvText, userId);
    return {
      adapterId: fallback.id,
      adapterName: fallback.name,
      accounts: fallbackRes.accounts,
      sourceType: 'CSV',
    };
  }
}
