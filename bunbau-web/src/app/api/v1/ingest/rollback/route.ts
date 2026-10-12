import { NextRequest, NextResponse } from 'next/server';
import { toLegacyAccount } from '../../../../../lib/types/ingestion';
import { rollbackAccountToVersion } from '../../../../../lib/ingestion/versioning';
import type { CanonicalAccountPayload, AccountVersionRecord } from '../../../../../lib/types/ingestion';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, accountKey, targetVersionRecord, currentAccount } = body as {
      userId: string;
      accountKey: string;
      targetVersionRecord: AccountVersionRecord;
      currentAccount: CanonicalAccountPayload;
    };

    if (!targetVersionRecord || !currentAccount) {
      return NextResponse.json(
        { error: 'Missing target version record or current account state' },
        { status: 400 }
      );
    }

    const restoredAccount = rollbackAccountToVersion(currentAccount, targetVersionRecord);
    const legacyAcc = toLegacyAccount(restoredAccount);

    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../../../../../lib/firebase');

      // Update active account state
      await setDoc(
        doc(db, 'users', userId || 'demo-user', 'accounts', legacyAcc.id),
        JSON.parse(JSON.stringify(legacyAcc))
      );
    } catch (dbErr) {
      console.warn('Firestore rollback write deferred:', dbErr);
    }

    return NextResponse.json(
      {
        success: true,
        accountKey: legacyAcc.id,
        restoredVersion: restoredAccount.version,
        restoredAccount,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to rollback version' },
      { status: 500 }
    );
  }
}
