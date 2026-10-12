'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Building2,
  CheckSquare,
  Square,
  MinusSquare,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  Wallet,
  Layers,
  Filter,
} from 'lucide-react';
import { CanonicalAccount, CanonicalPosition } from '../../lib/portfolio/types';
import { buildConsolidatedReport } from '../../lib/reports/consolidatedReport';
import { generateConsolidatedReportCsv, downloadCsvFile } from '../../lib/reports/csvExporter';

interface AccountSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: CanonicalAccount[];
  positions: CanonicalPosition[];
  onPreviewReport: (accountIds: string[]) => void;
  isSidebarExpanded?: boolean;
}

export function AccountSelectionModal({
  isOpen,
  onClose,
  accounts,
  positions,
  onPreviewReport,
  isSidebarExpanded = true,
}: AccountSelectionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(
    () => new Set(accounts.map((a) => a.id))
  );
  const [expandedInstitutions, setExpandedInstitutions] = useState<Set<string>>(
    () => new Set(accounts.map((a) => a.institution))
  );

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync selected accounts whenever accounts prop changes
  useEffect(() => {
    if (isOpen) {
      setSelectedAccountIds(new Set(accounts.map((a) => a.id)));
      setExpandedInstitutions(new Set(accounts.map((a) => a.institution)));
    }
  }, [isOpen, accounts]);

  // Keyboard navigation: Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Group accounts by institution
  const groupedByInstitution = new Map<string, CanonicalAccount[]>();
  accounts.forEach((a) => {
    if (!groupedByInstitution.has(a.institution)) {
      groupedByInstitution.set(a.institution, []);
    }
    groupedByInstitution.get(a.institution)!.push(a);
  });

  const allSelected = accounts.length > 0 && selectedAccountIds.size === accounts.length;
  const someSelected = selectedAccountIds.size > 0 && selectedAccountIds.size < accounts.length;

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedAccountIds(new Set());
    } else {
      setSelectedAccountIds(new Set(accounts.map((a) => a.id)));
    }
  };

  const handleToggleInstitution = (inst: string) => {
    const instAccounts = groupedByInstitution.get(inst) || [];
    const instAccountIds = instAccounts.map((a) => a.id);
    const allInstSelected = instAccountIds.every((id) => selectedAccountIds.has(id));

    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (allInstSelected) {
        instAccountIds.forEach((id) => next.delete(id));
      } else {
        instAccountIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleToggleAccount = (id: string) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleExpandInstitution = (inst: string) => {
    setExpandedInstitutions((prev) => {
      const next = new Set(prev);
      if (next.has(inst)) {
        next.delete(inst);
      } else {
        next.add(inst);
      }
      return next;
    });
  };

  // Compute selected total worth
  const selectedPositions = positions.filter((p) => selectedAccountIds.has(p.accountId));
  const selectedWorth = selectedPositions
    .filter((p) => p.assetClass !== 'CSP' && p.assetClass !== 'CoveredCall')
    .reduce((s, p) => s + p.marketValue, 0);

  const handleDownloadCsv = () => {
    if (selectedAccountIds.size === 0) {
      alert('Please select at least one account.');
      return;
    }
    const report = buildConsolidatedReport(positions, accounts, {
      filterAccountIds: Array.from(selectedAccountIds),
      reportTitle: 'Custom Filtered Account Audit Report',
    });
    const csv = generateConsolidatedReportCsv(report);
    downloadCsvFile(csv, `scoped_account_report_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handlePreview = () => {
    if (selectedAccountIds.size === 0) {
      alert('Please select at least one account.');
      return;
    }
    onPreviewReport(Array.from(selectedAccountIds));
    onClose();
  };

  const modalContent = (
    <div
      className={`fixed inset-y-0 right-0 ${
        isSidebarExpanded ? 'left-0 md:left-64' : 'left-0 md:left-20'
      } z-40 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm transition-all duration-300 overflow-hidden`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary-violet/15 text-secondary-violet flex items-center justify-center font-bold">
              <Building2 size={22} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                Individual & Filtered Account Selection
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Choose specific institutions and accounts for targeted auditing and export.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Summary Ribbon & Selection Toolbar */}
        <div className="px-6 py-3 bg-secondary-violet/5 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <button
            onClick={handleToggleAll}
            className="font-bold text-secondary-violet hover:underline flex items-center gap-1.5 transition"
          >
            {allSelected ? (
              <CheckSquare size={16} className="text-secondary-violet" />
            ) : someSelected ? (
              <MinusSquare size={16} className="text-secondary-violet" />
            ) : (
              <Square size={16} />
            )}
            {allSelected ? 'Deselect All' : 'Select All Accounts'}
          </button>

          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300">
              {selectedAccountIds.size} of {accounts.length} Selected
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-secondary-violet/15 text-secondary-violet border border-secondary-violet/30 font-bold font-mono">
              ${fmt(selectedWorth)}
            </span>
          </div>
        </div>

        {/* Scrollable Tree of Institutions & Accounts */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-w-0">
          {Array.from(groupedByInstitution.entries()).map(([inst, instAccounts]) => {
            const isExpanded = expandedInstitutions.has(inst);
            const instAccountIds = instAccounts.map((a) => a.id);
            const allInstSelected = instAccountIds.every((id) => selectedAccountIds.has(id));
            const someInstSelected =
              !allInstSelected && instAccountIds.some((id) => selectedAccountIds.has(id));

            const instPositions = positions.filter((p) => p.institution === inst);
            const instWorth = instPositions
              .filter((p) => p.assetClass !== 'CSP' && p.assetClass !== 'CoveredCall')
              .reduce((s, p) => s + p.marketValue, 0);

            return (
              <div
                key={inst}
                className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-gray-50/40 dark:bg-slate-950/40 shadow-sm transition"
              >
                {/* Institution Row */}
                <div className="p-3.5 flex items-center justify-between bg-gray-100/70 dark:bg-slate-800/60 select-none">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => toggleExpandInstitution(inst)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition"
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>

                    <button
                      onClick={() => handleToggleInstitution(inst)}
                      className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white hover:text-secondary-violet transition"
                    >
                      {allInstSelected ? (
                        <CheckSquare size={16} className="text-secondary-violet" />
                      ) : someInstSelected ? (
                        <MinusSquare size={16} className="text-secondary-violet" />
                      ) : (
                        <Square size={16} className="text-gray-400" />
                      )}
                      <span>{inst}</span>
                    </button>

                    <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-gray-500 font-medium border border-gray-200 dark:border-slate-700">
                      {instAccounts.length} {instAccounts.length === 1 ? 'account' : 'accounts'}
                    </span>
                  </div>

                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                    ${fmt(instWorth)}
                  </span>
                </div>

                {/* Account Rows */}
                {isExpanded && (
                  <div className="divide-y divide-gray-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900/60">
                    {instAccounts.map((acc) => {
                      const isSelected = selectedAccountIds.has(acc.id);
                      const accPositions = positions.filter((p) => p.accountId === acc.id);
                      const accWorth = accPositions
                        .filter((p) => p.assetClass !== 'CSP' && p.assetClass !== 'CoveredCall')
                        .reduce((s, p) => s + p.marketValue, 0);

                      return (
                        <div
                          key={acc.id}
                          onClick={() => handleToggleAccount(acc.id)}
                          className={`px-4 py-3 flex items-center justify-between cursor-pointer transition select-none ${
                            isSelected
                              ? 'bg-secondary-violet/5 hover:bg-secondary-violet/10'
                              : 'hover:bg-gray-50 dark:hover:bg-slate-800/50 opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-3 pl-6">
                            {isSelected ? (
                              <CheckSquare size={15} className="text-secondary-violet shrink-0" />
                            ) : (
                              <Square size={15} className="text-gray-400 shrink-0" />
                            )}

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-slate-900 dark:text-white font-mono">
                                  {acc.maskedAccount || acc.id}
                                </span>
                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-medium">
                                  {acc.accountType || 'Brokerage'}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-400">
                                {accPositions.length} positions tracked
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                              ${fmt(accWorth)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => setSelectedAccountIds(new Set())}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
          >
            Clear All
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>

            <button
              onClick={handleDownloadCsv}
              disabled={selectedAccountIds.size === 0}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-xl transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <Download size={14} /> Download CSV
            </button>

            <button
              onClick={handlePreview}
              disabled={selectedAccountIds.size === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-secondary-violet hover:bg-violet-700 rounded-xl shadow-md shadow-violet-500/20 transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Eye size={14} /> Preview Scoped Report ({selectedAccountIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
