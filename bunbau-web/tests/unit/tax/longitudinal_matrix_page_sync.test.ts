import { describe, it, expect } from 'vitest';
import { computeLongitudinalTaxAnalysis } from '../../../src/lib/tax/longitudinalEngine';
import { TAX_RETURN_2024, TAX_RETURN_2025 } from '../../../src/lib/tax/seedData';

describe('Milestone v7.3: Longitudinal Matrix Page & Schedule Deep-Linking Sync', () => {
  it('1. Verifies all 17 line items in Longitudinal Tax Analysis link to canonical schedule pages', () => {
    const analysis = computeLongitudinalTaxAnalysis([TAX_RETURN_2024, TAX_RETURN_2025]);
    expect(analysis.lineItemMatrix.length).toBe(17);

    const rowMap = new Map(analysis.lineItemMatrix.map((r) => [r.key, r]));

    // Income items
    expect(rowMap.get('w2_wages')?.sourceDocPage2025).toBe(1);
    expect(rowMap.get('w2_wages')?.targetSchedule).toBe('1040_p1');

    expect(rowMap.get('taxable_interest')?.sourceDocPage2025).toBe(6);
    expect(rowMap.get('taxable_interest')?.targetSchedule).toBe('schedule_b');

    expect(rowMap.get('ordinary_dividends')?.sourceDocPage2025).toBe(6);
    expect(rowMap.get('ordinary_dividends')?.targetSchedule).toBe('schedule_b');

    expect(rowMap.get('qualified_dividends')?.sourceDocPage2025).toBe(1);
    expect(rowMap.get('qualified_dividends')?.targetSchedule).toBe('1040_p1');

    expect(rowMap.get('capital_gains')?.sourceDocPage2025).toBe(8);
    expect(rowMap.get('capital_gains')?.targetSchedule).toBe('schedule_d');

    expect(rowMap.get('rental_income')?.sourceDocPage2025).toBe(12);
    expect(rowMap.get('rental_income')?.targetSchedule).toBe('schedule_e');

    // Tax calculation items
    expect(rowMap.get('agi')?.sourceDocPage2025).toBe(1);
    expect(rowMap.get('agi')?.targetSchedule).toBe('1040_p1');

    expect(rowMap.get('deductions_claimed')?.sourceDocPage2025).toBe(2);
    expect(rowMap.get('deductions_claimed')?.targetSchedule).toBe('1040_p2');

    expect(rowMap.get('taxable_income')?.sourceDocPage2025).toBe(2);
    expect(rowMap.get('taxable_income')?.targetSchedule).toBe('1040_p2');

    expect(rowMap.get('federal_tax')?.sourceDocPage2025).toBe(2);
    expect(rowMap.get('federal_tax')?.targetSchedule).toBe('1040_p2');

    expect(rowMap.get('california_tax')?.sourceDocPage2025).toBe(32);
    expect(rowMap.get('california_tax')?.targetSchedule).toBe('ca_540');

    expect(rowMap.get('total_combined_tax')?.sourceDocPage2025).toBe(2);
    expect(rowMap.get('total_combined_tax')?.targetSchedule).toBe('1040_p2');

    // Payments & Overpayment
    expect(rowMap.get('federal_withholding')?.sourceDocPage2025).toBe(2);
    expect(rowMap.get('federal_withholding')?.targetSchedule).toBe('1040_p2');

    expect(rowMap.get('estimated_payments')?.sourceDocPage2025).toBe(2);
    expect(rowMap.get('estimated_payments')?.targetSchedule).toBe('1040_p2');

    expect(rowMap.get('overpayment_applied')?.sourceDocPage2025).toBe(2);
    expect(rowMap.get('overpayment_applied')?.targetSchedule).toBe('1040_p2');

    // Loss Shields
    expect(rowMap.get('capital_loss_carryover')?.sourceDocPage2025).toBe(8);
    expect(rowMap.get('capital_loss_carryover')?.targetSchedule).toBe('schedule_d');

    expect(rowMap.get('passive_loss_carryover')?.sourceDocPage2025).toBe(20);
    expect(rowMap.get('passive_loss_carryover')?.targetSchedule).toBe('form_8582');
  });

  it('2. Verifies values for 2025 and 2024 are accurately populated without mock residue', () => {
    const analysis = computeLongitudinalTaxAnalysis([TAX_RETURN_2024, TAX_RETURN_2025]);
    const rowMap = new Map(analysis.lineItemMatrix.map((r) => [r.key, r]));

    const aRow = rowMap.get('agi');
    expect(aRow?.valuesByYear[2025]).toBe(204100);
    expect(aRow?.valuesByYear[2024]).toBe(292000);

    const intRow = rowMap.get('taxable_interest');
    expect(intRow?.valuesByYear[2025]).toBe(16200);
    expect(intRow?.valuesByYear[2024]).toBe(18500);

    const divRow = rowMap.get('ordinary_dividends');
    expect(divRow?.valuesByYear[2025]).toBe(6400);
    expect(divRow?.valuesByYear[2024]).toBe(5200);

    const capRow = rowMap.get('capital_loss_carryover');
    expect(capRow?.valuesByYear[2025]).toBe(28500);
    expect(capRow?.valuesByYear[2024]).toBe(0);

    const passRow = rowMap.get('passive_loss_carryover');
    expect(passRow?.valuesByYear[2025]).toBe(36000);
  });
});
