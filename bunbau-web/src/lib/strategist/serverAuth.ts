/**
 * Server-side identity check. Needs only the Firebase project id (no service account):
 * the ID token signature is verified against Google's public certificates.
 * The uid is ONLY ever taken from the verified token, never from the request body.
 */
import { NextRequest } from 'next/server';

export type TokenVerifier = (idToken: string) => Promise<{ uid: string }>;

let cached: TokenVerifier | null = null;

async function defaultVerifier(): Promise<TokenVerifier> {
  if (cached) return cached;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Server is missing the Firebase project id');
  const { getApps, initializeApp } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');
  const app = getApps().find((a) => a.name === 'strategist-verify') || initializeApp({ projectId }, 'strategist-verify');
  cached = async (token: string) => {
    const d = await getAuth(app).verifyIdToken(token);
    return { uid: d.uid };
  };
  return cached;
}

export class AuthError extends Error {
  status = 401;
}

export function bearerToken(req: Pick<NextRequest, 'headers'>): string | null {
  const h = req.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

/** Returns the verified uid or throws AuthError (401). */
export async function requireUid(
  req: Pick<NextRequest, 'headers'>,
  verifier?: TokenVerifier
): Promise<string> {
  const token = bearerToken(req);
  if (!token) throw new AuthError('Sign in required');
  try {
    const v = verifier || (await defaultVerifier());
    const { uid } = await v(token);
    if (!uid) throw new Error('no uid');
    return uid;
  } catch {
    throw new AuthError('Invalid or expired sign-in. Please sign in again.');
  }
}
