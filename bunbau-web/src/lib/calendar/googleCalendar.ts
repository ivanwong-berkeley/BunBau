/**
 * Google Calendar & Smart Scheduling Engine
 * Location: src/lib/calendar/googleCalendar.ts
 *
 * Implements:
 * 1. Dynamic multi-timezone 4-tier action slots for urgent options (9 AM, 12 PM, 5 PM today, or 7 AM tomorrow).
 * 2. Dynamic 9:00 AM maturity scheduling for CDs & Treasuries with 7-day prior reminder alarms in the selected timezone.
 * 3. 1-Click Google Calendar URLs with dynamic ctz parameter and RFC 5545 .ics calendar generation.
 * 4. Persistent local storage synchronization tracking to prevent duplicate submissions.
 */

import { CalendarTimelineEvent, CanonicalAccount } from '../portfolio/types';
import { getTimezoneMetadata, getDeviceTimezone, TimezoneMetadata } from '../utils/timezone';

export interface OptionsActionSlot {
  startDate: Date;
  endDate: Date;
  startIsoUtc: string;
  endIsoUtc: string;
  slotLabel: string;
  timeLabel: string;
  isToday: boolean;
  timezone: string;
  timezoneShort: string;
  shortCode: string;
  timezoneFriendly: string;
}

export interface CdMaturitySlot {
  startDate: Date;
  endDate: Date;
  startIsoUtc: string;
  endIsoUtc: string;
  dateStr: string;
  reminderDateStr: string;
  timezone: string;
  timezoneShort: string;
  shortCode: string;
  timezoneFriendly: string;
}

/**
 * Format a Date to UTC basic ISO string (YYYYMMDDTHHmmssZ) required by Google Calendar URL.
 */
export function toGoogleUtcIso(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Accurately calculates the immediate action slot in the specified target timezone:
 * - If current hour in targetTz < 9:00 AM  -> Today 9:00 AM - 9:30 AM
 * - If current hour in targetTz < 12:00 PM -> Today 12:00 PM - 12:30 PM
 * - If current hour in targetTz < 5:00 PM  -> Today 5:00 PM - 5:30 PM
 * - Else (after 5:00 PM)                   -> Tomorrow 7:00 AM - 7:30 AM
 */
export function getImmediateOptionsActionSlot(
  now: Date = new Date(),
  targetTz: string = 'America/Los_Angeles'
): OptionsActionSlot {
  const tzMeta = getTimezoneMetadata(targetTz, now);
  const tzShort = tzMeta.genericShortCode;

  // Extract current date & time components in the target timezone
  const targetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: targetTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = targetFormatter.formatToParts(now);
  const partMap: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') partMap[p.type] = parseInt(p.value, 10);
  }

  const year = partMap.year || now.getUTCFullYear();
  const month = (partMap.month || 1) - 1;
  const date = partMap.day || now.getUTCDate();
  const hours = partMap.hour === 24 ? 0 : (partMap.hour || 0);
  const minutes = partMap.minute || 0;
  const currentMinuteOfDay = hours * 60 + minutes;

  let targetYear = year;
  let targetMonth = month;
  let targetDate = date;
  let targetHour = 9;
  let targetMinute = 0;
  let slotLabel = `Today @ 9:00 AM ${tzShort}`;
  let timeLabel = `9:00 AM – 9:30 AM ${tzShort}`;
  let isToday = true;

  if (currentMinuteOfDay < 9 * 60) {
    targetHour = 9;
    slotLabel = `Today @ 9:00 AM ${tzShort}`;
    timeLabel = `9:00 AM – 9:30 AM ${tzShort}`;
  } else if (currentMinuteOfDay < 12 * 60) {
    targetHour = 12;
    slotLabel = `Today @ 12:00 PM (Noon) ${tzShort}`;
    timeLabel = `12:00 PM – 12:30 PM ${tzShort}`;
  } else if (currentMinuteOfDay < 17 * 60) {
    targetHour = 17;
    slotLabel = `Today @ 5:00 PM ${tzShort}`;
    timeLabel = `5:00 PM – 5:30 PM ${tzShort}`;
  } else {
    // Tomorrow 7:00 AM in target timezone
    // Add 24 hours to find tomorrow's calendar date components in targetTz
    const tomorrowRef = new Date(Date.UTC(year, month, date + 1, 12, 0, 0));
    const tomorrowParts = targetFormatter.formatToParts(tomorrowRef);
    const tmMap: Record<string, number> = {};
    for (const p of tomorrowParts) {
      if (p.type !== 'literal') tmMap[p.type] = parseInt(p.value, 10);
    }
    targetYear = tmMap.year || year;
    targetMonth = (tmMap.month || 1) - 1;
    targetDate = tmMap.day || date + 1;
    targetHour = 7;
    slotLabel = `Tomorrow @ 7:00 AM ${tzShort}`;
    timeLabel = `7:00 AM – 7:30 AM ${tzShort}`;
    isToday = false;
  }

  // Accurately convert the target (year, month, date, targetHour, targetMinute) in targetTz to UTC Date
  const approxUtc = new Date(Date.UTC(targetYear, targetMonth, targetDate, targetHour, targetMinute, 0));
  const slotMeta = getTimezoneMetadata(targetTz, approxUtc);
  const startUtc = new Date(approxUtc.getTime() - slotMeta.offsetMinutes * 60 * 1000);
  const endUtc = new Date(startUtc.getTime() + 30 * 60 * 1000);

  return {
    startDate: startUtc,
    endDate: endUtc,
    startIsoUtc: toGoogleUtcIso(startUtc),
    endIsoUtc: toGoogleUtcIso(endUtc),
    slotLabel,
    timeLabel,
    isToday,
    timezone: targetTz,
    timezoneShort: tzShort,
    shortCode: tzShort,
    timezoneFriendly: tzMeta.friendlyName,
  };
}

