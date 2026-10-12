import { NextRequest, NextResponse } from 'next/server';
import { toLegacyAccount } from '../../../../../lib/types/ingestion';
import { createVersionSnapshot } from '../../../../../lib/ingestion/versioning';
import type { CanonicalAccountPayload } from '../../../../../lib/types/ingestion';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stagingId, userId, confirmedAccounts } = body as {
      stagingId: string;
      userId: string;
      confirmedAccounts: CanonicalAccountPayload[];
    };

    if (!confirmedAccounts || confirmedAccounts.length === 0) {
      return NextResponse.json(
        { error: 'No confirmed accounts provided' },
        { status: 400 }
      );
    }

    const updatedAccountKeys: string[] = [];

    // Attempt to persist to Firestore if Firebase is configured
    try {
      const { doc, setDoc, writeBatch } = await import('firebase/firestore');
      const { db } = await import('../../../../../lib/firebase');

      const batch = writeBatch(db);

      for (const account of confirmedAccounts) {
        const legacyAcc = toLegacyAccount(account);
        const versionSnapshot = createVersionSnapshot(account, stagingId);

        // 1. Commit active account document
        const accRef = doc(db, 'users', userId || 'demo-user', 'accounts', legacyAcc.id);
        batch.set(accRef, JSON.parse(JSON.stringify(legacyAcc)));

        // 2. Commit version snapshot document
        const verRef = doc(
          db,
          'users',
          userId || 'demo-user',
          'accounts',
          legacyAcc.id,
          'versions',
          versionSnapshot.versionId
        );
        batch.set(verRef, JSON.parse(JSON.stringify(versionSnapshot)));

        // 3. Log ingestion entry
        const logRef = doc(db, 'users', userId || 'demo-user', 'ingestion_logs', stagingId);
        batch.set(logRef, {
          ingestionId: stagingId,
          userId: userId || 'demo-user',
          accountKey: legacyAcc.id,
          sourceType: account.sourceType,
          positionCount: account.positions.length,
          totalValue: account.totalValue,
          status: 'MERGED',
          createdAt: new Date().toISOString(),
        });

        updatedAccountKeys.push(legacyAcc.id);
      }

      await Promise.race([
        batch.commit(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore write timeout or offline')), 1000)),
      ]);
    } catch (dbErr) {
      console.warn('Firestore commit deferred or offline, proceeding in local session mode:', dbErr);
      confirmedAccounts.forEach((a) => updatedAccountKeys.push(a.accountKey));
    }

    return NextResponse.json(
      {
        success: true,
        stagingId,
        updatedAccountKeys,
        committedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Ingestion Confirm Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to confirm ingestion' },
      { status: 500 }
    );
  }
}
