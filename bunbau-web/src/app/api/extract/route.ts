import { NextRequest, NextResponse } from 'next/server';
import { extractWithGemini, LlmHttpError, ImageInput } from '../../../lib/extraction/gemini';
import { ExtractionError } from '../../../lib/extraction/normalize';
import { isByteStringSafeApiKey } from '../../../lib/utils/cryptoVault';
import { parseFilenameMetadata } from '../../../lib/ingestion/filenameParser';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_IMAGES = 16;
const MAX_BYTES = 12 * 1024 * 1024; // per image, base64-decoded approx

export async function POST(req: NextRequest) {
  try {
    const { images, llmConfig, hints, fileNames } = await req.json();

    // User's own key first (must be a valid unmasked ByteString key); fall back to the server GEMINI_API_KEY
    const rawKey = llmConfig?.key?.trim();
    const isProvidedValid = isByteStringSafeApiKey(rawKey);
    const apiKey: string | undefined = isProvidedValid ? rawKey : process.env.GEMINI_API_KEY;
    const usedFallback = !isProvidedValid;

    if (!apiKey || !isByteStringSafeApiKey(apiKey)) {
      return NextResponse.json(
        { success: false, code: 'NO_KEY', error: 'No valid API key configured. Add one in LLM Settings.' },
        { status: 401 }
      );
    }
    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ success: false, error: 'No screenshot received.' }, { status: 400 });
    }
    if (images.length > MAX_IMAGES) {
      return NextResponse.json({ success: false, error: `Up to ${MAX_IMAGES} screenshots per import.` }, { status: 400 });
    }
    const clean: ImageInput[] = [];
    for (const img of images) {
      if (!img?.data || !/^image\//.test(img?.mimeType ?? '')) {
        return NextResponse.json({ success: false, error: 'Only image files are supported.' }, { status: 400 });
      }
      if ((img.data.length * 3) / 4 > MAX_BYTES) {
        return NextResponse.json({ success: false, error: 'A screenshot is too large (12 MB max).' }, { status: 413 });
      }
      clean.push({ mimeType: img.mimeType, data: img.data });
    }

    // Resolve hints from explicit parameters or filename metadata
    const firstFileName = Array.isArray(fileNames) && fileNames.length > 0 ? fileNames[0] : undefined;
    const fileMeta = firstFileName ? parseFilenameMetadata(firstFileName) : {};
    const resolvedHints = {
      institution: hints?.institution || fileMeta.institution,
      account:
        hints?.account ||
        fileMeta.accountRaw ||
        (fileMeta.accountSuffix ? `***-${fileMeta.accountSuffix}` : undefined),
      accountType: hints?.accountType || fileMeta.accountType,
    };

    const model: string = llmConfig?.model || 'gemini-2.5-flash';
    const extraction = await extractWithGemini({ apiKey, model, images: clean, hints: resolvedHints });
    return NextResponse.json({ success: true, aiStatus: 'green', extraction, model, usedFallback });
  } catch (error: any) {
    if (error instanceof ExtractionError) {
      return NextResponse.json({ success: false, code: 'UNREADABLE', error: error.message }, { status: 422 });
    }
    if (error instanceof LlmHttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status >= 400 && error.status < 600 ? error.status : 502 });
    }
    return NextResponse.json({ success: false, error: error?.message || 'Extraction failed.' }, { status: 500 });
  }
}
