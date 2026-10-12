export interface FilenameMetadata {
  institution?: 'Fidelity' | 'Charles Schwab' | 'Citi' | 'WeBull' | 'Generic';
  accountType?:
    | 'Brokerage'
    | '401(k)'
    | 'Roth IRA'
    | 'Traditional IRA'
    | 'Crypto'
    | 'Living Trust'
    | 'Checking'
    | 'Savings'
    | 'Certificate of Deposit'
    | 'BrokerageLink'
    | 'Individual Cash'
    | 'Rollover IRA';
  accountRaw?: string;
  accountSuffix?: string;
  asOfDate?: string; // YYYY-MM-DD
  imageSeq?: string;
}

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * Extracts institution, account type, account number/suffix, sequence, and as-of date
 * from standard brokerage export filenames and screenshots.
 */
export function parseFilenameMetadata(fileName: string): FilenameMetadata {
  const meta: FilenameMetadata = {};
  if (!fileName) return meta;

  const baseName = fileName.replace(/\.[^/.]+$/, ''); // Strip extension

  // 1. Extract Date
  // Pattern A: Oct-07-2026, Oct_07_2026, Oct-06-2026, Oct 07 2026
  const textDateMatch = baseName.match(
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[-_ ](\d{1,2})[-_ ](\d{4})/i
  );
  let isoMatch: RegExpMatchArray | null = null;
  let usMatch: RegExpMatchArray | null = null;

  if (textDateMatch) {
    const month = MONTH_MAP[textDateMatch[1].toLowerCase()];
    const day = textDateMatch[2].padStart(2, '0');
    const year = textDateMatch[3];
    meta.asOfDate = `${year}-${month}-${day}`;
  } else {
    // Pattern B: ISO / Compact: 2026-10-07, 2026_10_07, 20261007, IMG_6696.20261007
    isoMatch = baseName.match(/(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})/);
    // Pattern C: US format: 10_07_2026, 10-07-2026
    usMatch = baseName.match(/(\d{2})[-_](\d{2})[-_](20\d{2})/);
    if (isoMatch) {
      meta.asOfDate = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    } else if (usMatch) {
      meta.asOfDate = `${usMatch[3]}-${usMatch[1]}-${usMatch[2]}`;
    }
  }

  // 2. Extract Institution
  if (/fidelity/i.test(baseName)) {
    meta.institution = 'Fidelity';
  } else if (/schwab/i.test(baseName)) {
    meta.institution = 'Charles Schwab';
  } else if (/citi/i.test(baseName)) {
    meta.institution = 'Citi';
  } else if (/webull/i.test(baseName)) {
    meta.institution = 'WeBull';
  }

  // 3. Extract Image Sequence (for multi-screenshot stitching)
  const imgSeqMatch = baseName.match(/(IMG[-_]?\d{3,6})/i);
  if (imgSeqMatch) {
    meta.imageSeq = imgSeqMatch[1].toUpperCase();
  }

  // 4. Extract Account Type
  if (/brokeragelink/i.test(baseName)) {
    meta.accountType = 'BrokerageLink';
  } else if (/401k|401\(k\)/i.test(baseName)) {
    meta.accountType = '401(k)';
  } else if (/living\s*trust/i.test(baseName)) {
    meta.accountType = 'Living Trust';
  } else if (/individual[-_ ]cash/i.test(baseName)) {
    meta.accountType = 'Individual Cash';
  } else if (/rollover[-_ ]ira/i.test(baseName)) {
    meta.accountType = 'Rollover IRA';
  } else if (/rollover/i.test(baseName)) {
    meta.accountType = 'Rollover IRA';
  } else if (/roth/i.test(baseName)) {
    meta.accountType = 'Roth IRA';
  } else if (/crypto/i.test(baseName)) {
    meta.accountType = 'Crypto';
  } else if (/ira/i.test(baseName)) {
    meta.accountType = 'Traditional IRA';
  } else if (/(?:^|[-_ ])(?:cd|certificate[-_ ]of[-_ ]deposit|time[-_ ]deposit)(?:[-_ ]|$)/i.test(baseName)) {
    meta.accountType = 'Certificate of Deposit';
  } else if (/checking/i.test(baseName)) {
    meta.accountType = 'Checking';
  } else if (/savings/i.test(baseName)) {
    meta.accountType = 'Savings';
  } else if (/brokerage|individual/i.test(baseName)) {
    meta.accountType = 'Brokerage';
  }

  // 5. Extract Account Raw & Suffix
  // Strip recognized date and image sequence so they are never mistakenly parsed as account numbers
  let searchStr = baseName;
  if (textDateMatch) searchStr = searchStr.replace(textDateMatch[0], '');
  if (isoMatch) searchStr = searchStr.replace(isoMatch[0], '');
  if (usMatch) searchStr = searchStr.replace(usMatch[0], '');
  if (imgSeqMatch) searchStr = searchStr.replace(imgSeqMatch[0], '');

  // Handle Schwab ellipses style: "... 281" or "...673"
  const dotsMatch = searchStr.match(/\.{2,}\s*(\d{3,4})/);
  if (dotsMatch) {
    const raw = dotsMatch[1];
    meta.accountRaw = raw;
    meta.accountSuffix = raw.padStart(4, '0');
  } else {
    // Handle Citi style: CZ5009836
    const citiMatch = searchStr.match(/(CZ\d{5,10})/i);
    if (citiMatch) {
      meta.accountRaw = citiMatch[1];
      meta.accountSuffix = citiMatch[1].slice(-4);
    } else {
      // Handle WeBull style: CUX5XLW4, CVS8QSX4
      const webullMatch = searchStr.match(/(C[UV][A-Za-z0-9]{6,8})/i);
      if (webullMatch) {
        meta.accountRaw = webullMatch[1].toUpperCase();
        meta.accountSuffix = webullMatch[1].slice(-4).toUpperCase();
        if (!meta.institution) {
          meta.institution = 'WeBull'; // Inferred from WeBull account structure
        }
      } else {
        // Handle explicit CD or banking account labels: CD_3703, CD-3703, Acct_3703, Checking_5850, Savings_6957
        const bankingPrefixMatch = searchStr.match(/(?:CD|Certificate[-_ ]?of[-_ ]?Deposit|Acct|Account|Checking|Savings)[-_ ]+(\d{3,6})/i);
        if (bankingPrefixMatch) {
          const raw = bankingPrefixMatch[1];
          meta.accountRaw = raw;
          meta.accountSuffix = raw.padStart(4, '0');
        } else {
          // Handle Fidelity style: X24336238, 652716847, 35004, 32480, 7536801059
          const standardAcctMatch = searchStr.match(/([X|Z]?\d{5,10})/i);
          if (standardAcctMatch) {
            meta.accountRaw = standardAcctMatch[1];
            meta.accountSuffix = standardAcctMatch[1].replace(/\D/g, '').slice(-4).padStart(4, '0');
          } else {
            // Handle standalone 3- to 6-digit numeric tokens that are not 4-digit years (e.g. 3703)
            const tokenMatch = searchStr.match(/(?:^|[-_ ])(\d{3,6})(?:[-_ ]|$)/);
            if (tokenMatch && !/^(?:202\d|203\d)$/.test(tokenMatch[1])) {
              const raw = tokenMatch[1];
              meta.accountRaw = raw;
              meta.accountSuffix = raw.padStart(4, '0');
            }
          }
        }
      }
    }
  }

  return meta;
}
