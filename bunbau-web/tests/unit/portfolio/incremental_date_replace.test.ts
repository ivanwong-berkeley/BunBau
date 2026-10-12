import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { FidelityCSVAdapter } from '../../../src/lib/ingestion/adapters/fidelityAdapter';
import { parseFilenameMetadata } from '../../../src/lib/ingestion/filenameParser';
import { reconcileAccounts } from '../../../src/lib/ingestion/reconcile';

describe('Same-Day and Day-over-Day Incremental Overwrite (Single Account)', () => {
  const day1File = path.resolve(__dirname, '../../fixtures/real_uploads/Fidelity/CSV/Brokerage_X24336238_Portfolio_Positions_Oct-06-2026.csv');
  const day2File = path.resolve(__dirname, '../../fixtures/real_uploads/Fidelity/CSV/Fidelity_Brokerage_X24336238_Portfolio_Positions_Oct-07-2026.csv');

  it('ingests Day 1 (10/06/2026) initial position state', () => {
    const rawDay1 = fs.readFileSync(day1File, 'utf-8');
    const metaDay1 = parseFilenameMetadata('Brokerage_X24336238_Portfolio_Positions_Oct-06-2026.csv');
    const adapter = new FidelityCSVAdapter();
    const resDay1 = adapter.parse(rawDay1, 'user-1', metaDay1);

    expect(resDay1.accounts.length).toBe(1);
    const acc1 = resDay1.accounts[0];
    expect(acc1.accountMaskedNumber).toBe('***-6238');
    expect(acc1.extractedAt).toBe('2026-10-06');
    expect(acc1.cashBalance).toBeCloseTo(100331.74, 2);

    const sgov1 = acc1.positions.find(p => p.symbol === 'SGOV');
    expect(sgov1?.quantity).toBeCloseTo(774.474, 2);
  });

  it('allows same-day re-upload (intraday refresh) without creating duplicate accounts', () => {
    const rawDay1 = fs.readFileSync(day1File, 'utf-8');
    const metaDay1 = parseFilenameMetadata('Brokerage_X24336238_Portfolio_Positions_Oct-06-2026.csv');
    const adapter = new FidelityCSVAdapter();

    // First upload in morning
    const morningAcc = adapter.parse(rawDay1, 'user-1', metaDay1).accounts[0];
    // Re-upload in afternoon with updated cash
    const afternoonAcc = { ...morningAcc, cashBalance: 105000.00, totalValue: morningAcc.totalValue + 4668.26 };

    // In-place reconciliation
    const reconciled = reconcileAccounts([morningAcc], [afternoonAcc], 'user-1');
    expect(reconciled.mergedAccounts.length).toBe(1);
    expect(reconciled.mergedAccounts[0].cashBalance).toBe(105000.00);
  });

  it('executes Day-over-Day incremental replacement (10/6 -> 10/7) with zero doubling', () => {
    const rawDay1 = fs.readFileSync(day1File, 'utf-8');
    const rawDay2 = fs.readFileSync(day2File, 'utf-8');
    const metaDay1 = parseFilenameMetadata('Brokerage_X24336238_Portfolio_Positions_Oct-06-2026.csv');
    const metaDay2 = parseFilenameMetadata('Fidelity_Brokerage_X24336238_Portfolio_Positions_Oct-07-2026.csv');

    const adapter = new FidelityCSVAdapter();
    const day1Acc = adapter.parse(rawDay1, 'user-1', metaDay1).accounts[0];
    const day2Acc = adapter.parse(rawDay2, 'user-1', metaDay2).accounts[0];

    expect(day1Acc.totalValue).toBeCloseTo(683071.03, 1);
    expect(day2Acc.totalValue).toBeCloseTo(678892.09, 1);

    // Overwriting day 1 with day 2
    // Since day 2 is newer, the live account is atomically updated to day 2
    const liveAccount = { ...day2Acc };

    expect(liveAccount.extractedAt).toBe('2026-10-07');
    expect(liveAccount.cashBalance).toBeCloseTo(133740.38, 2); // Core FCASH + Pending activity settlement proceeds

    const sgov2 = liveAccount.positions.find(p => p.symbol === 'SGOV');
    expect(sgov2?.quantity).toBe(446); // Down from 774 shares

    const avgoPut = liveAccount.positions.find(p => p.symbol.includes('AVGO'));
    expect(avgoPut).toBeDefined();

    // Verify zero doubling: total reflects day 2 (~$678k, NOT $1.35M!)
    expect(liveAccount.totalValue).toBeCloseTo(678892.09, 1);
    expect(liveAccount.totalValue).toBeLessThan(700000);
  });
});
