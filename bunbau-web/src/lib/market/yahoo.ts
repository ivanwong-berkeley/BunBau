export interface DelayedQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketPreviousClose?: number;
  currency?: string;
  shortName?: string;
  isDelayed: boolean;
  delayedMinutes?: number;
  source: 'yahoo' | 'fallback';
  updatedAt: string;
}

// In-memory server cache with 60-second TTL
const quoteCache: Map<string, { quote: DelayedQuote; expiresAt: number }> = new Map();
const CACHE_TTL_MS = 60 * 1000;

/**
 * Fetches quote for a single symbol using Yahoo Finance v8 chart endpoint.
 * Note: Does NOT send fake browser User-Agent headers to avoid Yahoo 429 rate limit triggers.
 */
async function fetchSingleChartQuote(symbol: string): Promise<DelayedQuote | null> {
  const sym = symbol.trim().toUpperCase();

  // Check in-memory cache first
  const cached = quoteCache.get(sym);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.quote;
  }

  const hosts = [
    'https://query2.finance.yahoo.com',
    'https://query1.finance.yahoo.com',
  ];

  for (const host of hosts) {
    try {
      const url = `${host}/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
          const price = meta.regularMarketPrice;
          const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
          const change = price - prevClose;
          const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

          const quote: DelayedQuote = {
            symbol: sym,
            regularMarketPrice: Number(price.toFixed(2)),
            regularMarketChange: Number(change.toFixed(2)),
            regularMarketChangePercent: Number(changePct.toFixed(2)),
            regularMarketPreviousClose: Number(prevClose.toFixed(2)),
            currency: meta.currency || 'USD',
            shortName: sym,
            isDelayed: true,
            delayedMinutes: 15,
            source: 'yahoo',
            updatedAt: new Date().toISOString(),
          };

          // Store in cache
          quoteCache.set(sym, { quote, expiresAt: Date.now() + CACHE_TTL_MS });
          return quote;
        }
      }
    } catch {
      // Continue to next host
    }
  }

  return null;
}

export async function fetchDelayedQuotes(symbols: string[]): Promise<Record<string, DelayedQuote>> {
  const result: Record<string, DelayedQuote> = {};
  if (!symbols || symbols.length === 0) return result;

  const cleanSymbols = [...new Set(symbols.map(s => s.trim().toUpperCase()).filter(Boolean))];

  // Fetch all symbols in parallel using clean v8 chart requests
  const promises = cleanSymbols.map(async (sym) => {
    const quote = await fetchSingleChartQuote(sym);
    if (quote) {
      result[sym] = quote;
    }
  });

  await Promise.allSettled(promises);

  // Fallback for any symbols that failed or returned nothing
  const now = new Date().toISOString();
  for (const sym of cleanSymbols) {
    if (!result[sym]) {
      result[sym] = {
        symbol: sym,
        regularMarketPrice: 0,
        regularMarketChange: 0,
        regularMarketChangePercent: 0,
        currency: 'USD',
        shortName: sym,
        isDelayed: true,
        source: 'fallback',
        updatedAt: now,
      };
    }
  }

  return result;
}
