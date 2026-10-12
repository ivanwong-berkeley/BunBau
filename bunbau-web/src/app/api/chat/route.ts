import { NextRequest, NextResponse } from 'next/server';
import { isByteStringSafeApiKey } from '../../../lib/utils/cryptoVault';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export async function POST(req: NextRequest) {
  try {
    const { message, messages, apiKey, portfolioContext } = await req.json();

    const isProvidedValid = isByteStringSafeApiKey(apiKey);
    const effectiveKey = isProvidedValid ? apiKey : process.env.GEMINI_API_KEY;
    if (!effectiveKey || !isByteStringSafeApiKey(effectiveKey)) {
      return NextResponse.json({
        success: false,
        error: 'No valid Gemini API key provided. Please configure your key in LLM Settings or .env.local.'
      }, { status: 401 });
    }

    const userPrompt = message || (messages && messages[messages.length - 1]?.text) || 'Provide portfolio optimization advice.';

    // Construct system and financial context
    const contextPrompt = `You are BunBau's professional financial yield advisor.
Portfolio Context:
${portfolioContext ? JSON.stringify(portfolioContext, null, 2) : 'No portfolio details provided.'}

User Question/Prompt:
${userPrompt}

Provide direct, actionable, and mathematically grounded yield optimization suggestions. Focus on:
1. Cash drag reduction (CDs vs SGOV vs CSPs)
2. Options income opportunities (Cash-Secured Puts on watchlist, low-delta Covered Calls on held shares >= 100)
3. Duration & reinvestment risk for fixed-income assets.
Keep the advice clear, bulleted, and concise.`;

    const url = `${BASE}/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(effectiveKey)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: contextPrompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return NextResponse.json({
        success: false,
        error: `Gemini API error (${response.status}): ${errBody.slice(0, 200)}`,
      }, { status: response.status });
    }

    const data = await response.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    return NextResponse.json({
      success: true,
      text: replyText,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
