/**
 * Dynamic Multi-Timezone & Travel Intelligence Engine
 * Location: src/lib/utils/timezone.ts
 *
 * Implements IANA timezone detection, metadata resolution,
 * regional financial hub grouping, and offset calculations.
 */

export interface TimezoneMetadata {
  iana: string;
  shortCode: string;
  genericShortCode: string;
  friendlyName: string;
  label: string;
  city: string;
  region: 'Americas' | 'Asia-Pacific' | 'Europe' | 'Other';
  offsetString: string;
  offsetMinutes: number;
  offsetHours: number;
}

export interface GroupedTimezoneOption {
  region: string;
  zones: {
    iana: string;
    city: string;
    shortCode: string;
    label: string;
  }[];
}

/**
 * Returns the browser's current local device timezone.
 * Falls back to 'America/Los_Angeles' (San Francisco) in headless/SSR environments.
 */
export function getDeviceTimezone(): string {
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
      const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (resolved && resolved.trim()) return resolved.trim();
    }
  } catch (_) {}
  return 'America/Los_Angeles';
}

/**
 * Normalizes short codes for display (e.g. PST/PDT -> PT, EST/EDT -> ET, CST/CDT -> CT, GMT+8 -> HKT/SGT).
 */
export function getGenericShortCode(tzCode: string, iana: string): string {
  const upper = tzCode.toUpperCase();
  if (iana === 'Asia/Hong_Kong') return 'HKT';
  if (iana === 'Asia/Singapore') return 'SGT';
  if (iana === 'Asia/Tokyo') return 'JST';
  if (iana === 'Asia/Seoul') return 'KST';
  if (iana === 'Europe/London') return (upper === 'BST' || upper === 'GMT+1') ? 'BST' : 'GMT';
  if (upper === 'PST' || upper === 'PDT') return 'PT';
  if (upper === 'EST' || upper === 'EDT') return 'ET';
  if (upper === 'CST' || upper === 'CDT') {
    if (iana.startsWith('America/')) return 'CT';
    if (iana.includes('Hong_Kong') || iana.includes('Shanghai') || iana.includes('Taipei')) return 'HKT/CST';
  }
  if (upper === 'MST' || upper === 'MDT') return 'MT';
  if (upper === 'GMT' || upper === 'BST') return 'UK';
  if (upper === 'CET' || upper === 'CEST') return 'CET';
  return upper;
}

/**
 * Curated list of major financial and metropolitan hubs.
 */
export const MAJOR_FINANCIAL_TIMEZONES: GroupedTimezoneOption[] = [
  {
    region: 'Americas (US Markets)',
    zones: [
      { iana: 'America/Los_Angeles', city: 'San Francisco / Los Angeles', shortCode: 'PT', label: 'San Francisco / Los Angeles (PT)' },
      { iana: 'America/New_York', city: 'New York / Wall Street', shortCode: 'ET', label: 'New York / Wall Street (ET)' },
      { iana: 'America/Chicago', city: 'Chicago / CME', shortCode: 'CT', label: 'Chicago / CME (CT)' },
      { iana: 'America/Denver', city: 'Denver / Mountain', shortCode: 'MT', label: 'Denver / Mountain (MT)' },
      { iana: 'Pacific/Honolulu', city: 'Honolulu', shortCode: 'HST', label: 'Honolulu (HST)' },
    ],
  },
  {
    region: 'Asia-Pacific (Frequent Travel Hubs)',
    zones: [
      { iana: 'Asia/Hong_Kong', city: 'Hong Kong', shortCode: 'HKT', label: 'Hong Kong (HKT, UTC+8)' },
      { iana: 'Asia/Singapore', city: 'Singapore', shortCode: 'SGT', label: 'Singapore (SGT, UTC+8)' },
      { iana: 'Asia/Shanghai', city: 'Shanghai / Beijing', shortCode: 'CST', label: 'Shanghai / Beijing (CST, UTC+8)' },
      { iana: 'Asia/Tokyo', city: 'Tokyo', shortCode: 'JST', label: 'Tokyo (JST, UTC+9)' },
      { iana: 'Asia/Taipei', city: 'Taipei', shortCode: 'CST', label: 'Taipei (CST, UTC+8)' },
      { iana: 'Asia/Seoul', city: 'Seoul', shortCode: 'KST', label: 'Seoul (KST, UTC+9)' },
      { iana: 'Australia/Sydney', city: 'Sydney', shortCode: 'AEST', label: 'Sydney (AEST/AEDT)' },
    ],
  },
  {
    region: 'Europe (Financial Centers)',
    zones: [
      { iana: 'Europe/London', city: 'London / LSE', shortCode: 'GMT/BST', label: 'London / LSE (GMT/BST)' },
      { iana: 'Europe/Frankfurt', city: 'Frankfurt / Deutsche Börse', shortCode: 'CET', label: 'Frankfurt (CET/CEST)' },
      { iana: 'Europe/Paris', city: 'Paris / Euronext', shortCode: 'CET', label: 'Paris (CET/CEST)' },
      { iana: 'Europe/Zurich', city: 'Zurich / SIX', shortCode: 'CET', label: 'Zurich (CET/CEST)' },
    ],
  },
];

