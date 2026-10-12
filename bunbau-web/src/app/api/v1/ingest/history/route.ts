import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'demo-user';
    const accountKey = searchParams.get('accountKey');

    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('../../../../../lib/firebase');

      if (accountKey) {
        const snap = await getDocs(
          collection(db, 'users', userId, 'accounts', accountKey, 'versions')
        );
        const versions = snap.docs.map((d) => d.data());
        return NextResponse.json({ versions }, { status: 200 });
      } else {
        const snap = await getDocs(collection(db, 'users', userId, 'ingestion_logs'));
        const logs = snap.docs.map((d) => d.data());
        return NextResponse.json({ logs }, { status: 200 });
      }
    } catch {
      return NextResponse.json({ logs: [], versions: [] }, { status: 200 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
