const fs = require('fs');

// 1. Update UploadValidationModal.tsx to have the new payload
let uploadCode = fs.readFileSync('src/components/UploadValidationModal.tsx', 'utf8');

const oldMock = `  // Completely robust 15-item mock data perfectly mapping the screenshot
  const mockExtractedData = {
    institution: 'Fidelity',
    account: '***-6238',
    positions: [
      { symbol: 'CASH', value: 100008.97, category: 'Cash' },
      { symbol: 'AAPL 310 Put', value: -103.00, category: 'CSP' },
      { symbol: 'FBTC', value: 5864.78, category: 'ETF' },
      { symbol: 'FCNTX', value: 7397.24, category: 'ETF' },
      { symbol: 'GLDM', value: 1711.31, category: 'ETF' },
      { symbol: 'MSFT 475 Put', value: -125.00, category: 'CSP' },
      { symbol: 'NVDA', value: 4382.81, category: 'Stock' },
      { symbol: 'NVDA 200 Put', value: -89.00, category: 'CSP' },
      { symbol: 'ORCL', value: 426919.63, category: 'Stock' },
      { symbol: 'SGOV', value: 77788.16, category: 'ETF' },
      { symbol: 'SLV', value: 10948.00, category: 'ETF' },
      { symbol: 'SLV 68 Call', value: -8.00, category: 'Covered Call' },
      { symbol: 'T', value: 2430.00, category: 'Stock' },
      { symbol: 'T 28 Call', value: -8.00, category: 'Covered Call' },
      { symbol: 'UNH', value: 37190.00, category: 'Stock' },
    ]
  };`;

const newMock = `  // Completely robust 15-item mock data with AI metadata for Options mapping
  const mockExtractedData = {
    institution: 'Fidelity',
    account: '***-6238',
    positions: [
      { symbol: 'CASH', value: 100008.97, category: 'Cash', quantity: 1 },
      { symbol: 'AAPL 310 Put', value: -103.00, category: 'CSP', quantity: -1, metadata: { underlyingSymbol: 'AAPL', strikePrice: 310 } },
      { symbol: 'FBTC', value: 5864.78, category: 'ETF', quantity: 79.978 },
      { symbol: 'FCNTX', value: 7397.24, category: 'ETF', quantity: 266.088 },
      { symbol: 'GLDM', value: 1711.31, category: 'ETF', quantity: 20.857 },
      { symbol: 'MSFT 475 Put', value: -125.00, category: 'CSP', quantity: -1, metadata: { underlyingSymbol: 'MSFT', strikePrice: 475 } },
      { symbol: 'NVDA', value: 4382.81, category: 'Stock', quantity: 18.734 },
      { symbol: 'NVDA 200 Put', value: -89.00, category: 'CSP', quantity: -1, metadata: { underlyingSymbol: 'NVDA', strikePrice: 200 } },
      { symbol: 'ORCL', value: 426919.63, category: 'Stock', quantity: 3000.138 },
      { symbol: 'SGOV', value: 77788.16, category: 'ETF', quantity: 774.474 },
      { symbol: 'SLV', value: 10948.00, category: 'ETF', quantity: 200 },
      { symbol: 'SLV 68 Call', value: -8.00, category: 'Covered Call', quantity: -2, metadata: { underlyingSymbol: 'SLV', strikePrice: 68 } },
      { symbol: 'T', value: 2430.00, category: 'Stock', quantity: 100 },
      { symbol: 'T 28 Call', value: -8.00, category: 'Covered Call', quantity: -1, metadata: { underlyingSymbol: 'T', strikePrice: 28 } },
      { symbol: 'UNH', value: 37190.00, category: 'Stock', quantity: 100 },
    ]
  };`;

uploadCode = uploadCode.replace(oldMock, newMock);

// Update preview invocation to pass data
const oldPreview = `<PortfolioPreviewModal isOpen={showPreview} onClose={() => setShowPreview(false)} />`;
const newPreview = `<PortfolioPreviewModal isOpen={showPreview} data={mockExtractedData} onClose={() => setShowPreview(false)} />`;
uploadCode = uploadCode.replace(oldPreview, newPreview);

