'use client';

import React, { useMemo } from 'react';
import { AppletContainer } from '../AppletContainer';
import { MultiYearTaxComparison } from '../../lib/tax/models';
import { SmartTable, SmartColumn } from '../common/SmartTable';

interface MultiYearDeductionsCardProps {
  comparison: MultiYearTaxComparison;
}

interface DeductionRow {
  key: string;
  component: string;
  year2024: string;
  year2025: string;
  impact: string;
}

export function MultiYearDeductionsCard({ comparison }: MultiYearDeductionsCardProps) {
  const rows: DeductionRow[] = useMemo(
    () => [
      {
        key: 'strategy',
        component: 'Deduction Strategy Used',
        year2024: 'Standard ($29,200)',
        year2025: 'Itemized ($49,190)',
        impact: '+$19,990 Deducted',
      },
      {
        key: 'salt',
        component: 'State & Local Tax (SALT) Allowed',
        year2024: '$10,000 (Capped)',
        year2025: '$40,000 (Expanded Cap)',
        impact: '+$30,000 SALT',
      },
      {
        key: 'charity',
        component: 'Charitable Donations (Cash + Thrift 8283)',
        year2024: '$0 (Below Standard)',
        year2025: '$6,190',
        impact: '100% Deductible',
      },
      {
        key: 'qbi',
        component: 'QBI Deduction (Form 8995)',
        year2024: '$11,663',
        year2025: '$0 ($9,445 loss to \'26)',
        impact: 'Loss Carried to \'26',
      },
    ],
    []
  );

  const columns: SmartColumn<DeductionRow>[] = useMemo(
    () => [
      {
        key: 'component',
        label: 'Deduction Component',
        align: 'left',
        sortValue: (r) => r.component,
        render: (r) => <span className="font-bold text-slate-900 dark:text-white">{r.component}</span>,
      },
      {
        key: 'year2024',
        label: `${comparison.previousYear || 2024} Return`,
        align: 'right',
        sortValue: (r) => r.year2024,
        render: (r) => <span className="font-mono text-slate-700 dark:text-slate-300">{r.year2024}</span>,
      },
      {
        key: 'year2025',
        label: `${comparison.latestYear || 2025} Return (Latest)`,
        align: 'right',
        sortValue: (r) => r.year2025,
        render: (r) => (
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{r.year2025}</span>
        ),
      },
      {
        key: 'impact',
        label: 'Tax Impact',
        align: 'right',
        sortValue: (r) => r.impact,
        render: (r) => (
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{r.impact}</span>
        ),
      },
    ],
    []
  );

  return (
    <div className="mb-6" data-testid="multi-year-deductions-card">
      <AppletContainer
        title="Deductions Architecture & $40,000 SALT Expansion Impact"
        infoDescription="Compares 2024 Standard Deduction against 2025 Itemized Deductions under the expanded $40k SALT cap."
        tableComponent={
          <div className="p-2">
            <SmartTable<DeductionRow>
              tableId="tax-deductions"
              title="Deduction Breakdown"
              infoDescription="Comparison of 2024 standard deduction vs 2025 itemized deductions with $40k SALT expansion."
              columns={columns}
              rows={rows}
              rowKey={(r) => r.key}
            />
          </div>
        }
      >
        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 space-y-1.5">
              <span className="text-[11px] font-bold uppercase text-gray-400">2024 Deduction Strategy</span>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white">$29,200 Standard</p>
              <p className="text-gray-500 leading-relaxed">
                SALT deduction was capped at $10,000 despite paying $44,910 in state/property taxes. The standard deduction yielded higher tax savings.
              </p>
            </div>

            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1.5">
              <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-300">2025 Deduction Strategy</span>
              <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">$49,190 Itemized</p>
              <p className="text-emerald-900 dark:text-emerald-200 leading-relaxed">
                The federal SALT ceiling expanded to $40,000, unlocking itemization. Combined with $6,190 in donations and $3,000 in gambling losses, this saved ~$7,000 in extra tax.
              </p>
            </div>
          </div>
        </div>
      </AppletContainer>
    </div>
  );
}
