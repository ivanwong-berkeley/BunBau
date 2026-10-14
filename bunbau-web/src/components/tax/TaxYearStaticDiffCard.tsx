'use client';

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Search,
  Eye,
} from 'lucide-react';
import { MultiYearTaxComparison, LineItemComparison } from '../../lib/tax/models';
import { SmartTable, SmartColumn } from '../common/SmartTable';

interface TaxYearStaticDiffCardProps {
  comparison: MultiYearTaxComparison;
  onOpenDocumentViewer?: (taxYear: number, pageNumber?: number) => void;
}

export function TaxYearStaticDiffCard({
  comparison,
  onOpenDocumentViewer,
}: TaxYearStaticDiffCardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', 'Income', 'Deductions', 'Taxes', 'Payments', 'Carryovers', 'California'];

  const filteredItems = useMemo(() => {
    return comparison.lineItems.filter((item) => {
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesQuery =
        searchQuery === '' ||
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.formRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.impactInsight.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [comparison.lineItems, selectedCategory, searchQuery]);

  const fmt = (n: number) => {
    if (n < 0) return `-$${Math.abs(n).toLocaleString()}`;
    return `$${n.toLocaleString()}`;
  };

  const columns: SmartColumn<LineItemComparison>[] = useMemo(
    () => [
      {
        key: 'label',
        label: 'Line Item & IRS Form Reference',
        align: 'left',
        sortValue: (row) => row.label,
        render: (row) => (
          <div>
            <span className="font-bold text-slate-900 dark:text-white">{row.label}</span>
            <p className="text-[11px] font-mono text-gray-400 mt-0.5">{row.formRef}</p>
          </div>
        ),
      },
      {
        key: 'year2024',
        label: '2024 Filed',
        align: 'right',
        sortValue: (row) => row.year2024,
        render: (row) => <span className="font-mono text-slate-700 dark:text-slate-300">{fmt(row.year2024)}</span>,
      },
      {
        key: 'year2025',
        label: '2025 Filed',
        align: 'right',
        sortValue: (row) => row.year2025,
        render: (row) => <span className="font-mono font-bold text-slate-900 dark:text-white">{fmt(row.year2025)}</span>,
      },
      {
        key: 'diffAmount',
        label: 'Change ($)',
        align: 'right',
        sortValue: (row) => row.diffAmount,
        render: (row) => {
          const isPos = row.diffAmount > 0;
          const isNeg = row.diffAmount < 0;
          return (
            <span
              className={`font-mono font-bold ${
                isPos ? 'text-emerald-600 dark:text-emerald-400' : isNeg ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'
              }`}
            >
              {fmt(row.diffAmount)}
            </span>
          );
        },
      },
      {
        key: 'diffPercent',
        label: 'Change (%)',
        align: 'right',
        sortValue: (row) => row.diffPercent,
        render: (row) => {
          const isPos = row.diffAmount > 0;
          const isNeg = row.diffAmount < 0;
          return (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-mono font-bold ${
                isPos ? 'text-emerald-600 dark:text-emerald-400' : isNeg ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'
              }`}
            >
              {isPos ? <ArrowUpRight size={13} /> : isNeg ? <ArrowDownRight size={13} /> : <Minus size={13} />}
              {Math.abs(row.diffPercent).toFixed(1)}%
            </span>
          );
        },
      },
      {
        key: 'impactInsight',
        label: 'Tax Analysis & Source Deep-Link',
        align: 'left',
        sortable: false,
        render: (row) => (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-gray-600 dark:text-gray-300 text-[11px] leading-tight">
              {row.impactInsight}
            </span>

            {onOpenDocumentViewer && (row.sourceDocPage2024 || row.sourceDocPage2025) && (
              <div className="flex items-center gap-1.5 shrink-0">
                {row.sourceDocPage2024 && (
                  <button
                    type="button"
                    onClick={() => onOpenDocumentViewer(2024, row.sourceDocPage2024)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition flex items-center gap-1"
                    title={`View ${row.label} in 2024 Return (p.${row.sourceDocPage2024})`}
                    data-testid={`view-2024-${row.key}`}
                  >
                    <Eye size={11} /> 2024 p.{row.sourceDocPage2024}
                  </button>
                )}
                {row.sourceDocPage2025 && (
                  <button
                    type="button"
                    onClick={() => onOpenDocumentViewer(2025, row.sourceDocPage2025)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded bg-primary-mint/20 hover:bg-primary-mint/30 text-primary-mint transition flex items-center gap-1"
                    title={`View ${row.label} in 2025 Return (p.${row.sourceDocPage2025})`}
                    data-testid={`view-2025-${row.key}`}
                  >
                    <Eye size={11} /> 2025 p.{row.sourceDocPage2025}
                  </button>
                )}
              </div>
            )}
          </div>
        ),
      },
    ],
    [onOpenDocumentViewer]
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden mb-6" data-testid="tax-diff-card">
      {/* Top Header & Search Bar */}
      <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="text-primary-mint" size={18} />
            Multi-Year Line-by-Line Comparative Audit (2024 vs 2025)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Deterministic IRS Form 1040, Form 540 &amp; Schedule reconciliation with 1-click source document deep-links
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter Pills */}
          <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-semibold">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg transition ${
                  selectedCategory === cat
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-gray-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Filter line items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-mint w-44"
            />
          </div>
        </div>
      </div>

      {/* SmartTable */}
      <div className="p-4" data-testid="tax-diff-table">
        <SmartTable<LineItemComparison>
          tableId="tax-diff"
          title="Line-by-Line Tax Audit"
          infoDescription="Deterministic line-by-line comparison of 2024 vs 2025 Form 1040 and California Form 540 tax filings."
          columns={columns}
          rows={filteredItems}
          rowKey={(row) => row.key}
          rowClassName={(row) => `data-testid-row-${row.key}`}
        />
      </div>
    </div>
  );
}