/**
 * Calculates 9:00 AM – 9:30 AM slot for CD & Treasury maturity date in the target timezone.
 */
export function getCdMaturitySlot(
  dateStr: string,
  targetTz: string = 'America/Los_Angeles'
): CdMaturitySlot {
  const cleanDate = dateStr.slice(0, 10);
  const parts = cleanDate.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  const approxUtc = new Date(Date.UTC(y, m, d, 9, 0, 0));
  const tzMeta = getTimezoneMetadata(targetTz, approxUtc);
  const startUtc = new Date(approxUtc.getTime() - tzMeta.offsetMinutes * 60 * 1000);
  const endUtc = new Date(startUtc.getTime() + 30 * 60 * 1000);

  const reminderDate = new Date(startUtc.getTime() - 7 * 24 * 3600 * 1000);
  const reminderDateStr = reminderDate.toISOString().slice(0, 10);

  return {
    startDate: startUtc,
    endDate: endUtc,
    startIsoUtc: toGoogleUtcIso(startUtc),
    endIsoUtc: toGoogleUtcIso(endUtc),
    dateStr: cleanDate,
    reminderDateStr,
    timezone: targetTz,
    timezoneShort: tzMeta.genericShortCode,
    shortCode: tzMeta.genericShortCode,
    timezoneFriendly: tzMeta.friendlyName,
  };
}

/**
 * Resolves account name & masked number from parent CanonicalAccount or position metadata.
 */
export function resolveAccountInfo(event: CalendarTimelineEvent, accounts?: CanonicalAccount[]): string {
  const accId = event.position?.accountId;
  const matched = accounts?.find((a) => a.id === accId);
  if (matched) {
    const name = matched.accountType || matched.institution;
    const num = matched.maskedAccount || '';
    return num ? `${name} (${num})` : name;
  }
  return '';
}

/**
 * Generates the 1-click Google Calendar Web URL for CD & Treasury maturity (9:00 AM in target timezone).
 */
