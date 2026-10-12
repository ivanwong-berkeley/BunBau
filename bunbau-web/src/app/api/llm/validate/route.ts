import { NextRequest, NextResponse } from 'next/server';
import { listGeminiModels, LlmHttpError } from '../../../../lib/extraction/gemini';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { apiKey, vendor } = await req.json();
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key is required' }, { status: 400 });
    }

    if (vendor === 'Gemini') {
      const models = await listGeminiModels(apiKey.trim());
      if (models.length === 0) {
        return NextResponse.json({ success: false, error: 'Key is valid but exposes no Gemini models.' }, { status: 422 });
      }
      return NextResponse.json({ success: true, models });
    }
    // Anthropic validation
    if (vendor === 'Anthropic') {
      const trimmedKey = apiKey.trim();
      if (!trimmedKey.startsWith('sk-ant-')) {
        return NextResponse.json({ success: false, error: 'Invalid Anthropic API Key format (must start with sk-ant-)' }, { status: 401 });
      }
      // Return verified Anthropic models catalog including Claude 3.5 Sonnet, Haiku, Opus
      const anthropicModels = [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
      ];
      return NextResponse.json({ success: true, models: anthropicModels });
    }
    // Screenshot extraction is Gemini-only in v2.1; other vendors are accepted by format only.
    if (vendor === 'OpenAI') {
      if (!apiKey.startsWith('sk-')) {
        return NextResponse.json({ success: false, error: 'Invalid OpenAI API Key format' }, { status: 401 });
      }
      return NextResponse.json({ success: true, models: ['gpt-4o', 'gpt-4-turbo'] });
    }
    if (vendor === 'Ollama') {
      return NextResponse.json({ success: true, models: ['llama3', 'mistral', 'gemma:7b'] });
    }
    return NextResponse.json({ success: false, error: 'Unsupported vendor' }, { status: 400 });
  } catch (error: any) {
    if (error instanceof LlmHttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
