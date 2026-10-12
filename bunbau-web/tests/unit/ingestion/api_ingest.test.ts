import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { NextRequest } from 'next/server';
import { POST as uploadHandler } from '../../../src/app/api/v1/ingest/upload/route';
import { POST as confirmHandler } from '../../../src/app/api/v1/ingest/confirm/route';

describe('Unified Ingestion API Endpoints', () => {
  const fixturePath = path.resolve(__dirname, '../../fixtures/fidelity_sample.csv');
  const csvBuffer = fs.readFileSync(fixturePath);

  it('handles multi-part upload of CSV file and returns reconciled staging payload', async () => {
    const formData = new FormData();
    const file = new File([csvBuffer], 'fidelity_sample.csv', { type: 'text/csv' });
    formData.append('files', file);
    formData.append('userId', 'test-user-99');

    const req = new NextRequest('http://localhost:3000/api/v1/ingest/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await uploadHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.stagingId).toBeDefined();
    expect(data.accounts.length).toBe(1);

    const account = data.accounts[0];
    expect(account.institution).toBe('Fidelity');
    expect(account.cashBalance).toBeCloseTo(100331.74, 2);

    const diff = data.diffs[0];
    expect(diff.totalLockedCollateral).toBe(98500);
    expect(diff.netFreeCash).toBeCloseTo(1831.74, 2);
  });

  it('confirms staging payload and returns success', async () => {
    const confirmBody = {
      stagingId: 'stg_test_123',
      userId: 'test-user-99',
      confirmedAccounts: [
        {
          accountKey: 'fidelity_6238',
          institution: 'Fidelity',
          accountName: 'Individual - TOD',
          accountMaskedNumber: '***-6238',
          accountType: 'Brokerage',
          totalValue: 500000,
          cashBalance: 100331.74,
          positions: [],
          rawSourceFiles: [],
          sourceType: 'CSV',
          extractedAt: '2026-10-06T00:00:00Z',
          version: 1,
        },
      ],
    };

    const req = new NextRequest('http://localhost:3000/api/v1/ingest/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(confirmBody),
    });

    const res = await confirmHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.stagingId).toBe('stg_test_123');
  });
});
