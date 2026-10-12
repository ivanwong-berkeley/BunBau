import { NextRequest, NextResponse } from 'next/server';
import { computeSha256 } from '../../../../../lib/ingestion/hasher';
import { CSVRouter } from '../../../../../lib/ingestion/adapters/router';
import { reconcileAccounts } from '../../../../../lib/ingestion/reconcile';
import type {
  CanonicalAccountPayload,
  StagingIngestionResponse,
  RawSourceFileMeta,
} from '../../../../../lib/types/ingestion';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const userId = (formData.get('userId') as string) || 'demo-user';
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided for ingestion' },
        { status: 400 }
      );
    }

    const csvRouter = new CSVRouter();
    const screenshotAccounts: CanonicalAccountPayload[] = [];
    const csvAccounts: CanonicalAccountPayload[] = [];
    const warnings: string[] = [];
    const processedFiles: RawSourceFileMeta[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileHash = computeSha256(buffer);
      const fileName = file.name || 'unnamed_file';
      const isCsv =
        file.type === 'text/csv' ||
        file.type === 'text/tab-separated-values' ||
        fileName.endsWith('.csv') ||
        fileName.endsWith('.tsv') ||
        fileName.endsWith('.ofx');

      const isImage =
        file.type.startsWith('image/') ||
        /\.(png|jpe?g|webp)$/i.test(fileName);

      if (isCsv) {
        const text = buffer.toString('utf-8');
        const routerResult = csvRouter.routeAndParse(text, userId);

        processedFiles.push({
          fileHash,
          fileName,
          fileType: 'CSV',
          storagePath: `raw_ingest/${Date.now()}_${fileName}`,
        });

        for (const acc of routerResult.accounts) {
          acc.rawSourceFiles = [
            ...(acc.rawSourceFiles || []),
            {
              fileHash,
              fileName,
              fileType: 'CSV',
              storagePath: `raw_ingest/${Date.now()}_${fileName}`,
            },
          ];
          csvAccounts.push(acc);
        }
      } else if (isImage) {
        processedFiles.push({
          fileHash,
          fileName,
          fileType: 'IMAGE',
          storagePath: `raw_ingest/${Date.now()}_${fileName}`,
        });

        // Screenshot payload placeholder (reconciles with Gemini Vision)
        warnings.push(`Image ${fileName} received for vision processing`);
      } else {
        warnings.push(`Unrecognized file type for ${fileName}; skipped.`);
      }
    }

    // Run field-level reconciliation engine
    const { mergedAccounts, diffs, warnings: reconcileWarnings } = reconcileAccounts(
      screenshotAccounts,
      csvAccounts,
      userId
    );

    const stagingId = `stg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const responsePayload: StagingIngestionResponse = {
      stagingId,
      accounts: mergedAccounts,
      diffs,
      warnings: [...warnings, ...reconcileWarnings],
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (err) {
    console.error('Ingestion Upload Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to process ingestion upload' },
      { status: 500 }
    );
  }
}
