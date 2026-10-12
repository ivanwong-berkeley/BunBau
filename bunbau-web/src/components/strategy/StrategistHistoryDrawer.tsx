'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Trash2, X } from 'lucide-react';
import { SmartTable } from '../common/SmartTable';
import { DestructiveConfirmDialog } from '../common/DestructiveConfirmDialog';
import { StoredMessage, StoredReport, strategyStore } from '../../lib/strategist/store';
import { StrategistMemory, capMemory } from '../../lib/strategist/memory';
import { DeleteKind, PhraseOpts, countDistinct, deletePhrase, groupThreads, previewText, selectInRange, validateRange, ThreadRow } from '../../lib/strategist/historyOps';
import { MarkdownBody } from './MarkdownBody';

type Tab = 'chat' | 'reports' | 'memory';

interface Pending {
  kind: DeleteKind;
  opts: PhraseOpts;
  messageIds: string[];
  reportIds: string[];
  memory: boolean;
}

const MEM_FIELDS: { key: keyof StrategistMemory; label: string }[] = [
  { key: 'goals', label: 'Goals' },
  { key: 'constraints', label: 'Constraints' },
  { key: 'decisions', label: 'Decisions made' },
  { key: 'lessons', label: 'Lessons' },
];

export function StrategistHistoryDrawer({
  isOpen,
  onClose,
  uid,
  messages,
  reports,
  memory,
  onReload,
  onSaveMemory,
  onRebuildMemory,
}: {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
  messages: StoredMessage[];
  reports: StoredReport[];
  memory: StrategistMemory;
  onReload: () => Promise<void>;
  onSaveMemory: (m: StrategistMemory) => Promise<void>;
  onRebuildMemory: (remaining: StoredMessage[]) => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>(() => (messages.length === 0 && reports.length > 0 ? 'reports' : 'chat'));
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [all, setAll] = useState(false);
  const [selThreads, setSelThreads] = useState<Set<string>>(new Set());
  const [selReports, setSelReports] = useState<Set<string>>(new Set());
  const [refreshedAt, setRefreshedAt] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [rebuild, setRebuild] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [resultMsg, setResultMsg] = useState('');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [viewingThreadId, setViewingThreadId] = useState<string | null>(null);
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (messages.length === 0 && reports.length > 0) {
        setTab('reports');
      }
      setViewingThreadId(null);
      setViewingReportId(null);
    }
  }, [isOpen, messages.length, reports.length]);

  const threads = useMemo(() => groupThreads(messages), [messages]);
  const rangeErr = validateRange(from, to, all);

  if (!isOpen) return null;

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onReload();
      setRefreshedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } finally {
      setRefreshing(false);
    }
  };

  const toggle = (set: Set<string>, id: string, fn: (s: Set<string>) => void) => {
    const n = new Set(set);
    n.has(id) ? n.delete(id) : n.add(id);
    fn(n);
  };

  const askRangeDelete = (kind: 'chat' | 'reports') => {
    if (rangeErr) {
      setResultMsg(rangeErr);
      return;
    }
    const opts: PhraseOpts = { from, to, all };
    if (kind === 'chat') {
      const ms = selectInRange(messages, from, to, all);
      setPending({ kind, opts, messageIds: ms.map((m) => m.id), reportIds: [], memory: false });
    } else {
      const rs = selectInRange(reports, from, to, all);
      setPending({ kind, opts, messageIds: [], reportIds: rs.map((r) => r.id), memory: false });
    }
    setResultMsg('');
  };

  const askSelectedDelete = () => {
    const mIds = threads.filter((t) => selThreads.has(t.threadId)).flatMap((t) => t.ids);
    const rIds = reports.filter((r) => selReports.has(r.id)).map((r) => r.id);
    if (!mIds.length && !rIds.length) {
      setResultMsg('Tick one or more rows first.');
      return;
    }
    setPending({ kind: 'selected', opts: { count: selThreads.size + selReports.size }, messageIds: mIds, reportIds: rIds, memory: false });
    setResultMsg('');
  };

  const askMemoryDelete = () => setPending({ kind: 'memory', opts: {}, messageIds: [], reportIds: [], memory: true });
  const askEverything = () =>
    setPending({ kind: 'everything', opts: {}, messageIds: messages.map((m) => m.id), reportIds: reports.map((r) => r.id), memory: true });

  const execute = async () => {
    if (!pending) return;
    const total = pending.messageIds.length + pending.reportIds.length;
    let done = 0;
    setProgress({ done: 0, total });
    let deletedMsgs = 0;
    let deletedReports = 0;
    if (pending.messageIds.length) {
      deletedMsgs = await strategyStore.deleteIds(uid, 'messages', pending.messageIds, (d) => setProgress({ done: d, total }));
      done += deletedMsgs;
    }
    if (pending.reportIds.length) {
      deletedReports = await strategyStore.deleteIds(uid, 'reports', pending.reportIds, (d) => setProgress({ done: done + d, total }));
    }
    if (pending.memory) await strategyStore.deleteMemory(uid);
    const gone = new Set(pending.messageIds);
    const remaining = messages.filter((m) => !gone.has(m.id));
    if (rebuild && !pending.memory && pending.messageIds.length) {
      try {
        await onRebuildMemory(remaining);
      } catch {
        /* memory rebuild is best effort; chat deletion already done */
      }
    }
    setSelThreads(new Set());
    setSelReports(new Set());
    setPending(null);
    setProgress(null);
    setRebuild(false);
    setResultMsg(`Deleted ${deletedMsgs} message${deletedMsgs === 1 ? '' : 's'}, ${deletedReports} report version${deletedReports === 1 ? '' : 's'}${pending.memory ? ', and the memory file' : ''}.`);
    await refresh();
  };

  const counts = pending
    ? { messages: pending.messageIds.length, threads: countDistinct(messages.filter((m) => pending.messageIds.includes(m.id)).map((m) => m.threadId)), reports: pending.reportIds.length, memory: pending.memory }
    : { messages: 0, threads: 0, reports: 0, memory: false };

  const dialogTitle = pending
    ? { chat: 'Delete conversations', reports: 'Delete report versions', selected: 'Delete selected items', memory: 'Delete strategist memory', everything: 'Delete all strategist history' }[pending.kind]
    : '';

  const saveMemoryDraft = async () => {
    const next: Partial<StrategistMemory> = { ...memory };
    for (const f of MEM_FIELDS) {
      const raw = draft[f.key as string];
      if (raw !== undefined) (next as any)[f.key] = raw.split('\n').map((s) => s.trim()).filter(Boolean);
    }
    if (draft.summary !== undefined) next.summary = draft.summary;
    await onSaveMemory(capMemory({ ...next, updatedAt: new Date().toISOString() }));
    setDraft({});
    setResultMsg('Memory saved. The next reply will use it.');
  };

  const rangeControls = (
    <div className="flex flex-wrap items-end gap-3 text-xs" data-testid="history-range">
      <label className="flex flex-col gap-1">From
        <input type="date" value={from} disabled={all} onChange={(e) => setFrom(e.target.value)} data-testid="history-from" className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 disabled:opacity-40" />
      </label>
      <label className="flex flex-col gap-1">To
        <input type="date" value={to} disabled={all} onChange={(e) => setTo(e.target.value)} data-testid="history-to" className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 disabled:opacity-40" />
      </label>
      <label className="flex items-center gap-1.5 pb-1">
        <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} data-testid="history-all" /> ALL
      </label>
      {rangeErr && !all && (from || to) && <span className="text-rose-500 pb-1">{rangeErr}</span>}
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 z-[80]" onClick={onClose} />
      <aside role="dialog" aria-label="Strategist history" className="fixed right-0 top-0 bottom-0 w-full max-w-2xl z-[80] bg-white dark:bg-slate-900 shadow-2xl flex flex-col" data-testid="strategist-history">
        <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Strategist history</h2>
            <p className="text-[11px] text-slate-500" data-testid="history-refreshed">{refreshedAt ? `Last refreshed ${refreshedAt}` : 'Not refreshed in this session'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={refresh} disabled={refreshing} data-testid="history-refresh" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700">
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
            <button type="button" onClick={onClose} aria-label="Close history" className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
          </div>
        </header>

        <div className="flex gap-1 px-4 pt-3">
          {(['chat', 'reports', 'memory'] as Tab[]).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} data-testid={`history-tab-${t}`} className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${tab === t ? 'bg-primary-violet/15 text-primary-violet' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              {t === 'chat' ? `Conversations (${threads.length})` : t === 'reports' ? `Reports (${reports.length})` : 'Memory file'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {resultMsg && <p className="text-xs rounded bg-slate-100 dark:bg-slate-800 px-3 py-2" role="status" data-testid="history-result">{resultMsg}</p>}

          {tab === 'chat' && (
            viewingThreadId ? (
              <div className="space-y-3" data-testid="thread-dialogue-view">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setViewingThreadId(null)}
                    className="text-xs text-primary-violet font-semibold hover:underline flex items-center gap-1"
                    data-testid="back-to-threads"
                  >
                    ← Back to conversations
                  </button>
                  <span className="text-[11px] text-slate-500 font-mono">Thread: {viewingThreadId}</span>
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {messages
                    .filter((m) => m.threadId === viewingThreadId)
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                    .map((m) => (
                      <div
                        key={m.id}
                        className={`p-3 rounded-lg text-xs leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-primary-violet/10 border border-primary-violet/20 ml-6 text-slate-800 dark:text-slate-100'
                            : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mr-6 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold mb-1 text-[11px] text-slate-500">
                          <span>{m.role === 'user' ? 'You' : 'Strategist'}</span>
                          <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <div className="whitespace-pre-wrap">{m.text}</div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <>
                {threads.length === 0 && reports.length > 0 && (
                  <div
                    className="p-3.5 bg-primary-violet/10 border border-primary-violet/25 rounded-xl flex items-center justify-between gap-3 text-xs"
                    data-testid="switch-to-reports-banner"
                  >
                    <div>
                      <p className="font-bold text-primary-violet">
                        You have {reports.length} saved strategy report{reports.length > 1 ? 's' : ''}
                      </p>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                        Generated portfolio strategy reports and action plans are saved under the Reports tab.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTab('reports')}
                      className="px-3 py-1.5 rounded-lg bg-primary-violet text-white font-semibold text-xs shrink-0 hover:bg-primary-violet/90 transition shadow-sm"
                      data-testid="switch-to-reports-btn"
                    >
                      View Reports ({reports.length}) →
                    </button>
                  </div>
                )}
                {rangeControls}
                <div className="flex gap-2">
                  <button type="button" onClick={() => askRangeDelete('chat')} data-testid="delete-chat-range" className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-500/40 text-red-500 hover:bg-red-500/10">Delete chat in range…</button>
                  <button type="button" onClick={askSelectedDelete} data-testid="delete-selected" className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-500/40 text-red-500 hover:bg-red-500/10">Delete selected…</button>
                </div>
                <SmartTable<ThreadRow>
                  tableId="strategist-threads"
                  title="Strategist conversations"
                  infoDescription="Your saved strategist conversations, grouped by session. Tick rows to delete them."
                  rows={threads}
                  rowKey={(t) => t.threadId}
                  emptyMessage="No saved conversations yet."
                  density="compact"
                  columns={[
                    { key: 'sel', label: '', sortable: false, render: (t) => <input type="checkbox" aria-label="Select conversation" checked={selThreads.has(t.threadId)} onChange={() => toggle(selThreads, t.threadId, setSelThreads)} data-testid={`select-thread-${t.threadId}`} /> },
                    { key: 'startedAt', label: 'Started', render: (t) => new Date(t.startedAt).toLocaleString() },
                    { key: 'count', label: 'Messages', align: 'right' },
                    { key: 'preview', label: 'First question' },
                    {
                      key: 'action',
                      label: 'Action',
                      sortable: false,
                      align: 'center',
                      render: (t) => (
                        <button
                          type="button"
                          onClick={() => setViewingThreadId(t.threadId)}
                          className="text-xs text-primary-violet font-semibold hover:underline"
                          data-testid={`view-thread-${t.threadId}`}
                        >
                          View ({t.count})
                        </button>
                      ),
                    },
                  ]}
                  defaultSort={{ key: 'startedAt', dir: 'asc' }}
                />
              </>
            )
          )}

          {tab === 'reports' && (
            viewingReportId ? (
              <div className="space-y-3" data-testid="report-preview-view">
                {(() => {
                  const rep = reports.find((r) => r.id === viewingReportId);
                  if (!rep) return <p className="text-xs text-slate-500">Report not found.</p>;
                  return (
                    <>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setViewingReportId(null)}
                          className="text-xs text-primary-violet font-semibold hover:underline flex items-center gap-1"
                          data-testid="back-to-reports"
                        >
                          ← Back to reports
                        </button>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                          <span>Version: v{rep.version}</span>
                          <span>·</span>
                          <span>{new Date(rep.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 rounded-xl space-y-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {rep.report.headline || `Strategy Report v${rep.version}`}
                        </h4>
                        <div className="flex items-center gap-3 text-xs font-mono text-slate-600 dark:text-slate-300">
                          <span>Target APY: {rep.targetApy.toFixed(2)}%</span>
                          <span>·</span>
                          <span>Current APY: {rep.currentApy.toFixed(2)}%</span>
                          <span>·</span>
                          <span>Risk: {rep.risk}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl max-h-[55vh] overflow-y-auto pr-2">
                        <MarkdownBody text={rep.report.markdown || rep.summary} />
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <>
                {rangeControls}
                <div className="flex gap-2">
                  <button type="button" onClick={() => askRangeDelete('reports')} data-testid="delete-reports-range" className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-500/40 text-red-500 hover:bg-red-500/10">Delete reports in range…</button>
                  <button type="button" onClick={askSelectedDelete} data-testid="delete-selected-reports" className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-500/40 text-red-500 hover:bg-red-500/10">Delete selected…</button>
                </div>
                <SmartTable<StoredReport>
                  tableId="strategist-reports"
                  title="Strategist report versions"
                  infoDescription="Every saved report version with its summary. Tick rows to delete them."
                  rows={reports}
                  rowKey={(r) => r.id}
                  emptyMessage="No saved reports yet."
                  density="compact"
                  columns={[
                    { key: 'sel', label: '', sortable: false, render: (r) => <input type="checkbox" aria-label="Select report" checked={selReports.has(r.id)} onChange={() => toggle(selReports, r.id, setSelReports)} data-testid={`select-report-${r.version}`} /> },
                    { key: 'version', label: 'Version', render: (r) => `v${r.version}`, sortValue: (r) => r.version },
                    { key: 'createdAt', label: 'Created', render: (r) => new Date(r.createdAt).toLocaleString() },
                    { key: 'modelTag', label: 'Model' },
                    { key: 'summary', label: 'Summary', render: (r) => <span className="line-clamp-2">{r.summary}</span> },
                    {
                      key: 'action',
                      label: 'Action',
                      sortable: false,
                      align: 'center',
                      render: (r) => (
                        <button
                          type="button"
                          onClick={() => setViewingReportId(r.id)}
                          className="text-xs text-primary-violet font-semibold hover:underline"
                          data-testid={`view-report-${r.version}`}
                        >
                          View
                        </button>
                      ),
                    },
                  ]}
                />
              </>
            )
          )}

          {tab === 'memory' && (
            <div className="space-y-3" data-testid="memory-editor">
              <p className="text-xs text-slate-500">This is what the strategist remembers about you. Correct anything that is wrong; the next reply uses your edits.</p>
              <label className="block text-xs font-semibold">Summary
                <textarea defaultValue={memory.summary} onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))} data-testid="memory-summary" rows={3} className="mt-1 w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs font-normal" />
              </label>
              {MEM_FIELDS.map((f) => (
                <label key={f.key} className="block text-xs font-semibold">{f.label} (one per line)
                  <textarea defaultValue={(memory[f.key] as string[]).join('\n')} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} data-testid={`memory-${f.key}`} rows={3} className="mt-1 w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs font-normal" />
                </label>
              ))}
              <div>
                <p className="text-xs font-semibold">Open actions (from your latest report)</p>
                <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300">{memory.openActions.length ? memory.openActions.map((a, i) => <li key={i}>{a}</li>) : <li>None</li>}</ul>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={saveMemoryDraft} disabled={!Object.keys(draft).length} data-testid="memory-save" className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-violet text-white disabled:opacity-40">Save memory edits</button>
                <button type="button" onClick={askMemoryDelete} data-testid="delete-memory" className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-500/40 text-red-500 hover:bg-red-500/10">Delete memory…</button>
              </div>
            </div>
          )}
        </div>

        <footer className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <p className="text-[11px] text-slate-500">Deleting is permanent. Every delete asks you to type a confirmation phrase.</p>
          <button type="button" onClick={askEverything} data-testid="delete-everything" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white">
            <Trash2 size={13} /> Delete all strategist history…
          </button>
        </footer>
      </aside>

      <DestructiveConfirmDialog
        isOpen={!!pending}
        title={dialogTitle}
        preview={pending ? previewText(counts, pending.opts.from, pending.opts.to, pending.opts.all || pending.kind === 'everything') : ''}
        phrase={pending ? deletePhrase(pending.kind, pending.opts) : ''}
        onConfirm={execute}
        onClose={() => { setPending(null); setProgress(null); }}
        progress={progress}
      >
        {pending && pending.messageIds.length > 0 && !pending.memory && (
          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" checked={rebuild} onChange={(e) => setRebuild(e.target.checked)} data-testid="rebuild-memory" className="mt-0.5" />
            Also rebuild the memory file from the remaining conversations (uses one AI call). Leave unticked to keep the memory as it is.
          </label>
        )}
      </DestructiveConfirmDialog>
    </>
  );
}