/**
 * Resolves full metadata for an IANA timezone identifier at a specific Date.
 */
export function getTimezoneMetadata(iana: string, date: Date = new Date()): TimezoneMetadata {
  let shortCode = 'UTC';
  let offsetMinutes = 0;
  let offsetString = 'UTC+0';

  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      timeZoneName: 'short',
    });
    const parts = fmt.formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    if (tzPart && tzPart.value) {
      shortCode = tzPart.value;
    }

    // Determine UTC offset accurately
    const targetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const targetParts = targetFormatter.formatToParts(date);
    const map: Record<string, number> = {};
    for (const p of targetParts) {
      if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10);
    }

    const targetInUtcRepresentation = Date.UTC(
      map.year || 2026,
      (map.month || 1) - 1,
      map.day || 1,
      map.hour === 24 ? 0 : map.hour || 0,
      map.minute || 0,
      map.second || 0
    );

    const diffMs = targetInUtcRepresentation - date.getTime();
    offsetMinutes = Math.round(diffMs / 60000);

    const totalMinutes = Math.abs(offsetMinutes);
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    offsetString = mins === 0 ? `UTC${sign}${hours}` : `UTC${sign}${hours}:${String(mins).padStart(2, '0')}`;
  } catch (_) {
    // Fallback if iana is invalid or unsupported
    if (iana.includes('Los_Angeles')) {
      shortCode = 'PT';
      offsetString = 'UTC-7';
      offsetMinutes = -420;
    } else if (iana.includes('Hong_Kong')) {
      shortCode = 'HKT';
      offsetString = 'UTC+8';
      offsetMinutes = 480;
    }
  }

  // Find curated entry for nice city / label
  let city = iana.split('/').pop()?.replace(/_/g, ' ') || iana;
  let region: TimezoneMetadata['region'] = 'Other';

  for (const group of MAJOR_FINANCIAL_TIMEZONES) {
    const match = group.zones.find((z) => z.iana === iana);
    if (match) {
      city = match.city;
      if (group.region.includes('Americas')) region = 'Americas';
      else if (group.region.includes('Asia')) region = 'Asia-Pacific';
      else if (group.region.includes('Europe')) region = 'Europe';
      break;
    }
  }

  const genericShortCode = getGenericShortCode(shortCode, iana);
  const friendlyName = `${city} (${genericShortCode}, ${offsetString})`;

  return {
    iana,
    shortCode: genericShortCode,
    genericShortCode,
    friendlyName,
    label: friendlyName,
    city,
    region,
    offsetString,
    offsetMinutes,
    offsetHours: offsetMinutes / 60,
  };
}
