'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Info, HelpCircle, CheckCircle2, ArrowUpDown, ZoomIn, Maximize2, RotateCcw } from 'lucide-react';

export interface InfoDefinitionItem {
  term: string;
  definition: string;
  badge?: string;
  badgeColor?: string;
}

export interface ShortcutItem {
  action: string;
  description: string;
}

export interface ContainerInfoPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  description?: string;
  definitions?: InfoDefinitionItem[];
  shortcuts?: ShortcutItem[];
  testId?: string;
}

export function ContainerInfoPopover({
  isOpen,
  onClose,
  title,
  subtitle,
  description,
  definitions = [],
  shortcuts = [],
  testId = 'container-info-popover',
}: ContainerInfoPopoverProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.stopPropagation();
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid={testId}
    >
      <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 animate-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Info size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {title}
              </h4>
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="info-popover-close-btn"
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {description && (
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
              {description}
            </p>
          )}

          {/* Column Definitions & Glossary */}
          {definitions.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <HelpCircle size={13} /> Column Definitions & Audit Metrics
              </span>
              <div className="divide-y divide-gray-100 dark:divide-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden">
                {definitions.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-white dark:bg-slate-900 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {item.term}
                      </span>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            item.badgeColor || 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-500 dark:text-gray-400 leading-normal text-[11px]">
                      {item.definition}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Standard UX & Operational Shortcuts */}
          {shortcuts.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Standard UX & Table Controls
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {shortcuts.map((sc, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40 space-y-0.5"
                  >
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px] block">
                      {sc.action}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {sc.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/80 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">BunBau Standard UX Feature</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
