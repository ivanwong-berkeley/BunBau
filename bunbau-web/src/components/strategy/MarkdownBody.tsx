'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DISCLAIMER } from '../../lib/strategist/reportSchema';

/**
 * Formatted (human readable) Markdown. Raw HTML is NOT rendered (react-markdown default),
 * which prevents HTML/script injection from AI output.
 */
export function MarkdownBody({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`strategy-md text-sm leading-relaxed text-slate-700 dark:text-slate-200 ${className}`} data-testid="strategy-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="text-xl font-bold mt-5 mb-2 text-slate-900 dark:text-white" {...p} />,
          h2: (p) => <h2 className="text-lg font-bold mt-5 mb-2 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-1" {...p} />,
          h3: (p) => <h3 className="text-base font-semibold mt-4 mb-1.5 text-slate-900 dark:text-white" {...p} />,
          h4: (p) => <h4 className="text-sm font-semibold mt-3 mb-1 text-slate-800 dark:text-slate-100" {...p} />,
          p: (p) => <p className="my-2" {...p} />,
          ul: (p) => <ul className="list-disc pl-5 my-2 space-y-1" {...p} />,
          ol: (p) => <ol className="list-decimal pl-5 my-2 space-y-1" {...p} />,
          strong: (p) => <strong className="font-semibold text-slate-900 dark:text-white" {...p} />,
          hr: () => <hr className="my-4 border-slate-200 dark:border-slate-700" />,
          blockquote: (p) => <blockquote className="border-l-4 border-primary-amber/60 bg-amber-50/60 dark:bg-amber-950/20 pl-3 py-1 my-3 rounded-r" {...p} />,
          code: (p) => <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[12px]" {...p} />,
          a: (p) => <a className="text-primary-violet underline" target="_blank" rel="noopener noreferrer" {...p} />,
          table: (p) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full text-xs border border-slate-200 dark:border-slate-700 rounded" {...p} />
            </div>
          ),
          thead: (p) => <thead className="bg-slate-100 dark:bg-slate-800" {...p} />,
          th: (p) => <th className="px-2 py-1.5 text-left font-semibold border-b border-slate-200 dark:border-slate-700" {...p} />,
          td: (p) => <td className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800" {...p} />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export function DisclaimerFooter() {
  return (
    <p className="mt-6 pt-3 border-t border-slate-200 dark:border-slate-700 text-[11px] italic text-slate-500" data-testid="strategy-disclaimer">
      {DISCLAIMER}
    </p>
  );
}
