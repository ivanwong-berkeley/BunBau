import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Milestone v7.3: Canonical 52-Page Vault Multi-Schedule Dispatcher & Zero-Bleed Schedule B/E Isolation', () => {
  const SRC = path.resolve(__dirname, '../../../src');
  const seedCode = fs.readFileSync(path.join(SRC, 'lib/tax/seedData.ts'), 'utf8');
  const viewerCode = fs.readFileSync(path.join(SRC, 'components/tax/BunBauDocumentViewer.tsx'), 'utf8');
  const modalCode = fs.readFileSync(path.join(SRC, 'components/tax/OriginalTaxPdfViewerModal.tsx'), 'utf8');

  it('1. Verifies CANONICAL_52_PAGE_BOOKMARKS defines accurate statutory schedule boundaries', () => {
    expect(seedCode).toContain('export const CANONICAL_52_PAGE_BOOKMARKS');
    expect(seedCode).toContain('form_1040_p1: 1');
    expect(seedCode).toContain('form_1040_p2: 2');
    expect(seedCode).toContain('schedule_1: 3');
    expect(seedCode).toContain('schedule_2: 4');
    expect(seedCode).toContain('schedule_3: 5');
    expect(seedCode).toContain('schedule_b: 6');
    expect(seedCode).toContain('schedule_d: 8');
    expect(seedCode).toContain('schedule_a: 10');
    expect(seedCode).toContain('schedule_e_p1: 12');
    expect(seedCode).toContain('schedule_e_p2: 16');
    expect(seedCode).toContain('form_8949: 18');
    expect(seedCode).toContain('form_8582: 20');
    expect(seedCode).toContain('form_8960: 30');
    expect(seedCode).toContain('ca_form_540: 32');
    expect(seedCode).toContain('ca_schedule_ca: 42');
    expect(seedCode).toContain('ca_schedule_d: 48');
  });

  it('2. Verifies BunBauDocumentViewer implements deterministic getScheduleTypeForPage with zero Schedule E bleed on Page 6', () => {
    expect(viewerCode).toContain('const getScheduleTypeForPage = (pageNum: number): string =>');
    expect(viewerCode).toContain("scheduleType === 'schedule_b'");

    // Extract Schedule B block from viewerCode
    const schBStart = viewerCode.indexOf("scheduleType === 'schedule_b'");
    const schBEnd = viewerCode.indexOf("scheduleType === 'schedule_d'");
    expect(schBStart).toBeGreaterThan(0);
    expect(schBEnd).toBeGreaterThan(schBStart);
    const schBBlock = viewerCode.slice(schBStart, schBEnd);

    // Schedule B must render Part I Interest & Part II Ordinary Dividends
    expect(schBBlock).toContain('SCHEDULE B — INTEREST &amp; ORDINARY DIVIDENDS');
    expect(schBBlock).toContain('Part I — Interest Income');
    expect(schBBlock).toContain('Citibank High Yield Cash Deposit');
    expect(schBBlock).toContain('Fidelity Government Cash Reserves');
    expect(schBBlock).toContain('Part II — Ordinary Dividends');
    expect(schBBlock).toContain('Fidelity Brokerage (Index &amp; ETF Distributions)');
    expect(schBBlock).toContain('Vanguard Brokerage');
    expect(schBBlock).toContain('Webull Financial LLC');

    // Schedule B MUST NOT contain Schedule E rental real estate or Los Prados address
    expect(schBBlock).not.toContain('SCHEDULE E / RENTAL REAL ESTATE');
    expect(schBBlock).not.toContain('3343 Los Prados');
    expect(schBBlock).not.toContain('Gross Rents Received');
    expect(schBBlock).not.toContain('Total Rental Operating Loss');
  });

  it('3. Verifies Schedule E Part I is dispatched at canonical page 12 with dynamic rental property extraction', () => {
    expect(viewerCode).toContain("scheduleType === 'schedule_e_p1'");
    const schEStart = viewerCode.indexOf("scheduleType === 'schedule_e_p1'");
    const schEEnd = viewerCode.indexOf("scheduleType === 'form_8582'");
    expect(schEStart).toBeGreaterThan(0);
    expect(schEEnd).toBeGreaterThan(schEStart);
    const schEBlock = viewerCode.slice(schEStart, schEEnd);

    expect(schEBlock).toContain('SCHEDULE E (PART I) / RENTAL REAL ESTATE');
    expect(schEBlock).toContain('taxReturn.federal.rentalProperties.map');
    expect(schEBlock).toContain('prop.address');
    expect(schEBlock).toContain('Line 3: Gross Rents Received:');
    expect(schEBlock).toContain('Line 21/26: Total Rental Real Estate Net Loss:');
  });

  it('4. Verifies Schedule D, Schedule A, Form 8582, and California Form 540 are independently dispatched', () => {
    expect(viewerCode).toContain("scheduleType === 'schedule_d'");
    expect(viewerCode).toContain("scheduleType === 'schedule_a'");
    expect(viewerCode).toContain("scheduleType === 'form_8582'");
    expect(viewerCode).toContain("scheduleType === 'ca_form_540'");

    expect(viewerCode).toContain('SCHEDULE D — CAPITAL GAINS AND LOSSES');
    expect(viewerCode).toContain('SCHEDULE A — ITEMIZED DEDUCTIONS');
    expect(viewerCode).toContain('FORM 8582 — PASSIVE ACTIVITY LOSS LIMITATIONS');
    expect(viewerCode).toContain('CALIFORNIA FORM 540 — RESIDENT INCOME TAX RETURN');
  });

  it('5. Verifies OriginalTaxPdfViewerModal enforces deterministic schedule resolution and jump shortcuts', () => {
    expect(modalCode).toContain('const getScheduleTypeForPage = (pageNum: number): string =>');
    expect(modalCode).toContain("const currentScheduleType = getScheduleTypeForPage(currentPage);");

    // Quick jump shortcuts bound to canonical bookmarks
    expect(modalCode).toContain('bookmarks.form_1040_p1 || 1');
    expect(modalCode).toContain('bookmarks.schedule_b || 6');
    expect(modalCode).toContain('bookmarks.schedule_d || 8');
    expect(modalCode).toContain('bookmarks.schedule_e_p1 || 12');
    expect(modalCode).toContain('bookmarks.form_8582 || 20');
    expect(modalCode).toContain('bookmarks.ca_form_540 || 32');

    // Section dispatches in modal
    expect(modalCode).toContain("currentScheduleType === 'schedule_b'");
    expect(modalCode).toContain("currentScheduleType === 'schedule_d'");
    expect(modalCode).toContain("currentScheduleType === 'schedule_a'");
    expect(modalCode).toContain("(currentScheduleType === 'schedule_e_p1' || currentScheduleType === 'schedule_e_p2')");
    expect(modalCode).toContain("currentScheduleType === 'form_8582'");
    expect(modalCode).toContain("currentScheduleType === 'ca_form_540'");
  });
});
