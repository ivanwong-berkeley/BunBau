import { describe, it, expect } from 'vitest';

/**
 * Pure logic simulation of findAvailablePort as implemented in scripts/docker-dev.sh
 */
export function findAvailablePort(
  startPort: number,
  maxPort: number,
  occupiedPorts: Set<number>
): number {
  let target = startPort;
  while (occupiedPorts.has(target)) {
    target++;
    if (target > maxPort) {
      throw new Error(`Could not find an available port between ${startPort} and ${maxPort}.`);
    }
  }
  return target;
}

describe('Docker Dynamic Port Fallback (docker-dev.sh logic)', () => {
  it('returns default port 3000 when unoccupied', () => {
    const occupied = new Set<number>();
    const port = findAvailablePort(3000, 3010, occupied);
    expect(port).toBe(3000);
  });

  it('automatically falls back to 3001 when port 3000 is occupied (e.g. by another container)', () => {
    const occupied = new Set<number>([3000]);
    const port = findAvailablePort(3000, 3010, occupied);
    expect(port).toBe(3001);
  });

  it('sequentially finds the next available port when multiple ports are occupied', () => {
    const occupied = new Set<number>([3000, 3001, 3002]);
    const port = findAvailablePort(3000, 3010, occupied);
    expect(port).toBe(3003);
  });

  it('throws an error if all candidate ports are exhausted', () => {
    const occupied = new Set<number>([3000, 3001, 3002, 3003, 3004]);
    expect(() => findAvailablePort(3000, 3004, occupied)).toThrow(
      'Could not find an available port between 3000 and 3004.'
    );
  });
});
