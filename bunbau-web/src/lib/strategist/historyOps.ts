/** Pure helpers for the strategist History manager (typed-phrase deletes, date ranges, chunking). */

export type DeleteKind = 'chat' | 'reports' | 'selected' | 'memory' | 'everything';

export interface PhraseOpts {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  all?: boolean;
  count?: number;
}

/** The exact phrase the user must type. */
export function deletePhrase(kind: DeleteKind, o: PhraseOpts = {}): string {
  switch (kind) {
    case 'chat':
      return o.all ? 'Delete all strategist chat' : `Delete chat from ${o.from ?? ''} to ${o.to ?? ''}`;
    case 'reports':
      return o.all ? 'Delete all strategist reports' : `Delete reports from ${o.from ?? ''} to ${o.to ?? ''}`;
    case 'selected':
      return `Delete ${o.count ?? 0} selected items`;
    case 'memory':
      return 'Delete strategist memory';
    case 'everything':
      return 'Delete all strategist history';
  }
}

/** Strict: case-sensitive, no trimming (same convention as the existing delete dialogs). */
export function phraseMatches(input: string, expected: string): boolean {
  return expected !== '' && input === expected;
}

export function validateRange(from?: string, to?: string, all?: boolean): string | null {
  if (all) return null;
  if (!from || !to) return 'Choose both From and To dates, or tick ALL.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return 'Dates must be valid.';
  if (from > to) return 'From date cannot be after To date.';
  return null;
}

/** Inclusive local-time bounds: start of From day to end of To day. */
export function rangeBounds(from: string, to: string): { start: number; end: number } {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return {
    start: new Date(fy, fm - 1, fd, 0, 0, 0, 0).getTime(),
    end: new Date(ty, tm - 1, td, 23, 59, 59, 999).getTime(),
  };
}

export function inRange(iso: string, from?: string, to?: string, all?: boolean): boolean {
  if (all) return true;
  if (!from || !to || validateRange(from, to, false)) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  const { start, end } = rangeBounds(from, to);
  return t >= start && t <= end;
}

export function selectInRange<T extends { createdAt: string }>(items: readonly T[], from?: string, to?: string, all?: boolean): T[] {
  return items.filter((i) => inRange(i.createdAt, from, to, all));
}

/** Firestore allows 500 writes per batch; stay below it. */
export const BATCH_LIMIT = 400;

export function chunk<T>(arr: readonly T[], size = BATCH_LIMIT): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export interface PreviewCounts {
  messages: number;
  threads: number;
  reports: number;
  memory: boolean;
}

export function previewText(c: PreviewCounts, from?: string, to?: string, all?: boolean): string {
  const bits: string[] = [];
  if (c.messages || c.threads) bits.push(`${c.messages} message${c.messages === 1 ? '' : 's'} in ${c.threads} conversation${c.threads === 1 ? '' : 's'}`);
  if (c.reports) bits.push(`${c.reports} report version${c.reports === 1 ? '' : 's'}`);
  if (c.memory) bits.push('the strategist memory file');
  const what = bits.length ? bits.join(', ') : 'nothing (no matching items)';
  const when = all ? '' : ` (${from} to ${to})`;
  return `This will permanently delete ${what}${when}.`;
}

export interface ThreadRow {
  threadId: string;
  startedAt: string;
  count: number;
  preview: string;
  ids: string[];
}

export function groupThreads(messages: readonly { id: string; threadId: string; createdAt: string; role: string; text: string }[]): ThreadRow[] {
  const map = new Map<string, ThreadRow>();
  for (const m of [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const t = map.get(m.threadId);
    if (t) {
      t.count += 1;
      t.ids.push(m.id);
      if (m.role === 'user' && (!t.preview || t.preview.startsWith('Assistant:'))) {
        t.preview = m.text.slice(0, 80);
      }
    } else {
      const initialPreview = m.role === 'user' ? m.text.slice(0, 80) : `Assistant: ${m.text.slice(0, 70)}`;
      map.set(m.threadId, {
        threadId: m.threadId,
        startedAt: m.createdAt,
        count: 1,
        ids: [m.id],
        preview: initialPreview,
      });
    }
  }
  return [...map.values()];
}

export function countDistinct(ids: readonly string[]): number {
  return new Set(ids).size;
}
