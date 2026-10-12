'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { auth } from '../firebase';
import { strategyStore, StoredMessage, StoredReport } from './store';
import { StrategistMemory, EMPTY_MEMORY, buildContext, buildRecap, condenseSystemPrompt, memoryToPrompt, openActionLines, parseCondensed, reportSystemPrompt, strategistSystemPrompt, PortfolioContextInput } from './memory';
import { ActionStatus, StrategyReport, markdownOnlyReport, parseReport } from './reportSchema';
import { TierConfig } from './tierRouter';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface CallArgs {
  task: 'chat' | 'full_report' | 'revise_plan' | 'condense_memory' | 'json_repair' | 'summarize';
  system: string;
  messages: { role: 'user' | 'assistant'; text: string }[];
  json?: boolean;
}

export interface ModelTag {
  rank: number;
  vendor: string;
  model: string;
}

const tagText = (t?: ModelTag | null) => (t ? `${t.model} (Tier ${t.rank})` : undefined);
const newId = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const THREAD_GAP_MS = 6 * 60 * 60 * 1000;
const CONDENSE_EVERY = 6;

interface Options {
  uid: string | undefined;
  tiers: TierConfig[];
  apiKey?: string;
  getContext: () => PortfolioContextInput;
}

export function useStrategist({ uid, tiers, apiKey, getContext }: Options) {
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [memory, setMemory] = useState<StrategistMemory>(EMPTY_MEMORY);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<null | 'chat' | 'report'>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<string>('');
  const [lastTag, setLastTag] = useState<string | undefined>();
  const threadRef = useRef<string>(newId('t'));
  const pending = useRef<(() => Promise<void>)[]>([]);
  const sinceCondense = useRef(0);

  const track = useCallback(async (op: () => Promise<void>) => {
    setSaveState('saving');
    try {
      await op();
      setSaveState('saved');
      setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch {
      pending.current.push(op);
      setSaveState('error');
    }
  }, []);

  const retrySave = useCallback(async () => {
    const ops = pending.current.splice(0);
    for (const op of ops) await track(op);
  }, [track]);

  const reload = useCallback(async () => {
    if (!uid) return;
    try {
      const res = await strategyStore.loadAll(uid);
      setMessages(res.messages);
      setReports(res.reports);
      setMemory(res.memory);

      if (res.fromCloud) {
        setError(null);
        setSaveState('idle');
      } else {
        setError(`Cloud sync paused: ${res.cloudError || 'insufficient permissions'}. Local cache active.`);
        setSaveState('error');
      }

      const last = res.messages[res.messages.length - 1];
      if (last && Date.now() - Date.parse(last.createdAt) < THREAD_GAP_MS) {
        threadRef.current = last.threadId;
      } else {
        threadRef.current = newId('t');
      }
    } catch (e: any) {
      setError(`Could not load strategist history: ${e?.message || e}`);
    } finally {
      setLoaded(true);
    }
  }, [uid]);

  const retrySync = useCallback(async () => {
    if (!uid) return;
    setError(null);
    setSaveState('saving');
    try {
      await strategyStore.syncLocalToCloud(uid);
      await reload();
    } catch (e: any) {
      setError(`Could not sync to cloud: ${e?.message || e}`);
      setSaveState('error');
    }
  }, [uid, reload]);

  useEffect(() => {
    setLoaded(false);
    reload();
  }, [reload]);

  const call = useCallback(
    async (a: CallArgs): Promise<{ text: string; tag: ModelTag }> => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Please sign in again to use the strategist.');
      const res = await fetch('/api/strategist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...a, tiers, apiKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `Strategist request failed (${res.status})`);
      return { text: data.text, tag: data.tier };
    },
    [tiers, apiKey]
  );

  const latestReport = reports[reports.length - 1];

  const condense = useCallback(
    async (msgs: StoredMessage[], current: StoredReport | undefined) => {
      if (!uid) return;
      try {
        const convo = msgs.slice(-14).map((m) => `${m.role === 'user' ? 'Client' : 'Strategist'}: ${m.text.slice(0, 600)}`).join('\n');
        const r = await call({
          task: 'condense_memory',
          system: condenseSystemPrompt(),
          messages: [{ role: 'user', text: `${memoryToPrompt(memory)}\n\nNEW CONVERSATION:\n${convo}` }],
          json: true,
        });
        const next = parseCondensed(r.text, memory, openActionLines(current?.report.actions || []));
        setMemory(next);
        await track(() => strategyStore.saveMemory(uid, next));
      } catch {
        /* memory condensing is best effort; chat already saved */
      }
    },
    [uid, call, memory, track]
  );

  const addMessage = useCallback(
    async (role: 'user' | 'assistant', text: string, modelTag?: string) => {
      if (!uid) return null;
      const m: StoredMessage = { id: newId('m'), threadId: threadRef.current, role, text, createdAt: new Date().toISOString(), ...(modelTag ? { modelTag } : {}) };
      setMessages((prev) => [...prev, m]);
      await track(() => strategyStore.saveMessage(uid, m));
      return m;
    },
    [uid, track]
  );

  const send = useCallback(
    async (text: string) => {
      if (!uid || !text.trim() || busy) return;
      setError(null);
      setBusy('chat');
      const user = await addMessage('user', text.trim());
      try {
        const history = [...messages, ...(user ? [user] : [])].slice(-10).map((m) => ({ role: m.role, text: m.text }));
        const ctx = buildContext({ ...getContext(), latestReportSummary: latestReport?.summary }, memory);
        const r = await call({ task: 'chat', system: `${strategistSystemPrompt()}\n\n${ctx}`, messages: history });
        setLastTag(tagText(r.tag));
        const ai = await addMessage('assistant', r.text, tagText(r.tag));
        sinceCondense.current += 2;
        if (sinceCondense.current >= CONDENSE_EVERY && ai) {
          sinceCondense.current = 0;
          void condense([...messages, ...(user ? [user] : []), ai], latestReport);
        }
      } catch (e: any) {
        setError(e?.message || 'Strategist unavailable');
      } finally {
        setBusy(null);
      }
    },
    [uid, busy, addMessage, messages, getContext, latestReport, memory, call, condense]
  );

  const makeReport = useCallback(
    async (mode: 'full_report' | 'revise_plan') => {
      if (!uid || busy) return;
      setError(null);
      setBusy('report');
      try {
        const base = getContext();
        const ctx = buildContext({ ...base, latestReportSummary: latestReport?.summary }, memory);
        const recent = messages.slice(-10).map((m) => `${m.role === 'user' ? 'Client' : 'Strategist'}: ${m.text.slice(0, 500)}`).join('\n');
        const prompt =
          mode === 'full_report'
            ? 'Produce the full yield strategy report for this portfolio now.'
            : `Revise the plan using our recent discussion and explain what changed from the previous version.\n\nRECENT DISCUSSION:\n${recent}\n\nPREVIOUS ACTIONS:\n${JSON.stringify(latestReport?.report.actions.map((a) => ({ title: a.title, status: a.status })) || [])}`;
        const r = await call({ task: mode, system: `${reportSystemPrompt()}\n\n${ctx}`, messages: [{ role: 'user', text: prompt }], json: true });
        let parsed = parseReport(r.text);
        if (!parsed.ok) {
          try {
            const fix = await call({ task: 'json_repair', system: 'Return ONLY valid JSON matching the requested shape. Fix the broken JSON; do not change its content.', messages: [{ role: 'user', text: r.text.slice(0, 11000) }], json: true });
            parsed = parseReport(fix.text);
          } catch {
            /* fall through to markdown-only */
          }
        }
        const report: StrategyReport = parsed.ok ? parsed.report : markdownOnlyReport(r.text);
        const version = (reports[reports.length - 1]?.version || 0) + 1;
        const nowIso = new Date().toISOString();
        const stored: StoredReport = {
          id: newId('r'),
          version,
          createdAt: nowIso,
          targetApy: base.targetApy,
          currentApy: base.currentApy,
          risk: base.risk,
          modelTag: tagText(r.tag),
          report,
          summary: (report.summary || report.headline || report.markdown).slice(0, 600),
        };
        setLastTag(tagText(r.tag));
        setReports((p) => [...p, stored]);

        // Auto-record consultation turn into conversation messages so both Conversations tab and Chat reflect report generation
        const userTurn: StoredMessage = {
          id: newId('m'),
          threadId: threadRef.current,
          role: 'user',
          text:
            mode === 'full_report'
              ? `Generate Yield Strategy Report (Target APY: ${base.targetApy}%, Current APY: ${base.currentApy.toFixed(2)}%, Risk: ${base.risk})`
              : `Revise Yield Strategy Plan (Target APY: ${base.targetApy}%)`,
          createdAt: nowIso,
        };
        const assistantSummary = report.summary || (report.markdown ? report.markdown.slice(0, 300) : '');
        const assistantTurn: StoredMessage = {
          id: newId('m'),
          threadId: threadRef.current,
          role: 'assistant',
          text: `**${report.headline}** (Report v${version})\n\n${assistantSummary}`,
          createdAt: new Date(Date.now() + 50).toISOString(),
          modelTag: tagText(r.tag),
        };

        const updatedMessages = [...messages, userTurn, assistantTurn];
        setMessages(updatedMessages);

        await track(async () => {
          await strategyStore.saveReport(uid, stored);
          await strategyStore.saveMessage(uid, userTurn);
          await strategyStore.saveMessage(uid, assistantTurn);
        });

        sinceCondense.current += 2;
        void condense(updatedMessages, stored);
      } catch (e: any) {
        setError(e?.message || 'Could not generate the report');
      } finally {
        setBusy(null);
      }
    },
    [uid, busy, getContext, latestReport, memory, messages, reports, call, track, condense]
  );

  const setActionStatus = useCallback(
    async (reportId: string, actionId: string, status: ActionStatus) => {
      if (!uid) return;
      const base = reports.find((r) => r.id === reportId);
      if (!base) return;
      const next: StoredReport = { ...base, report: { ...base.report, actions: base.report.actions.map((a) => (a.id === actionId ? { ...a, status } : a)) } };
      setReports((prev) => prev.map((r) => (r.id === reportId ? next : r)));
      await track(() => strategyStore.updateReport(uid, next));
    },
    [uid, reports, track]
  );

  const rebuildMemory = useCallback(
    async (remaining: StoredMessage[]) => {
      if (!uid) return;
      const convo = remaining.slice(-14).map((m) => `${m.role === 'user' ? 'Client' : 'Strategist'}: ${m.text.slice(0, 600)}`).join('\n');
      const open = openActionLines(latestReport?.report.actions || []);
      let next: StrategistMemory = { ...EMPTY_MEMORY, openActions: open, updatedAt: new Date().toISOString() };
      if (convo) {
        const r = await call({ task: 'condense_memory', system: condenseSystemPrompt(), messages: [{ role: 'user', text: `${memoryToPrompt(EMPTY_MEMORY)}\n\nNEW CONVERSATION:\n${convo}` }], json: true });
        next = parseCondensed(r.text, EMPTY_MEMORY, open);
      }
      setMemory(next);
      await track(() => strategyStore.saveMemory(uid, next));
    },
    [uid, call, latestReport, track]
  );

  const recap = loaded ? buildRecap(memory, latestReport?.createdAt) : null;

  return {
    loaded, messages, reports, latestReport, memory, setMemory, recap,
    busy, error, saveState, savedAt, lastTag,
    send, generate: () => makeReport('full_report'), revise: () => makeReport('revise_plan'),
    setActionStatus, retrySave, retrySync, reload, rebuildMemory,
    saveMemoryEdit: async (m: StrategistMemory) => {
      if (!uid) return;
      setMemory(m);
      await track(() => strategyStore.saveMemory(uid, m));
    },
  };
}
