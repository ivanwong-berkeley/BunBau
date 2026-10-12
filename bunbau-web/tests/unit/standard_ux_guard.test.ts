import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '../../src');

function walk(dir: string, out: string[] = []): string[] {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

// MarkdownBody renders tables that appear inside AI-written Markdown (content, not data tables).
const SHARED = ['SortableHeader.tsx', 'SmartTable.tsx', 'MarkdownBody.tsx'];
// Legacy hand-rolled table that already has sort + Reset + (i) (default Symbol ASC).
const ALLOWED_CUSTOM = ['ReconciliationAuditModal.tsx'];

describe('Standard UX guard: tables', () => {
  const files = walk(SRC);

  it('no raw <th outside shared components', () => {
    const offenders = files.filter((f) => {
      const b = path.basename(f);
      if (SHARED.includes(b) || ALLOWED_CUSTOM.includes(b)) return false;
      return /<th[\s>]/.test(fs.readFileSync(f, 'utf8'));
    });
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  it('every file with <table uses SmartTable / sort bar', () => {
    const offenders = files.filter((f) => {
      const b = path.basename(f);
      if (SHARED.includes(b) || ALLOWED_CUSTOM.includes(b)) return false;
      const c = fs.readFileSync(f, 'utf8');
      if (!/<table[\s>]/.test(c)) return false;
      return !/SmartTable|SmartSortBar|TableSortBar/.test(c);
    });
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  it('audit table keeps Symbol ASC default and reset', () => {
    const c = fs.readFileSync(path.join(SRC, 'components/reports/ReconciliationAuditModal.tsx'), 'utf8');
    expect(c).toMatch(/handleResetSort/);
    expect(c).toMatch(/symbol/);
  });
});
