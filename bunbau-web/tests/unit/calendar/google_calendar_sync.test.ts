import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  getImmediateOptionsActionSlot,
  getCdMaturitySlot,
  resolveAccountInfo,
  buildCdMaturityCalendarUrl,
  buildOptionsImmediateCalendarUrl,
  generateIcsCalendar,
  getSyncedEventIds,
  markEventSynced,
  isEventSynced,
} from '../../../src/lib/calendar/googleCalendar';
import { CalendarTimelineEvent, CanonicalAccount } from '../../../src/lib/portfolio/types';

describe('Google Calendar & Smart Scheduling Engine (v2.7.2)', () => {
  let storageMap: Map<string, string>;

  beforeAll(() => {
    storageMap = new Map();
    const mockLocalStorage = {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, val: string) => storageMap.set(key, String(val)),
      removeItem: (key: string) => storageMap.delete(key),
      clear: () => storageMap.clear(),
    };
    (globalThis as any).localStorage = mockLocalStorage;
  });
  const sampleAccounts: CanonicalAccount[] = [
    {
      id: 'acc-fid-brokerage',
      institution: 'Fidelity',
      accountType: 'BrokerageLink',
      maskedAccount: '652716847',
      balance: 150000,
      currency: 'USD',
      updatedAt: '2026-10-07T00:00:00Z',
    },
    {
      id: 'acc-webull-cash',
      institution: 'WeBull',
      accountType: 'Individual Cash',
      maskedAccount: '***-XLW4',
      balance: 45000,
      currency: 'USD',
      updatedAt: '2026-10-07T00:00:00Z',
    },
  ];

  const sampleCdEvent: CalendarTimelineEvent = {
    id: 'cd-boa-1',
    symbol: 'BANK OF EAST ASIA LTD 3.85%',
    name: 'BANK OF EAST ASIA LTD 3.85% CD',
    date: '2026-11-15',
    daysRemaining: 34,
    eventType: 'CD',
    institution: 'Fidelity',
    marketValue: 50000,
    apy: 3.85,
    urgency: 'soon',
    position: {
      id: 'pos-cd-1',
      accountId: 'acc-fid-brokerage',
      symbol: 'BANK OF EAST ASIA LTD 3.85%',
      name: 'BANK OF EAST ASIA LTD 3.85% CD',
      assetClass: 'CD',
      marketValue: 50000,
      quantity: 50,
      costBasis: 50000,
      institution: 'Fidelity',
      maturityDate: '2026-11-15',
    },
  };

  const sampleUrgentOptionEvent: CalendarTimelineEvent = {
    id: 'opt-nvda-put-1',
    symbol: 'NVDA $110 Put',
    name: 'NVDA Oct 24 2026 $110 Put',
    date: '2026-10-24', // DTE 12 days
    daysRemaining: 12,
    eventType: 'CSP',
    institution: 'WeBull',
    marketValue: -320,
    strike: 110,
    marketPrice: 111.5,
    moneynessPct: 1.36, // Urgent: within 2% of strike
    isItm: false,
    optionBadgeLabel: '1.4% Cushion (Urgent)',
    contracts: 2,
    collateralLocked: 22000,
    underlying: 'NVDA',
    urgency: 'urgent',
    position: {
      id: 'pos-nvda-put',
      accountId: 'acc-webull-cash',
      symbol: 'NVDA $110 Put',
      name: 'NVDA Oct 24 2026 $110 Put',
      assetClass: 'CSP',
      marketValue: -320,
      quantity: -2,
      costBasis: -500,
      institution: 'WeBull',
    },
  };

  describe('1. Immediate Pacific Time 4-Tier Slot Cascading', () => {
    it('schedules for Today 9:00 AM PT when current PT time is before 9 AM', () => {
      // 8:15 AM PDT is 15:15 UTC (PDT is UTC-7)
      const simulatedNow = new Date('2026-10-12T15:15:00Z');
      const slot = getImmediateOptionsActionSlot(simulatedNow);

      expect(slot.slotLabel).toBe('Today @ 9:00 AM PT');
      expect(slot.timeLabel).toBe('9:00 AM – 9:30 AM PT');
      expect(slot.isToday).toBe(true);
      // In PDT (UTC-7), 9:00 AM is 16:00 UTC
      expect(slot.startIsoUtc).toContain('T160000Z');
      expect(slot.endIsoUtc).toContain('T163000Z');
    });

    it('schedules for Today 12:00 PM (Noon) PT when current PT time is between 9 AM and 12 PM', () => {
      // 10:30 AM PDT is 17:30 UTC
      const simulatedNow = new Date('2026-10-12T17:30:00Z');
      const slot = getImmediateOptionsActionSlot(simulatedNow);

      expect(slot.slotLabel).toBe('Today @ 12:00 PM (Noon) PT');
      expect(slot.timeLabel).toBe('12:00 PM – 12:30 PM PT');
      expect(slot.isToday).toBe(true);
      // In PDT (UTC-7), 12:00 PM is 19:00 UTC
      expect(slot.startIsoUtc).toContain('T190000Z');
      expect(slot.endIsoUtc).toContain('T193000Z');
    });

    it('schedules for Today 5:00 PM PT when current PT time is between 12 PM and 5 PM', () => {
      // 2:45 PM PDT is 21:45 UTC
      const simulatedNow = new Date('2026-10-12T21:45:00Z');
      const slot = getImmediateOptionsActionSlot(simulatedNow);

      expect(slot.slotLabel).toBe('Today @ 5:00 PM PT');
      expect(slot.timeLabel).toBe('5:00 PM – 5:30 PM PT');
      expect(slot.isToday).toBe(true);
      // In PDT (UTC-7), 5:00 PM is 00:00 UTC next day
      expect(slot.startIsoUtc).toContain('T000000Z');
      expect(slot.endIsoUtc).toContain('T003000Z');
    });

    it('schedules for Tomorrow 7:00 AM PT when current PT time is after 5:00 PM', () => {
      // 7:15 PM PDT is 02:15 UTC next day
      const simulatedNow = new Date('2026-10-13T02:15:00Z');
      const slot = getImmediateOptionsActionSlot(simulatedNow);

      expect(slot.slotLabel).toBe('Tomorrow @ 7:00 AM PT');
      expect(slot.timeLabel).toBe('7:00 AM – 7:30 AM PT');
      expect(slot.isToday).toBe(false);
      // Tomorrow 7:00 AM PDT is 14:00 UTC
      expect(slot.startIsoUtc).toContain('T140000Z');
      expect(slot.endIsoUtc).toContain('T143000Z');
    });
  });

  describe('2. Fixed Income Maturity Scheduling (9:00 AM PT on Maturity Date)', () => {
    it('sets CD maturity slot to 9:00 AM PT on the maturity date with 7-day prior reminder', () => {
      const slot = getCdMaturitySlot('2026-11-15');

      expect(slot.dateStr).toBe('2026-11-15');
      expect(slot.reminderDateStr).toBe('2026-11-08');
      // In PST (standard time UTC-8 in Nov), 9:00 AM is 17:00 UTC
      expect(slot.startIsoUtc).toBe('20261115T170000Z');
      expect(slot.endIsoUtc).toBe('20261115T173000Z');
    });
  });

  describe('3. Account Name & Number Resolution', () => {
    it('resolves account name and masked number correctly', () => {
      const fidInfo = resolveAccountInfo(sampleCdEvent, sampleAccounts);
      expect(fidInfo).toBe('BrokerageLink (652716847)');

      const webullInfo = resolveAccountInfo(sampleUrgentOptionEvent, sampleAccounts);
      expect(webullInfo).toBe('Individual Cash (***-XLW4)');
    });

    it('returns empty string if account is not found', () => {
      const unknownEvent = { ...sampleCdEvent, position: { ...sampleCdEvent.position!, accountId: 'non-existent' } };
      expect(resolveAccountInfo(unknownEvent, sampleAccounts)).toBe('');
    });
  });

  describe('4. Google Calendar 1-Click URL Generation', () => {
    it('builds CD maturity URL with "BunBau: " prefix and full account details', () => {
      const accInfo = resolveAccountInfo(sampleCdEvent, sampleAccounts);
      const url = buildCdMaturityCalendarUrl(sampleCdEvent, accInfo);

      expect(url).toContain('https://calendar.google.com/calendar/render?');
      expect(url).toContain('action=TEMPLATE');
      expect(url).toContain('ctz=America%2FLos_Angeles');
      // Subject contains BunBau prefix and account details
      expect(url).toContain('BunBau%3A+BANK+OF+EAST+ASIA+LTD+3.85%25+CD+Maturity+-+Fidelity+%28BrokerageLink+%28652716847%29%29');
      // Details contains APY, principal value, and reinvestment guidance
      expect(url).toContain('3.85%25+APY');
      expect(url).toContain('50%2C000');
      expect(url).toContain('Reinvestment+Actions');
    });

    it('builds Urgent Options URL with immediate Pacific Time slot and risk breakdown', () => {
      const simulatedNow = new Date('2026-10-12T15:15:00Z');
      const slot = getImmediateOptionsActionSlot(simulatedNow);
      const accInfo = resolveAccountInfo(sampleUrgentOptionEvent, sampleAccounts);
      const url = buildOptionsImmediateCalendarUrl(sampleUrgentOptionEvent, slot, accInfo);

      expect(url).toContain('https://calendar.google.com/calendar/render?');
      expect(url).toContain('ctz=America%2FLos_Angeles');
      // Title prefix and underlier info
      expect(url).toContain('BunBau%3A+IMMEDIATE+ACTION+-+NVDA+%24110+Put');
      // Scheduled date matches the IMMEDIATE slot (today), NOT the 12-day-out expiration date
      expect(url).toContain('dates=20261012T160000Z%2F20261012T163000Z');
      // Details contain moneyness, strike, market quote, and review checklist
      expect(url).toContain('Buffer+Cushion%3A+%2B1.36%25');
      expect(url).toContain('Collateral+Locked%3A+%2422%2C000');
      expect(url).toContain('Immediate+Review+Checklist');
    });
  });

  describe('5. RFC 5545 .ics Calendar File Generation', () => {
    it('generates valid RFC 5545 .ics with 7-day prior reminder for CDs', () => {
      const ics = generateIcsCalendar([sampleCdEvent], 'fixed-income', sampleAccounts);

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('PRODID:-//BunBau//Personal Portfolio Intelligence//EN');
      expect(ics).toContain('SUMMARY:BunBau: BANK OF EAST ASIA LTD 3.85% CD Maturity - Fidelity (BrokerageLink (652716847))');
      expect(ics).toContain('BEGIN:VALARM');
      // 7-day prior alarm
      expect(ics).toContain('TRIGGER:-P7D');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('generates valid RFC 5545 .ics with 15-minute reminder for Urgent Options', () => {
      const simulatedNow = new Date('2026-10-12T15:15:00Z');
      const slot = getImmediateOptionsActionSlot(simulatedNow);
      const ics = generateIcsCalendar([sampleUrgentOptionEvent], 'urgent-options', sampleAccounts, slot);

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('SUMMARY:BunBau: IMMEDIATE ACTION - NVDA $110 Put');
      expect(ics).toContain('BEGIN:VALARM');
      expect(ics).toContain('TRIGGER:-PT15M');
      expect(ics).toContain('END:VCALENDAR');
    });
  });

  describe('6. LocalStorage Synchronization Tracking', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('tracks and verifies synced events to prevent duplicate submissions', () => {
      const userId = 'user-test-123';
      const eventId = 'cd-boa-1';

      expect(isEventSynced(eventId, userId)).toBe(false);
      expect(getSyncedEventIds(userId).has(eventId)).toBe(false);

      markEventSynced(eventId, userId);

      expect(isEventSynced(eventId, userId)).toBe(true);
      expect(getSyncedEventIds(userId).has(eventId)).toBe(true);
    });
  });
});