export function buildCdMaturityCalendarUrl(
  event: CalendarTimelineEvent,
  accountInfo?: string,
  targetTz: string = 'America/Los_Angeles'
): string {
  const slot = getCdMaturitySlot(event.date, targetTz);
  const inst = event.institution || 'Brokerage';
  const accLabel = accountInfo ? ` - ${inst} (${accountInfo})` : ` - ${inst}`;
  const title = `BunBau: ${event.name || event.symbol} Maturity${accLabel}`;

  const details = [
    `🏦 BunBau Portfolio Intelligence: Fixed Income Maturity Notification`,
    ``,
    `• Instrument: ${event.name || event.symbol}`,
    `• CUSIP / Ticker: ${event.symbol}`,
    `• Category: ${event.eventType === 'CD' ? 'Brokered Certificate of Deposit (CD)' : 'US Treasury Bill'}`,
    `• Stated APY / Yield: ${event.apy ? `${event.apy}% APY` : 'N/A'}`,
    `• Principal Value: $${Math.abs(event.marketValue).toLocaleString()}`,
    `• Institution: ${event.institution}`,
    `• Account: ${accountInfo || 'Portfolio Account'}`,
    `• Maturity Date: ${event.date}`,
    `• Scheduled Time: 9:00 AM – 9:30 AM ${slot.timezoneShort} (${slot.timezoneFriendly})`,
    ``,
    `⚡ Reinvestment Actions:`,
    `1. Review prevailing yields on BunBau Fixed Income Ledger.`,
    `2. Reinvest principal into new high-yield certificate or let sweep to cash.`,
    `3. Verify principal settlement in account.`,
    ``,
    `Generated automatically by BunBau Personal Portfolio Intelligence.`,
  ].join('\n');

  const base = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${slot.startIsoUtc}/${slot.endIsoUtc}`,
    ctz: targetTz,
    details,
  });

  return `${base}?${params.toString()}`;
}

/**
 * Generates the 1-click Google Calendar Web URL for Urgent Options (Immediate Action Slot in target timezone).
 */
export function buildOptionsImmediateCalendarUrl(
  event: CalendarTimelineEvent,
  slot: OptionsActionSlot,
  accountInfo?: string,
  targetTz: string = 'America/Los_Angeles'
): string {
  const inst = event.institution || 'Brokerage';
  const accLabel = accountInfo ? ` - ${inst} (${accountInfo})` : ` - ${inst}`;
  const title = `BunBau: IMMEDIATE ACTION - ${event.symbol} ${event.eventType} ($${event.strike?.toFixed(2) || 'Strike'})${accLabel}`;

  const details = [
    `🚨 BunBau Portfolio Intelligence: Urgent Option Assignment Risk Alert`,
    ``,
    `• Contract: ${event.symbol} (${event.eventType})`,
    `• Underlying: ${event.underlying || event.symbol} ($${event.marketPrice?.toFixed(2) || 'Pending'})`,
    `• Strike Price: $${event.strike ? event.strike.toFixed(2) : 'N/A'}`,
    `• Buffer Cushion: ${
      event.moneynessPct !== undefined
        ? event.isItm
          ? `ITM (${event.moneynessPct}%)`
          : `+${event.moneynessPct}%`
        : 'N/A'
    }`,
    `• Days to Expiration: ${event.daysRemaining}d left (Expires: ${event.date})`,
    `• Institution: ${event.institution}`,
    `• Account: ${accountInfo || 'Portfolio Account'}`,
    `• Collateral Locked: ${
      event.collateralLocked
        ? `$${event.collateralLocked.toLocaleString()} cash`
        : `${(event.contracts || 1) * 100} shares locked`
    }`,
    `• Immediate Review Time: ${slot.slotLabel} (${slot.timezoneFriendly})`,
    ``,
    `⚡ Immediate Review Checklist:`,
    `1. Evaluate underlying stock momentum vs strike price.`,
    `2. Decide defense action: Roll up/out, Buy to close, or accept assignment.`,
    `3. Prepare liquid cash if assignment expected.`,
    ``,
    `Generated automatically by BunBau Personal Portfolio Intelligence.`,
  ].join('\n');

  const base = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${slot.startIsoUtc}/${slot.endIsoUtc}`,
    ctz: targetTz,
    details,
  });

  return `${base}?${params.toString()}`;
}

/**
 * Generates an RFC 5545 compliant .ics iCalendar file for bulk Google Calendar / Apple Calendar import.
 */
