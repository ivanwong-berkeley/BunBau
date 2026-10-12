import { NextRequest, NextResponse } from 'next/server';
import { fetchDelayedQuotes } from '@/lib/market/yahoo';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const symbolsParam = url.searchParams.get('symbols') || '';
    const symbols = symbolsParam.split(',').map(s => s.trim()).filter(Boolean);

    if (symbols.length === 0) {
      return NextResponse.json({ success: false, error: 'No symbols specified' }, { status: 400 });
    }

    const quotes = await fetchDelayedQuotes(symbols);
    return NextResponse.json({ success: true, quotes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
