import { describe, it, expect } from 'vitest';
import {
  getImmediateOptionsActionSlot,
  getCdMaturitySlot,
  resolveAccountInfo,
  buildCdMaturityCalendarUrl,
  buildOptionsImmediateCalendarUrl,
  generateIcsCalendar,
} from '../../../src/lib/calendar/googleCalendar';
import {
  getDeviceTimezone,
  getTimezoneMetadata,
  MAJOR_FINANCIAL_TIMEZONES,
} from '../../../src/lib/utils/timezone';
import { CalendarTimelineEvent, CanonicalAccount } from '../../../src/lib/portfolio/types';

describe('Dynamic Timezone & Travel Engine (v2.7.3)', () => {
  const sampleAccounts: CanonicalAccount[] = [
    {
      id: 'acc-fid-1',
      institution: 'Fidelity',
      accountType: 'BrokerageLink',
      maskedAccount: '652716847',
      balance: 100000,
      currency: 'USD',
      updatedAt: '2026-10-07T00:00:00Z',
    },
  ];

  const sampleCd: CalendarTimelineEvent = {
    id: 'cd-1',
    symbol: 'GOLDMAN SACHS 4.25% CD',
    name: 'Goldman Sachs Bank USA CD',
    date: '2026-11-20',
    daysRemaining: 40,
    eventType: 'CD',
    institution: 'Fidelity',
    marketValue: 25000,
    apy: 4.25,
    urgency: 'safe',
    position: {
      id: 'pos-1',
      accountId: 'acc-fid-1',
      symbol: 'GOLDMAN SACHS 4.25% CD',
      name: 'Goldman Sachs Bank USA CD',
      assetClass: 'CD',
      marketValue: 25000,
      quantity: 25,
      costBasis: 25000,
      institution: 'Fidelity',
      maturityDate: '2026-11-20',
    },
  };

  const sampleUrgentOption: CalendarTimelineEvent = {
    id: 'opt-nvda-1',
    symbol: 'NVDA $110 Put',
    name: 'NVDA Oct 24 2026 $110 Put',
    date: '2026-10-24',
    daysRemaining: 12,
    eventType: 'CSP',
    institution: 'Fidelity',
    marketValue: -320,
    strike: 110,
    marketPrice: 111.5,
    moneynessPct: 1.36,
    isItm: false,
    optionBadgeLabel: '1.4% Cushion (Urgent)',
    contracts: 2,
    collateralLocked: 22000,
    underlying: 'NVDA',
    urgency: 'urgent',
    position: {
      id: 'pos-opt-1',
      accountId: 'acc-fid-1',
      symbol: 'NVDA $110 Put',
      name: 'NVDA Oct 24 2026 $110 Put',
      assetClass: 'CSP',
      marketValue: -320,
      quantity: -2,
      costBasis: -500,
      institution: 'Fidelity',
    },
  };

  describe('1. Timezone Metadata & Financial Centers Catalog', () => {
    it('resolves San Francisco / America/Los_Angeles metadata correctly', () => {
      const meta = getTimezoneMetadata('America/Los_Angeles');
      expect(meta.iana).toBe('America/Los_Angeles');
      expect(['PT', 'PDT', 'PST']).toContain(meta.shortCode);
      expect(meta.friendlyName).toContain('San Francisco');
    });

    it('resolves Hong Kong / Asia/Hong_Kong metadata correctly', () => {
      const meta = getTimezoneMetadata('Asia/Hong_Kong');
      expect(meta.iana).toBe('Asia/Hong_Kong');
      expect(meta.shortCode).toBe('HKT');
      expect(meta.offsetString).toBe('UTC+8');
      expect(meta.friendlyName).toContain('Hong Kong');
    });

    it('resolves Singapore / Asia/Singapore metadata correctly', () => {
      const meta = getTimezoneMetadata('Asia/Singapore');
      expect(meta.iana).toBe('Asia/Singapore');
      expect(meta.shortCode).toBe('SGT');
      expect(meta.offsetString).toBe('UTC+8');
      expect(meta.friendlyName).toContain('Singapore');
    });

    it('resolves London / Europe/London metadata correctly', () => {
      const meta = getTimezoneMetadata('Europe/London');
      expect(meta.iana).toBe('Europe/London');
      expect(['GMT', 'BST']).toContain(meta.shortCode);
      expect(meta.friendlyName).toContain('London');
    });

    it('contains all required major world financial regions and hubs', () => {
      const regions = MAJOR_FINANCIAL_TIMEZONES.map((g) => g.region);
      expect(regions[0]).toContain('Americas');
      expect(regions[1]).toContain('Asia-Pacific');
      expect(regions[2]).toContain('Europe');

      const allZz = MAJOR_FINANCIAL_TIMEZONES.flatMap((g) => g.zones.map((z) => z.iana));
      expect(allZz).toContain('America/Los_Angeles');
      expect(allZz).toContain('America/New_York');
      expect(allZz).toContain('Asia/Hong_Kong');
      expect(allZz).toContain('Asia/Singapore');
      expect(allZz).toContain('Asia/Tokyo');
      expect(allZz).toContain('Europe/London');
    });
  });

  describe('2. Dynamic Cross-Timezone 4-Tier Slot Cascading', () => {
    it('calculates 9:00 AM slot in America/Los_Angeles when simulated time is early morning PT', () => {
      // 8:15 AM PDT (UTC-7) = 15:15 UTC
      const now = new Date('2026-10-12T15:15:00Z');
      const slot = getImmediateOptionsActionSlot(now, 'America/Los_Angeles');

      expect(slot.timezone).toBe('America/Los_Angeles');
      expect(slot.slotLabel).toBe('Today @ 9:00 AM PT');
      expect(slot.timeLabel).toBe('9:00 AM – 9:30 AM PT');
      expect(slot.isToday).toBe(true);
      // 9:00 AM PDT = 16:00 UTC
      expect(slot.startIsoUtc).toContain('T160000Z');
    });

    it('calculates 9:00 AM slot in Asia/Hong_Kong when simulated time is early morning HKT', () => {
      // 8:15 AM HKT (UTC+8) = 00:15 UTC
      const now = new Date('2026-10-12T00:15:00Z');
      const slot = getImmediateOptionsActionSlot(now, 'Asia/Hong_Kong');

      expect(slot.timezone).toBe('Asia/Hong_Kong');
      expect(slot.slotLabel).toBe('Today @ 9:00 AM HKT');
      expect(slot.timeLabel).toBe('9:00 AM – 9:30 AM HKT');
      expect(slot.isToday).toBe(true);
      // 9:00 AM HKT (UTC+8) = 01:00 UTC
      expect(slot.startIsoUtc).toContain('T010000Z');
      expect(slot.endIsoUtc).toContain('T013000Z');
    });

    it('cascades to 12:00 PM (Noon) in Asia/Singapore when morning 9 AM has passed in Singapore', () => {
      // 10:30 AM SGT (UTC+8) = 02:30 UTC
      const now = new Date('2026-10-12T02:30:00Z');
      const slot = getImmediateOptionsActionSlot(now, 'Asia/Singapore');

      expect(slot.timezone).toBe('Asia/Singapore');
      expect(slot.slotLabel).toBe('Today @ 12:00 PM (Noon) SGT');
      expect(slot.timeLabel).toBe('12:00 PM – 12:30 PM SGT');
      expect(slot.isToday).toBe(true);
      // 12:00 PM SGT = 04:00 UTC
      expect(slot.startIsoUtc).toContain('T040000Z');
    });

    it('cascades to 5:00 PM in Europe/London when afternoon is reached in London', () => {
      // In October (BST UTC+1), 2:30 PM BST = 13:30 UTC
      const now = new Date('2026-10-12T13:30:00Z');
      const slot = getImmediateOptionsActionSlot(now, 'Europe/London');

      expect(slot.timezone).toBe('Europe/London');
      expect(slot.slotLabel).toContain('Today @ 5:00 PM');
      expect(slot.isToday).toBe(true);
      // 5:00 PM BST (UTC+1) = 16:00 UTC
      expect(slot.startIsoUtc).toContain('T160000Z');
    });

    it('cascades to Tomorrow 7:00 AM in Tokyo when evening 5 PM has passed in Tokyo', () => {
      // 8:00 PM JST (UTC+9) on Oct 12 = 11:00 UTC on Oct 12
      const now = new Date('2026-10-12T11:00:00Z');
      const slot = getImmediateOptionsActionSlot(now, 'Asia/Tokyo');

      expect(slot.timezone).toBe('Asia/Tokyo');
      expect(slot.slotLabel).toBe('Tomorrow @ 7:00 AM JST');
      expect(slot.timeLabel).toBe('7:00 AM – 7:30 AM JST');
      expect(slot.isToday).toBe(false);
      // Tomorrow Oct 13 7:00 AM JST (UTC+9) = Oct 12 22:00 UTC
      expect(slot.startIsoUtc).toBe('20261012T220000Z');
      expect(slot.endIsoUtc).toBe('20261012T223000Z');
    });
  });

  describe('3. Dynamic CD Maturity Scheduling in Target Timezone', () => {
    it('schedules CD maturity at 9:00 AM in Hong Kong (Asia/Hong_Kong)', () => {
      const slot = getCdMaturitySlot('2026-11-20', 'Asia/Hong_Kong');

      expect(slot.timezone).toBe('Asia/Hong_Kong');
      expect(slot.shortCode).toBe('HKT');
      expect(slot.dateStr).toBe('2026-11-20');
      expect(slot.reminderDateStr).toBe('2026-11-13');
      // 9:00 AM HKT (UTC+8) = 01:00 UTC
      expect(slot.startIsoUtc).toBe('20261120T010000Z');
      expect(slot.endIsoUtc).toBe('20261120T013000Z');
    });

    it('schedules CD maturity at 9:00 AM in San Francisco (America/Los_Angeles)', () => {
      const slot = getCdMaturitySlot('2026-11-20', 'America/Los_Angeles');

      expect(slot.timezone).toBe('America/Los_Angeles');
      expect(slot.shortCode).toBe('PT');
      expect(slot.dateStr).toBe('2026-11-20');
      // In Nov (PST UTC-8), 9:00 AM PST = 17:00 UTC
      expect(slot.startIsoUtc).toBe('20261120T170000Z');
      expect(slot.endIsoUtc).toBe('20261120T173000Z');
    });
  });

  describe('4. Dynamic Google Calendar URL Generation with Explicit ctz and Timezone Notes', () => {
    it('embeds ctz=Asia%2FHong_Kong when traveling in Hong Kong', () => {
      const accInfo = resolveAccountInfo(sampleCd, sampleAccounts);
      const url = buildCdMaturityCalendarUrl(sampleCd, accInfo, 'Asia/Hong_Kong');

      expect(url).toContain('ctz=Asia%2FHong_Kong');
      // Subject contains BunBau prefix
      expect(url).toContain('BunBau%3A+Goldman+Sachs+Bank+USA+CD+Maturity');
      // Description contains timezone note
      expect(url).toContain('Hong+Kong');
      // Scheduled dates are in UTC
      expect(url).toContain('dates=20261120T010000Z%2F20261120T013000Z');
    });

    it('embeds ctz=America%2FLos_Angeles when anchored to Home Base PT', () => {
      const accInfo = resolveAccountInfo(sampleCd, sampleAccounts);
      const url = buildCdMaturityCalendarUrl(sampleCd, accInfo, 'America/Los_Angeles');

      expect(url).toContain('ctz=America%2FLos_Angeles');
      expect(url).toContain('San+Francisco');
      expect(url).toContain('dates=20261120T170000Z%2F20261120T173000Z');
    });

    it('builds urgent options URL targeting Singapore (Asia/Singapore)', () => {
      // 10:00 AM SGT (UTC+8) = 02:00 UTC
      const now = new Date('2026-10-12T02:00:00Z');
      const slot = getImmediateOptionsActionSlot(now, 'Asia/Singapore');
      const accInfo = resolveAccountInfo(sampleUrgentOption, sampleAccounts);
      const url = buildOptionsImmediateCalendarUrl(sampleUrgentOption, slot, accInfo, 'Asia/Singapore');

      expect(url).toContain('ctz=Asia%2FSingapore');
      expect(url).toContain('Singapore');
      expect(url).toContain('BunBau%3A+IMMEDIATE+ACTION+-+NVDA+%24110+Put');
      // Scheduled at next cascading slot (12:00 PM SGT = 04:00 UTC)
      expect(url).toContain('dates=20261012T040000Z%2F20261012T043000Z');
    });
  });

  describe('5. RFC 5545 .ics Generation Across Timezones', () => {
    it('generates .ics with target timezone metadata in event description', () => {
      const icsHk = generateIcsCalendar([sampleCd], 'fixed-income', sampleAccounts, undefined, 'Asia/Hong_Kong');
      expect(icsHk).toContain('X-WR-TIMEZONE:Asia/Hong_Kong');
      expect(icsHk).toContain('DTSTART:20261120T010000Z');

      const icsSf = generateIcsCalendar([sampleCd], 'fixed-income', sampleAccounts, undefined, 'America/Los_Angeles');
      expect(icsSf).toContain('X-WR-TIMEZONE:America/Los_Angeles');
      expect(icsSf).toContain('DTSTART:20261120T170000Z');
    });
  });
});
