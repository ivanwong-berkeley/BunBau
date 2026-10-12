import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { deletePhrase, phraseMatches, validateRange, rangeBounds, inRange, selectInRange, chunk, BATCH_LIMIT, previewText, groupThreads } from '../../../src/lib/strategist/historyOps';

const SRC = path.resolve(__dirname, '../../../src');

describe('typed-phrase deletes', () => {
  it('T30: exact, case-sensitive match only', () => {
    const p = deletePhrase('everything');
    expect(p).toBe('Delete all strategist history');
    expect(phraseMatches(p, p)).toBe(true);
    expect(phraseMatches(p.toLowerCase(), p)).toBe(false);
    expect(phraseMatches(p + ' ', p)).toBe(false);
    expect(phraseMatches('', '')).toBe(false);
  });

  it('T31: phrases use the selected dates, ALL, count and scope', () => {
    expect(deletePhrase('chat', { from: '2026-09-01', to: '2026-10-10' })).toBe('Delete chat from 2026-09-01 to 2026-10-10');
    expect(deletePhrase('chat', { all: true })).toBe('Delete all strategist chat');
    expect(deletePhrase('reports', { from: '2026-01-01', to: '2026-01-31' })).toBe('Delete reports from 2026-01-01 to 2026-01-31');
    expect(deletePhrase('reports', { all: true })).toBe('Delete all strategist reports');
    expect(deletePhrase('selected', { count: 3 })).toBe('Delete 3 selected items');
    expect(deletePhrase('memory')).toBe('Delete strategist memory');
  });
});

describe('range selection', () => {
  it('T32: From <= To, ALL overrides, both days inclusive', () => {
    expect(validateRange('2026-10-10', '2026-10-01', false)).toMatch(/cannot be after/);
    expect(validateRange('', '', false)).toMatch(/Choose both/);
    expect(validateRange('', '', true)).toBeNull();
    expect(validateRange('2026-10-01', '2026-10-10', false)).toBeNull();
    const b = rangeBounds('2026-10-01', '2026-10-01');
    expect(b.end - b.start).toBe(86400000 - 1);
  });

  it('T33: boundaries at 00:00 and 23:59 are in, the day before/after are out', () => {
    const local = (d: string, h: number, m: number, s = 0) => {
      const [y, mo, da] = d.split('-').map(Number);
      return new Date(y, mo - 1, da, h, m, s).toISOString();
    };
    const items = [
      { id: 'before', createdAt: local('2026-09-30', 23, 59, 59) },
      { id: 'start', createdAt: local('2026-10-01', 0, 0, 0) },
      { id: 'end', createdAt: local('2026-10-10', 23, 59, 59) },
      { id: 'after', createdAt: local('2026-10-11', 0, 0, 0) },
    ];
    expect(selectInRange(items, '2026-10-01', '2026-10-10').map((i) => i.id)).toEqual(['start', 'end']);
    expect(selectInRange(items, undefined, undefined, true).length).toBe(4);
    expect(inRange('bad date', '2026-10-01', '2026-10-10')).toBe(false);
  });

  it('T35: batches stay below the Firestore limit', () => {
    const parts = chunk(Array.from({ length: 1000 }, (_, i) => i));
    expect(parts.every((p) => p.length <= BATCH_LIMIT)).toBe(true);
    expect(BATCH_LIMIT).toBeLessThan(500);
    expect(parts.flat().length).toBe(1000);
  });

  it('preview text and thread grouping', () => {
    expect(previewText({ messages: 42, threads: 5, reports: 0, memory: false }, '2026-10-08', '2026-10-10')).toContain('42 messages in 5 conversations');
    expect(previewText({ messages: 0, threads: 0, reports: 0, memory: false }, '', '', true)).toContain('nothing');
    const g = groupThreads([
      { id: '1', threadId: 'A', createdAt: '2026-10-01T10:00:00Z', role: 'user', text: 'first' },
      { id: '2', threadId: 'A', createdAt: '2026-10-01T10:01:00Z', role: 'assistant', text: 'reply' },
      { id: '3', threadId: 'B', createdAt: '2026-10-02T10:00:00Z', role: 'user', text: 'second' },
    ]);
    expect(g.map((t) => [t.threadId, t.count])).toEqual([['A', 2], ['B', 1]]);
    expect(g[0].preview).toBe('first');
  });
});

describe('isolation + guards', () => {
  it('T13/T37: Firestore rules make the strategist collections owner-only', () => {
    const rules = fs.readFileSync(path.resolve(SRC, '../firestore.rules'), 'utf8');
    for (const c of ['strategyMessages', 'strategyReports', 'strategyMemory']) {
      const i = rules.indexOf(`match /${c}/`);
      expect(i).toBeGreaterThan(-1);
      expect(rules.slice(i, i + 160)).toContain('request.auth.uid == userId');
    }
  });

  it('T28: the strategist API never touches Firestore', () => {
    const route = fs.readFileSync(path.join(SRC, 'app/api/strategist/route.ts'), 'utf8');
    expect(/firebase\/firestore|firestore\(|getFirestore|collection\(/.test(route)).toBe(false);
  });

  it('T38: strategist deletes only go through the History drawer (typed confirm) and the store', () => {
    const offenders: string[] = [];
    const walk = (d: string) => {
      for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(p) && /strategyStore\.(deleteIds|deleteMemory)/.test(fs.readFileSync(p, 'utf8'))) offenders.push(path.relative(SRC, p));
      }
    };
    walk(SRC);
    expect(offenders).toEqual(['components/strategy/StrategistHistoryDrawer.tsx']);
    const drawer = fs.readFileSync(path.join(SRC, 'components/strategy/StrategistHistoryDrawer.tsx'), 'utf8');
    expect(drawer).toContain('DestructiveConfirmDialog');
  });

  it('the API requires auth before anything else', () => {
    const route = fs.readFileSync(path.join(SRC, 'app/api/strategist/route.ts'), 'utf8');
    expect(route.indexOf('requireUid')).toBeLessThan(route.indexOf('req.json()'));
  });
});
