'use client';

import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  MinusSquare,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  Building2,
  Wallet,
} from 'lucide-react';
import { CanonicalAccount, CanonicalPosition } from '../../lib/portfolio/types';
import { buildConsolidatedReport } from '../../lib/reports/consolidatedReport';
import { generateConsolidatedReportCsv, downloadCsvFile } from '../../lib/reports/csvExporter';

interface AccountHierarchySelectorProps {
  accounts: CanonicalAccount[];
  positions: CanonicalPosition[];
  onPreviewReport: (accountIds: string[]) => void;
}

export function AccountHierarchySelector({
  accounts,
  positions,
  onPreviewReport,
}: AccountHierarchySelectorProps) {
  // Map of accountId -> boolean (selected)
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(
    () => new Set(accounts.map((a) => a.id))
  );

  // Expanded institution groups
  const [expandedInstitutions, setExpandedInstitutions] = useState<Set<string>>(
    () => new Set(accounts.map((a) => a.institution))
  );

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

  // Compute selected total value
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
    downloadCsvFile(csv, `custom_account_report_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handlePreview = () => {
    if (selectedAccountIds.size === 0) {
      alert('Please select at least one account.');
      return;
    }
    onPreviewReport(Array.from(selectedAccountIds));
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3 gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 size={16} className="text-primary-mint" />
            Hierarchical Account Selection
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Select specific institutions and accounts to scope your audit and report.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleAll}
            className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-primary-mint flex items-center gap-1.5 transition"
          >
            {allSelected ? (
              <CheckSquare size={16} className="text-primary-mint" />
            ) : someSelected ? (
              <MinusSquare size={16} className="text-primary-amber" />
            ) : (
              <Square size={16} />
            )}
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </div>

      {/* Institution & Account Tree */}
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
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
              className="border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden bg-gray-50/50 dark:bg-slate-950/40"
            >
              {/* Institution Header Row */}
              <div className="p-3 flex items-center justify-between bg-gray-100/70 dark:bg-slate-800/60 select-none">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => toggleExpandInstitution(inst)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-500"
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  <button
                    onClick={() => handleToggleInstitution(inst)}
                    className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-primary-mint transition"
                  >
                    {allInstSelected ? (
                      <CheckSquare size={16} className="text-primary-mint" />
                    ) : someInstSelected ? (
                      <MinusSquare size={16} className="text-primary-amber" />
                    ) : (
                      <Square size={16} className="text-gray-400" />
                    )}
                    <span>{inst}</span>
                    <span className="text-gray-400 font-normal">
                      ({instAccounts.length} {instAccounts.length === 1 ? 'account' : 'accounts'})
                    </span>
                  </button>
                </div>

                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  ${fmt(instWorth)}
                </span>
              </div>

              {/* Child Accounts */}
              {isExpanded && (
                <div className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
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
                        className={`p-3 pl-10 flex items-center justify-between text-xs cursor-pointer transition ${
                          isSelected
                            ? 'bg-primary-mint/5 dark:bg-slate-800/60'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isSelected ? (
                            <CheckSquare size={15} className="text-primary-mint shrink-0" />
                          ) : (
                            <Square size={15} className="text-gray-400 shrink-0" />
                          )}
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-slate-900 dark:text-white">
                              {acc.maskedAccount}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-semibold">
                              {acc.accountType}
                            </span>
                            <span className="text-gray-400 text-[11px]">
                              ({accPositions.length} positions)
                            </span>
                          </div>
                        </div>

                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          ${fmt(accWorth)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Summary & Actions */}
      <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Selected Scope:
          </span>
          <span className="font-bold text-primary-mint">
            {selectedAccountIds.size} of {accounts.length} Accounts
          </span>
          <span className="text-gray-400">•</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            ${fmt(selectedWorth)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            disabled={selectedAccountIds.size === 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
              selectedAccountIds.size === 0
                ? 'border-gray-200 text-gray-300 dark:border-slate-800 dark:text-slate-600 cursor-not-allowed'
                : 'border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Download size={14} /> Export CSV
          </button>

          <button
            onClick={handlePreview}
            disabled={selectedAccountIds.size === 0}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition ${
              selectedAccountIds.size === 0
                ? 'bg-gray-300 dark:bg-slate-800 cursor-not-allowed'
                : 'bg-primary-mint hover:bg-emerald-600'
            }`}
          >
            <Eye size={14} /> Preview Scoped Report
          </button>
        </div>
      </div>
    </div>
  );
}
