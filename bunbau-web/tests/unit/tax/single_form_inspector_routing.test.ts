import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { computeLongitudinalTaxAnalysis } from '../../../src/lib/tax/longitudinalEngine';
import { generateSyntheticTaxReturnForYear } from '../../../src/lib/tax/seedData';

const SRC = path.resolve(__dirname, '../../../src');

describe('Milestone v7.2: Single Form Inspector Routing & Dedicated Sheet Isolation', () => {
  const returns = [
    generateSyntheticTaxReturnForYear(2024),
    generateSyntheticTaxReturnForYear(2025),
  ];
  const analysis = computeLongitudinalTaxAnalysis(returns);

  it('1. Maps Ordinary Dividends strictly to Schedule B without Schedule E bleed', () => {
    const ordinaryDivs = analysis.lineItemMatrix.find((item) => item.key === 'ordinary_dividends');
    expect(ordinaryDivs).toBeDefined();
    expect(ordinaryDivs?.targetSchedule).toBe('schedule_b');
    expect(ordinaryDivs?.formRef).toContain('Schedule B');
  });

  it('2. Maps Adjusted Gross Income (AGI) strictly to Form 1040 Page 1', () => {
    const agi = analysis.lineItemMatrix.find((item) => item.key === 'agi');
    expect(agi).toBeDefined();
    expect(agi?.targetSchedule).toBe('1040_p1');
    expect(agi?.formRef).toContain('1040');
  });

  it('3. Maps Capital Gains strictly to Schedule D', () => {
    const capGains = analysis.lineItemMatrix.find((item) => item.key === 'capital_gains');
    expect(capGains).toBeDefined();
    expect(capGains?.targetSchedule).toBe('schedule_d');
    expect(capGains?.formRef).toContain('Schedule D');
  });

  it('4. Maps Rental Income strictly to Schedule E', () => {
    const rental = analysis.lineItemMatrix.find((item) => item.key === 'rental_income');
    expect(rental).toBeDefined();
    expect(rental?.targetSchedule).toBe('schedule_e');
    expect(rental?.formRef).toContain('Schedule E');
  });

  it('5. Maps Form 8582 suspended loss strictly to Form 8582', () => {
    const form8582 = analysis.lineItemMatrix.find((item) => item.key === 'passive_loss_carryover');
    expect(form8582).toBeDefined();
    expect(form8582?.targetSchedule).toBe('form_8582');
    expect(form8582?.formRef).toContain('8582');
  });

  it('6. Maps California tax liability strictly to CA Form 540', () => {
    const caTax = analysis.lineItemMatrix.find((item) => item.key === 'california_tax');
    expect(caTax).toBeDefined();
    expect(caTax?.targetSchedule).toBe('ca_540');
    expect(caTax?.formRef).toContain('540');
  });

  it('7. Enforces that TaxSingleFormViewer Schedule B contains ZERO Schedule E rental real estate bleed', () => {
    const singleFormViewerCode = fs.readFileSync(path.join(SRC, 'components/tax/TaxSingleFormViewer.tsx'), 'utf8');
    // Extract Schedule B rendering block
    const scheduleBIndex = singleFormViewerCode.indexOf("activeSchedule === 'schedule_b'");
    expect(scheduleBIndex).toBeGreaterThan(0);
    const scheduleBBlock = singleFormViewerCode.slice(scheduleBIndex, scheduleBIndex + 6000);

    // Assert Schedule B contains Interest and Dividends
    expect(scheduleBBlock).toContain('PART I: INTEREST INCOME');
    expect(scheduleBBlock).toContain('PART II: ORDINARY DIVIDENDS');
    expect(scheduleBBlock).toContain('Line 4: Total Taxable Interest');
    expect(scheduleBBlock).toContain('Line 6: Total Ordinary Dividends');
    expect(scheduleBBlock).toContain('item.payer');

    // Assert Schedule B DOES NOT render rental real estate
    expect(scheduleBBlock).not.toContain('rentalProperties');
    expect(scheduleBBlock).not.toContain('Gross Rents');
    expect(scheduleBBlock).not.toContain('Schedule E Rental');
  });
});
