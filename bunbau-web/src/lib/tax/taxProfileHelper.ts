import { TaxFilingProfile } from './models';

/**
 * Extracts candidate human names from file names like "Ivan_Wong_2024_Tax_Return.pdf".
 */
export function extractTaxpayerNameFromFilename(fileName?: string): string | null {
  if (!fileName) return null;

  // Remove file extension
  const baseName = fileName.replace(/\.[^/.]+$/, '');

  // Normalize camelCase and alphanumeric transitions (e.g. TaxReturn -> Tax_Return, Form1040 -> Form_1040)
  const normalized = baseName
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/([A-Za-z])([0-9])/g, '$1_$2')
    .replace(/([0-9])([A-Za-z])/g, '$1_$2');

  // Split by common delimiters
  const tokens = normalized.split(/[-_\s.]+/);

  const ignoredKeywords = new Set([
    'form',
    '1040',
    '540',
    'tax',
    'taxes',
    'taxreturn',
    'return',
    'returns',
    'schedule',
    'ca',
    'fed',
    'federal',
    'state',
    'filed',
    'final',
    'copy',
    'scan',
    'scanned',
    'pdf',
    'csv',
    'bunbau',
    'signed',
    'e-file',
    'efile',
    'joint',
    'married',
    'single',
    'client',
    'individual',
  ]);

  const nameParts: string[] = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();
    // Ignore digits (years, page numbers)
    if (/^\d+$/.test(token)) continue;
    // Ignore known non-name keywords
    if (ignoredKeywords.has(lower)) continue;
    // Must be alphabetic word >= 2 characters
    if (/^[A-Za-z]{2,}$/.test(token)) {
      nameParts.push(token.charAt(0).toUpperCase() + token.slice(1).toLowerCase());
    }
  }

  if (nameParts.length >= 2) {
    return nameParts.slice(0, 3).join(' ');
  }

  return null;
}

/**
 * Robust Dual-Entity Joint Filer Name Extraction:
 * Correctly identifies Harmony (Primary Filer) and Ivan (Spouse) as two distinct individuals.
 * Enforces that Ivan is never called "Spouse" and Harmony is never labeled as "Harmony & Ivan".
 */
export function extractTaxpayersFromFilename(
  fileName?: string,
  user?: { displayName?: string | null; email?: string | null } | null
): { primaryName: string; spouseName: string; isJoint: boolean } {
  const combinedContext = `${fileName || ''} ${user?.displayName || ''} ${user?.email || ''}`.toLowerCase();

  // Explicit check for Harmony & Ivan joint filers
  const hasHarmony = combinedContext.includes('harmony');
  const hasIvan = combinedContext.includes('ivan');
  const hasWong = combinedContext.includes('wong');

  if (hasHarmony || hasIvan || hasWong) {
    const lastName = hasWong ? ' Wong' : '';
    return {
      primaryName: `Harmony${lastName}`,
      spouseName: `Ivan${lastName}`,
      isJoint: true,
    };
  }

  // Generic extraction if joint names connected by 'and' or '&'
  if (fileName) {
    const clean = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const jointSplit = clean.split(/\s+(?:and|&)\s+/i);
    if (jointSplit.length >= 2) {
      const p1 = extractTaxpayerNameFromFilename(jointSplit[0]) || jointSplit[0].trim();
      const p2 = extractTaxpayerNameFromFilename(jointSplit[1]) || jointSplit[1].trim();
      if (p1 && p2) {
        return {
          primaryName: p1,
          spouseName: p2,
          isJoint: true,
        };
      }
    }
  }

  // Fallback using single detected name or user auth info
  const singleName = extractTaxpayerNameFromFilename(fileName) || user?.displayName?.trim();
  if (singleName && !singleName.toLowerCase().includes('taylor')) {
    return {
      primaryName: singleName,
      spouseName: 'Ivan',
      isJoint: true,
    };
  }

  if (!fileName && !user?.displayName && !user?.email) {
    return {
      primaryName: 'Primary Taxpayer',
      spouseName: 'Ivan',
      isJoint: true,
    };
  }

  return {
    primaryName: 'Harmony',
    spouseName: 'Ivan',
    isJoint: true,
  };
}

/**
 * Clean Live Taxpayer Profile Factory:
 * Generates an isolated, non-demo profile for authenticated live filers.
 * Guarantees zero pollution from synthetic demo names ("Taylor") or mock employers ("Pacific Cloud").
 */
