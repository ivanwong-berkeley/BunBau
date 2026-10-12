import fs from 'fs';
const edit = (p, pairs) => {
  let s = fs.readFileSync(p, 'utf8');
  for (const [a, b] of pairs) {
    if (!s.includes(a)) throw new Error(`${p}: missing ${a.slice(0, 60)}`);
    s = s.replace(a, b);
  }
  fs.writeFileSync(p, s);
};

edit('src/components/PortfolioPreviewModal.tsx', [
[`  data?: {
    institution: string;
    account: string;
    positions: any[];
  };`, `  data?: {
    institution: string;
    account: string;
    positions: any[];
    reconciliation?: { statedTotal: number; computedTotal: number; diff: number; ok: boolean };
  };`],
[`  // Helper to check if equity is covered`, `  // Anything not shown in a section above (CDs, Treasuries, Crypto...) so no imported row is ever hidden.
  const SHOWN = new Set(['Cash', 'CSP', 'Covered Call', 'Stock', 'ETF']);
  const others = data.positions.filter(p => !SHOWN.has(p.category));
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rec = data.reconciliation;

  // Helper to check if equity is covered`],
[`            {/* Options Section */}`, `            {others.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Other Holdings (CDs, Treasuries, Crypto)</h3>
                <div className="border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900/50">
                      {others.map((o, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium dark:text-slate-300">{o.symbol} <span className="text-xs text-gray-500 ml-2">({o.category})</span></td>
                          <td className="px-3 py-2 text-right font-mono text-gray-500">\${fmt(o.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {rec && (
              <div data-testid="reconciliation" className={\`rounded-lg p-4 text-sm border \${rec.ok ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}\`}>
                <div className="flex justify-between"><span>Account total on screenshot</span><span className="font-mono">\${fmt(rec.statedTotal)}</span></div>
                <div className="flex justify-between"><span>Sum of imported rows</span><span className="font-mono">\${fmt(rec.computedTotal)}</span></div>
                <div className="flex justify-between font-bold pt-1 border-t border-current/20 mt-1">
                  <span>{rec.ok ? '✓ Reconciled' : '⚠ Mismatch: a row may be missing or misread'}</span>
                  <span className="font-mono">{rec.diff >= 0 ? '+' : '-'}\${fmt(Math.abs(rec.diff))}</span>
                </div>
              </div>
            )}

            {/* Options Section */}`],
]);

edit('src/components/UploadValidationModal.tsx', [
[`                {extractError && images.length > 0 && (`, `                {hasData && extractedData?.reconciliation && !extractedData.reconciliation.ok && (
                  <div data-testid="recon-warning" className="mb-4 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    ⚠ Imported rows total \${extractedData.reconciliation.computedTotal.toLocaleString('en-US')} but the screenshot shows an account total of \${extractedData.reconciliation.statedTotal.toLocaleString('en-US')}. A row may be missing or misread. Add another screenshot or check the table before importing.
                  </div>
                )}
                {extractError && images.length > 0 && (`],
]);
console.log('ok');