export function generateIcsCalendar(
  events: CalendarTimelineEvent[],
  mode: 'fixed-income' | 'urgent-options',
  accounts?: CanonicalAccount[],
  optionsSlot?: OptionsActionSlot,
  targetTz: string = 'America/Los_Angeles'
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BunBau//Personal Portfolio Intelligence//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:BunBau Portfolio Reminders',
    `X-WR-TIMEZONE:${targetTz}`,
  ];

  const nowSlot = optionsSlot || getImmediateOptionsActionSlot(new Date(), targetTz);

  for (const evt of events) {
    const accInfo = resolveAccountInfo(evt, accounts);
    const uid = `bunbau-${evt.id.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}@bunbau.app`;

    if (mode === 'fixed-income') {
      const slot = getCdMaturitySlot(evt.date, targetTz);
      const title = `BunBau: ${evt.name || evt.symbol} Maturity - ${evt.institution}${accInfo ? ` (${accInfo})` : ''}`;
      const desc = `BunBau Maturity Notification\\nInstrument: ${evt.name}\\nAPY: ${evt.apy || 0}%\\nPrincipal: $${Math.abs(evt.marketValue)}\\nAccount: ${accInfo || evt.institution}`;

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${toGoogleUtcIso(new Date())}`,
        `DTSTART:${slot.startIsoUtc}`,
        `DTEND:${slot.endIsoUtc}`,
        `SUMMARY:${title.replace(/[,;]/g, ' ')}`,
        `DESCRIPTION:${desc}`,
        'STATUS:CONFIRMED',
        // 7-day prior reminder alarm
        'BEGIN:VALARM',
        'TRIGGER:-P7D',
        'ACTION:DISPLAY',
        `DESCRIPTION:Reminder: ${evt.name || evt.symbol} matures in 7 days (${evt.institution})`,
        'END:VALARM',
        // Day-of reminder alarm at 9:00 AM
        'BEGIN:VALARM',
        'TRIGGER:-PT0M',
        'ACTION:DISPLAY',
        `DESCRIPTION:Today: ${evt.name || evt.symbol} certificate maturity settlement`,
        'END:VALARM',
        'END:VEVENT'
      );
    } else {
      const title = `BunBau: IMMEDIATE ACTION - ${evt.symbol} ${evt.eventType} ($${evt.strike || 'Strike'}) - ${evt.institution}${accInfo ? ` (${accInfo})` : ''}`;
      const desc = `BunBau Urgent Option Alert\\nContract: ${evt.symbol}\\nBuffer Cushion: ${evt.moneynessPct ?? 0}%\\nExpires: ${evt.date}\\nAccount: ${accInfo || evt.institution}`;

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${toGoogleUtcIso(new Date())}`,
        `DTSTART:${nowSlot.startIsoUtc}`,
        `DTEND:${nowSlot.endIsoUtc}`,
        `SUMMARY:${title.replace(/[,;]/g, ' ')}`,
        `DESCRIPTION:${desc}`,
        'STATUS:CONFIRMED',
        // 15-minute prior alarm for immediate review
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'ACTION:DISPLAY',
        `DESCRIPTION:Immediate Action Required: ${evt.symbol} option assignment defense review`,
        'END:VALARM',
        'END:VEVENT'
      );
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Downloads the .ics calendar file to user's computer.
 */
export function downloadIcsFile(filename: string, icsContent: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Local storage persistent synchronization tracking to prevent duplicate submissions.
 */
const SYNC_STORAGE_PREFIX = 'bunbau_synced_calendar_events_';

export function getSyncedEventIds(userId: string = 'default'): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(`${SYNC_STORAGE_PREFIX}${userId}`);
    if (raw) {
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    }
  } catch (_) {}
  return new Set();
}

export function markEventSynced(eventId: string, userId: string = 'default'): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const current = getSyncedEventIds(userId);
    current.add(eventId);
    localStorage.setItem(`${SYNC_STORAGE_PREFIX}${userId}`, JSON.stringify(Array.from(current)));
  } catch (_) {}
}

export function isEventSynced(eventId: string, userId: string = 'default'): boolean {
  return getSyncedEventIds(userId).has(eventId);
}
