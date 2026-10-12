'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, Send, Sparkles } from 'lucide-react';
import { StoredMessage } from '../../lib/strategist/store';
import { SaveState } from '../../lib/strategist/useStrategist';
import { getSaveIndicatorDescriptor } from '../../lib/strategist/saveIndicator';
import { MarkdownBody } from './MarkdownBody';

export function SaveIndicator({ state, savedAt, onRetry, hasSavedItems }: { state: SaveState; savedAt: string; onRetry: () => void; hasSavedItems?: boolean }) {
  const desc = getSaveIndicatorDescriptor(state, savedAt, hasSavedItems);
  if (desc.isRetry) {
    return (
      <button type="button" onClick={onRetry} className={desc.className} data-testid="save-indicator">
        {desc.label}
      </button>
    );
  }
  return (
    <span className={desc.className} data-testid="save-indicator">
      {desc.label}
    </span>
  );
}

/** Chat with the strategist. The page context and long-term memory are attached automatically on every turn. */
export function StrategistChat({
  messages,
  recap,
  busy,
  error,
  onSend,
  onGenerate,
  onRevise,
  hasReport,
  modelTag,
}: {
  messages: StoredMessage[];
  recap: string | null;
  busy: null | 'chat' | 'report';
  error: string | null;
  onSend: (t: string) => void;
  onGenerate: () => void;
  onRevise: () => void;
  hasReport: boolean;
  modelTag?: string;
}) {
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length, busy]);

  const submit = () => {
    if (!text.trim() || busy) return;
    onSend(text);
    setText('');
  };

  return (
    <div className="flex flex-col h-[62vh]" data-testid="strategist-chat">
      <div className="flex gap-2 pb-2">
        <button type="button" onClick={onGenerate} disabled={!!busy} data-testid="generate-report" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-primary-violet to-purple-600 text-white disabled:opacity-50">
          {busy === 'report' ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Generate report
        </button>
        <button type="button" onClick={onRevise} disabled={!!busy || !hasReport} data-testid="revise-plan" title={hasReport ? 'Create a new report version from this discussion' : 'Generate a report first'} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-primary-violet/50 text-primary-violet disabled:opacity-40">
          <RefreshCw size={13} /> Revise plan
        </button>
        {modelTag && <span className="ml-auto self-center text-[10px] font-mono text-slate-400" data-testid="model-tag">model: {modelTag}</span>}
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1" data-testid="chat-scroll">
        {recap && (
          <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 p-3 text-xs" data-testid="strategist-recap">{recap}</div>
        )}
        {messages.length === 0 && !recap && <p className="text-xs text-slate-500">Ask your strategist anything about this portfolio. It already sees your allocation, target and risk profile, and it remembers earlier discussions.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`} data-testid={`chat-${m.role}`}>
            <div className={`max-w-[88%] rounded-2xl px-3 py-2 ${m.role === 'user' ? 'bg-primary-violet text-white text-sm' : 'bg-slate-100 dark:bg-slate-800'}`}>
              {m.role === 'user' ? m.text : <MarkdownBody text={m.text} />}
              {m.modelTag && m.role === 'assistant' && <p className="mt-1 text-[10px] font-mono text-slate-400">{m.modelTag}</p>}
            </div>
          </div>
        ))}
        {busy === 'chat' && <p className="text-xs text-slate-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Strategist is thinking…</p>}
        <div ref={endRef} />
      </div>
      {error && <p className="text-xs text-rose-500 mt-1" role="alert" data-testid="strategist-error">{error}</p>}
      <div className="flex gap-2 pt-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder="Discuss the plan… (Enter to send, Shift+Enter for a new line)"
          data-testid="chat-input"
          className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm resize-none"
        />
        <button type="button" onClick={submit} disabled={!text.trim() || !!busy} aria-label="Send" data-testid="chat-send" className="px-3 rounded-lg bg-primary-violet text-white disabled:opacity-40"><Send size={16} /></button>
      </div>
    </div>
  );
}
