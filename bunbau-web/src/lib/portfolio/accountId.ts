import { md5 } from 'js-md5';

/**
 * Extracts normalized alphanumeric account suffix (e.g. "Z12346238" -> "6238", "***-6238" -> "6238").
 * Ensures that brokerage statements and UI screenshots for the same account always resolve
 * to the exact same deterministic accountId.
 */
export function extractAccountSuffix(accountString: string): string {
  if (!accountString) return 'unknown';
  const clean = accountString.trim();
  // Extract trailing digits (last 3 to 8 digits, e.g. 6238 in Z12346238 or ***-6238)
  const digitsMatch = clean.match(/(\d{3,8})\b/);
  if (digitsMatch) {
    return digitsMatch[1].slice(-4);
  }
  // Strip leading mask characters (*, •, -, ., spaces, or leading XXXX masks)
  const stripped = clean.replace(/^[\s*•.xX-]+/, '').replace(/[\s*•.-]+/g, '');
  if (stripped.length >= 4) {
    return stripped.slice(-4).toUpperCase();
  }
  return stripped.toUpperCase() || 'unknown';
}

/** Normalise a masked account string: extracts the authoritative trailing suffix. */
export function normaliseMask(mask: string): string {
  return extractAccountSuffix(mask);
}

export function normaliseInstitution(inst: string): string {
  if (!inst) return 'unknown';
  const clean = inst.trim().toLowerCase().replace(/\b(investments|brokerage|securities|corp|inc|llc)\b/g, '').trim();
  return clean || inst.trim().toLowerCase();
}

/** Deterministic account document id: md5(uid + institution + maskedAccount). */
export function accountIdFor(uid: string, institution: string, maskedAccount: string): string {
  return md5(`${uid}|${normaliseInstitution(institution)}|${normaliseMask(maskedAccount)}`);
}