fs.writeFileSync('src/components/UploadValidationModal.tsx', uploadCode);

// 2. Rewrite PortfolioPreviewModal.tsx
const newPreviewCode = `'use client';
import React from 'react';
import { X, ArrowRight, Lock } from 'lucide-react';

interface PortfolioPreviewModalProps {
  isOpen: boolean;
  data?: {
    institution: string;
    account: string;
    positions: any[];
  };
  onClose: () => void;
}

export function PortfolioPreviewModal({ isOpen, data, onClose }: PortfolioPreviewModalProps) {
  if (!isOpen || !data) return null;

  const rawCash = data.positions.find(p => p.category === 'Cash')?.value || 0;
  
  const csps = data.positions.filter(p => p.category === 'CSP');
  const ccs = data.positions.filter(p => p.category === 'Covered Call');
  const stocks = data.positions.filter(p => p.category === 'Stock');
  const etfs = data.positions.filter(p => p.category === 'ETF');

  const totalCspReserve = csps.reduce((acc, pos) => {
    return acc + (pos.metadata?.strikePrice * 100 * Math.abs(pos.quantity));
  }, 0);
  
  const netPortfolioCash = rawCash - totalCspReserve;

  // Helper to check if equity is covered
  const isCovered = (symbol: string) => {
    return ccs.some(cc => cc.metadata?.underlyingSymbol === symbol);
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#0b1021] w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden max-h-[85vh]">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800 shrink-0">
            <div>
              <h2 className="text-lg font-bold dark:text-white">Portfolio Impact Preview</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Target: {data.institution} ({data.account})</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full dark:text-gray-400"><X size={18}/></button>
          </div>
          
          <div className="p-6 space-y-6 overflow-auto flex-1">
            {/* Cash Section */}
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Cash Breakdown</h3>
              <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Raw Extracted Cash</span>
                  <span className="font-mono dark:text-white">$\{(rawCash).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                </div>
                {csps.map((csp, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-amber-600 dark:text-amber-500 flex items-center gap-2">CSP Reserve <ArrowRight size={14}/> ({csp.symbol} x {Math.abs(csp.quantity)})</span>
                    <span className="font-mono text-amber-600 dark:text-amber-500">-$\{(csp.metadata?.strikePrice * 100 * Math.abs(csp.quantity)).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-200 dark:border-slate-800 flex justify-between font-bold">
                  <span className="text-emerald-600 dark:text-emerald-500">Net Portfolio Cash</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-500">$\{(netPortfolioCash).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Equities Section */}
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Equities (Stocks)</h3>
                <div className="border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900/50">
                      {stocks.map((stock, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium dark:text-slate-300 flex items-center gap-2">
                            {stock.symbol}
                            {isCovered(stock.symbol) && (
                              <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold" title="Collateral Locked by Covered Call">
                                (CC) <Lock size={10} />
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-500">$\{(stock.value).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ETFs Section */}
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Exchange Traded Funds (ETFs)</h3>
                <div className="border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900/50">
                      {etfs.map((etf, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium dark:text-slate-300 flex items-center gap-2">
                            {etf.symbol}
                            {isCovered(etf.symbol) && (
                              <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold" title="Collateral Locked by Covered Call">
                                (CC) <Lock size={10} />
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-500">$\{(etf.value).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Options Section */}
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Active Options Filter</h3>
              <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">The following premium values will be ignored in Net Worth calculation to prevent double-counting:</p>
                {[...csps, ...ccs].map((opt, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span className="dark:text-slate-300 font-medium">
                      {opt.symbol} <span className="text-xs text-gray-500 ml-2">({opt.category})</span>
                    </span>
                    <span className="font-mono text-gray-400 line-through">$\{(opt.value).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}`;

fs.writeFileSync('src/components/PortfolioPreviewModal.tsx', newPreviewCode);