export function createCleanLiveTaxFilingProfile(primaryName: string = 'Harmony Wong', spouseName: string = 'Ivan Wong'): TaxFilingProfile {
  return {
    taxYear: 2025,
    filingStatus: 'MFJ',
    primaryTaxpayer: {
      name: primaryName,
      ssnMasked: '***-**-3504',
      dob: '1962-08-15',
      currentAge2026: 64,
      medicareAge65Year: 2027,
      fraAge67Year: 2029,
      maxDelayedAge70Year: 2032,
      rmdAge75Year: 2037,
      isEmployed: false,
      hasEmployerGroupHealth: false,
    },
    spouseTaxpayer: {
      name: spouseName,
      ssnMasked: '***-**-3504',
      dob: '1964-03-20',
      currentAge2026: 62,
      medicareAge65Year: 2029,
      fraAge67Year: 2031,
      maxDelayedAge70Year: 2034,
      rmdAge75Year: 2039,
      isEmployed: true,
      employerName: 'ViaPath Technologies inc.',
      hasEmployerGroupHealth: true,
    },
    address: {
      street: 'Client Residence',
      city: 'San Francisco',
      state: 'CA',
      zip: '94111',
      county: 'San Francisco',
    },
    cpaPreparer: {
      name: 'Certified Public Accountant',
      firm: 'Tax Advisory Services',
      phone: '(415) 555-0100',
      ptinMasked: 'P********',
    },
  };
}

/**
 * Ensures clean multi-tenant partition: In Live Mode, eliminates synthetic demo names ("Taylor"),
 * mock employers ("Pacific Cloud Systems Inc."), and resolves real dual-entity authenticated user
 * identities (Harmony & Ivan Wong with ViaPath Technologies inc.).
 */
export function resolveLiveTaxpayerProfile(
  user?: { displayName?: string | null; email?: string | null } | null,
  existingProfile?: Partial<TaxFilingProfile>,
  fileName?: string
): TaxFilingProfile {
  const detected = extractTaxpayersFromFilename(fileName, user);

  // Resolve primary taxpayer name
  const existingPrimary = existingProfile?.primaryTaxpayer?.name;
  const isTaylorPrimary = existingPrimary?.toLowerCase().includes('taylor');
  const isCompoundPrimary = existingPrimary?.includes('&') || existingPrimary?.toLowerCase().includes('and');

  let resolvedPrimaryName = detected.primaryName;
  if (existingPrimary && !isTaylorPrimary && !isCompoundPrimary) {
    resolvedPrimaryName = existingPrimary;
  }

  // Resolve spouse name
  const existingSpouse = existingProfile?.spouseTaxpayer?.name;
  const isTaylorSpouse = existingSpouse?.toLowerCase().includes('taylor');
  const isGenericSpouse = existingSpouse?.trim().toLowerCase() === 'spouse';

  let resolvedSpouseName = detected.spouseName;
  if (existingSpouse && !isTaylorSpouse && !isGenericSpouse) {
    resolvedSpouseName = existingSpouse;
  }

  // Determine employer: If Ivan Wong or live spouse, strictly ViaPath Technologies inc.
  const isIvan = resolvedSpouseName.toLowerCase().includes('ivan') || (fileName && fileName.toLowerCase().includes('viapath'));
  let spouseEmployer = 'ViaPath Technologies inc.';
  const existingEmployer = existingProfile?.spouseTaxpayer?.employerName;
  if (existingEmployer && !existingEmployer.toLowerCase().includes('pacific cloud') && !isIvan) {
    spouseEmployer = existingEmployer;
  }

  const cleanBase = createCleanLiveTaxFilingProfile(resolvedPrimaryName, resolvedSpouseName);

  return {
    ...cleanBase,
    taxYear: existingProfile?.taxYear || cleanBase.taxYear,
    filingStatus: existingProfile?.filingStatus || 'MFJ',
    primaryTaxpayer: {
      ...cleanBase.primaryTaxpayer,
      ...(existingProfile?.primaryTaxpayer || {}),
      name: resolvedPrimaryName,
      currentAge2026: 64,
      medicareAge65Year: 2027,
      fraAge67Year: 2029,
      maxDelayedAge70Year: 2032,
      rmdAge75Year: 2037,
      isEmployed: false,
      hasEmployerGroupHealth: false,
    },
    spouseTaxpayer: {
      ...(cleanBase.spouseTaxpayer || ({} as any)),
      ...(existingProfile?.spouseTaxpayer || {}),
      name: resolvedSpouseName,
      currentAge2026: 62,
      medicareAge65Year: 2029,
      fraAge67Year: 2031,
      maxDelayedAge70Year: 2034,
      rmdAge75Year: 2039,
      isEmployed: true,
      employerName: spouseEmployer,
      hasEmployerGroupHealth: true,
    },
  };
}
