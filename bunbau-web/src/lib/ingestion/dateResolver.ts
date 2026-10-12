import { FilenameMetadata } from './filenameParser';

/**
 * Resolves the authoritative asOfDate using a 3-tier priority hierarchy:
 * 1. Filename-derived date (e.g. Oct-07-2026 -> 2026-10-07)
 * 2. In-file metadata date (e.g. "Date downloaded Oct-07-2026", "Balances as of 10/07/2026")
 * 3. System ingestion timestamp (fallback)
 */
export function resolveAsOfDate(
  filenameMeta?: FilenameMetadata,
  inFileDate?: string | null,
  fallbackDate?: string
): string {
  if (filenameMeta?.asOfDate && /^\d{4}-\d{2}-\d{2}$/.test(filenameMeta.asOfDate)) {
    return filenameMeta.asOfDate;
  }

  if (inFileDate) {
    const cleaned = normalizeDateString(inFileDate);
    if (cleaned) return cleaned;
  }

  if (fallbackDate && /^\d{4}-\d{2}-\d{2}$/.test(fallbackDate)) {
    return fallbackDate;
  }

  return new Date().toISOString().slice(0, 10);
}

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

export function normalizeDateString(dateStr: string): string | null {
  if (!dateStr) return null;

  // ISO: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = dateStr.match(/(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  // Text: Oct-07-2026, Oct 07, 2026
  const textMatch = dateStr.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[-_ ](\d{1,2})[,\-_ ]+(\d{4})/i);
  if (textMatch) {
    const m = MONTH_MAP[textMatch[1].toLowerCase()];
    const d = textMatch[2].padStart(2, '0');
    const y = textMatch[3];
    return `${y}-${m}-${d}`;
  }

  // US: MM/DD/YYYY or MM-DD-YYYY
  const usMatch = dateStr.match(/(\d{1,2})[-/](\d{1,2})[-/](20\d{2})/);
  if (usMatch) {
    return `${usMatch[3]}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}`;
  }

  return null;
}
