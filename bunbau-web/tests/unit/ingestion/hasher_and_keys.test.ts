import { describe, it, expect } from 'vitest';
import { computeSha256 } from '../../../src/lib/ingestion/hasher';
import { generateAccountKey, generatePositionKey } from '../../../src/lib/ingestion/keys';

describe('Hasher & Composite Key Generation', () => {
  it('computes identical SHA-256 for identical file content regardless of filename', () => {
    const content = 'Account,Symbol,Quantity\n1234,AAPL,100\n';
    const hash1 = computeSha256(content);
    const hash2 = computeSha256(Buffer.from(content));
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it('generates invariant account keys regardless of whitespace or casing', () => {
    const key1 = generateAccountKey('user-1', 'Fidelity', '***-6238');
    const key2 = generateAccountKey('user-1', 'fidelity', '6238');
    const key3 = generateAccountKey('USER-1', '  FIDELITY  ', 'X24336238');
    expect(key1).toBe(key2);
    expect(key1).toBe(key3);
  });

  it('generates distinct position keys for different option terms on the same underlier', () => {
    const accKey = 'acc_test123';
    const putOct = generatePositionKey(accKey, 'AAPL', 'Option', '2026-10-16');
    const putNov = generatePositionKey(accKey, 'AAPL', 'Option', '2026-11-20');
    const stock = generatePositionKey(accKey, 'AAPL', 'Stock', 'NA');

    expect(putOct).not.toBe(putNov);
    expect(putOct).not.toBe(stock);
  });
});
