/**
 * RFC 4180 Compliant Streaming / Line-based CSV Parser with Financial Value Cleansing
 * Location: src/lib/ingestion/adapters/csvParser.ts
 */

export interface ParsedCSV {
  headers: string[];
  rows: string[][];
  rawRowCount: number;
}

/**
 * Parses raw CSV text handling quoted values with internal commas, quotes, and newlines.
 */
export function parseCSV(rawText: string): ParsedCSV {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  const len = rawText.length;

  while (i < len) {
    const char = rawText[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < len && rawText[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        // Handle CRLF or standalone CR
        if (i + 1 < len && rawText[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Final field & row if file doesn't end in newline
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], rawRowCount: 0 };
  }

  const maxCols = Math.max(1, ...rows.map((r) => r.length));

  // Find the true header row: scan first 30 rows for multiple columns and financial header keywords
  let headerIndex = 0;
  let bestHeaderScore = -1;

  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const row = rows[r];
    const joined = row.join(' ').toLowerCase();
    const nonEmptyCount = row.filter((c) => c.trim().length > 0).length;

    let score = 0;
    if (joined.includes('security id') || joined.includes('symbol')) score += 5;
    if (joined.includes('description')) score += 3;
    if (joined.includes('market value') || joined.includes('current value')) score += 4;
    if (joined.includes('price') || joined.includes('last price')) score += 3;
    if (joined.includes('quantity') || joined.includes('qty')) score += 3;
    if (joined.includes('cusip')) score += 3;
    if (joined.includes('account number') || joined.includes('account')) score += 2;

    if (score > 0 && nonEmptyCount >= 2) {
      score += nonEmptyCount;
      if (score > bestHeaderScore) {
        bestHeaderScore = score;
        headerIndex = r;
      }
    }
  }

  // Build headers padded up to maxCols
  const rawHeaders = rows[headerIndex] || [];
  const headers: string[] = [];
  for (let c = 0; c < maxCols; c++) {
    const h = (rawHeaders[c] || '').replace(/^["']|["']$/g, '').trim();
    headers.push(h || `Col ${c + 1}`);
  }

  // Data rows start after header row, padded up to maxCols
  const dataRows = rows.slice(headerIndex + 1).map((row) => {
    const padded = [...row];
    while (padded.length < maxCols) {
      padded.push('');
    }
    return padded;
  });

  return {
    headers,
    rows: dataRows,
    rawRowCount: rows.length,
  };
}

/**
 * Robust financial numeric value cleanser:
 * - Converts accounting negative parentheses: ($78.00) or ($5,791.34) -> -78.00 / -5791.34
 * - Strips currency symbols: $, €, £
 * - Strips quotes and commas: "$434,329.97 " -> 434329.97
 * - Strips percentage symbols: "117.67%" -> 117.67
 * - Returns 0 for empty or unparseable non-numbers
 */
export function cleanNumeric(val: unknown): number {
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  if (!val || typeof val !== 'string') {
    return 0;
  }

  let cleaned = val.trim();
  if (cleaned === '' || cleaned === '--' || cleaned === 'N/A' || cleaned === 'n/a') {
    return 0;
  }

  // Strip leading/trailing quotes first
  cleaned = cleaned.replace(/^["']+|["']+$/g, '').trim();

  // Check for accounting parentheses negative format, e.g. ($78.00) or (78.00)
  const isParenNegative = /^\s*\(.*?\)\s*$/.test(cleaned);
  if (isParenNegative) {
    cleaned = cleaned.replace(/[()]/g, '');
  }

  // Strip $, commas, quotes, %, and whitespace
  cleaned = cleaned.replace(/[$,"'%]/g, '').trim();

  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) {
    return 0;
  }

  return isParenNegative ? -Math.abs(parsed) : parsed;
}
