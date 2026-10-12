'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';
import { PortfolioContextInput } from '../../lib/strategist/memory';
import { buildTerminalScript, formatLogsForClipboard, TerminalLogStep } from '../../lib/strategist/terminalScript';

interface StrategistTerminalProps {
  context?: PortfolioContextInput;
}

interface LogEntry {
  timestamp: string;
  prefix: string;
  text: string;
  color?: string;
}

export function StrategistTerminal({ context }: StrategistTerminalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalNW = context?.totalValue
    ? `$${context.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '$2,034,759.91';
  const gap =
    context?.targetApy !== undefined && context?.currentApy !== undefined
      ? `-${(context.targetApy - context.currentApy).toFixed(2)}%`
      : '-8.47%';

  const script = useMemo(() => buildTerminalScript(context), [context]);

  useEffect(() => {
    const startTime = Date.now();
    const timeouts: NodeJS.Timeout[] = [];

    script.forEach((step) => {
      const t = setTimeout(() => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        setLogs((prev) => [
          ...prev,
          {
            timestamp: `[+${elapsed}s]`,
            prefix: step.prefix,
            text: step.text,
            color: step.color,
          },
        ]);
      }, step.delay);
      timeouts.push(t);
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  // Auto-scroll to bottom on each new log
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopy = () => {
    const fullText = formatLogsForClipboard(logs);
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      data-testid="strategist-terminal"
      className="rounded-xl border border-gray-800 bg-black/95 overflow-hidden shadow-2xl flex flex-col font-mono text-xs h-[520px]"
    >
      {/* Terminal Window Header */}
      <div className="flex justify-between items-center px-4 py-2.5 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/90" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/90" />
          <div className="w-3 h-3 rounded-full bg-green-500/90" />
          <span className="text-gray-300 ml-2 flex items-center gap-1.5 font-bold tracking-tight">
            <Terminal size={14} className="text-emerald-400" />
            bunbau_yield_strategy_terminal
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            Generating Report
          </div>
          <button
            type="button"
            onClick={handleCopy}
            data-testid="terminal-copy-btn"
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded transition cursor-pointer"
            title="Copy Terminal Logs to Clipboard"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy Logs</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Terminal Log Stream Body */}
      <div
        ref={scrollRef}
        data-testid="terminal-log-stream"
        className="flex-1 p-5 font-mono text-xs text-emerald-400 space-y-2 overflow-y-auto"
      >
        {logs.map((l, i) => (
          <div key={i} className="leading-relaxed flex items-start gap-2">
            <span className="text-emerald-600/80 shrink-0 select-none">{l.timestamp}</span>
            <span className="text-emerald-300 font-bold shrink-0">{l.prefix}</span>
            <span className="text-emerald-400/95">{l.text}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 text-emerald-300">
          <span className="animate-pulse font-bold text-sm">_</span>
        </div>
      </div>

      {/* Terminal Status Footer */}
      <div className="px-4 py-2 bg-gray-900/80 border-t border-gray-800/80 text-[11px] text-gray-400 flex items-center justify-between shrink-0">
        <span>Portfolio: {totalNW} · Gap: {gap}</span>
        <span className="text-emerald-400/80 animate-pulse">Running quantitative optimization...</span>
      </div>
    </div>
  );
}
