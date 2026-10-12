const fs = require('fs');

let pageCode = fs.readFileSync('src/app/page.tsx', 'utf8');

// Insert activeData logic
if (!pageCode.includes('const activeData =')) {
  pageCode = pageCode.replace(
    'const [realPortfolio, setRealPortfolio] = useState<any[]>([]);',
    'const [realPortfolio, setRealPortfolio] = useState<any[]>([]);\n  const activeData = realPortfolio.length > 0 ? realPortfolio : SEED_PORTFOLIO_DATA;'
  );
}

// Modify the dashboard grid logic to calculate dynamically
// We will replace the entire `{activeTab === 'dashboard' && (` block with a dynamic one.
const dashboardStart = `{activeTab === 'dashboard' && (`;
const dashboardEnd = `{activeTab === 'calendar' && <MaturityCalendar positions={[]} />}`;

const parts = pageCode.split(dashboardStart);
if (parts.length === 2) {
  const tail = parts[1].split(dashboardEnd);
  if (tail.length === 2) {
    const dynamicDashboard = `
             {activeTab === 'dashboard' && (() => {
               const rawCash = activeData.filter(p => p.category === 'Cash').reduce((sum, p) => sum + p.value, 0);
               const csps = activeData.filter(p => p.category === 'CSP');
               const ccs = activeData.filter(p => p.category === 'Covered Call');
               const totalCspReserve = csps.reduce((sum, p) => sum + (p.metadata?.strikePrice * 100 * Math.abs(p.quantity || 1)), 0);
               const netFreeCash = rawCash - totalCspReserve;
               
               // Exclude option premium from net worth (assuming values for CSPs/CCs are premium)
               const rawAssets = activeData.filter(p => p.category !== 'CSP' && p.category !== 'Covered Call').reduce((sum, p) => sum + p.value, 0);
               const netWorth = rawAssets; // Assuming cash is in rawAssets
               
               const stocks = activeData.filter(p => p.category === 'Stock');
               const etfs = activeData.filter(p => p.category === 'ETF');
               
               const isCovered = (symbol) => ccs.some(cc => cc.metadata?.underlyingSymbol === symbol);
               const isDemoMode = realPortfolio.length === 0;

               return (
             <>
               {isDemoMode && (
                 <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-sm flex items-center justify-center font-medium gap-2">
                   <InfoIcon size={16} /> You are viewing Demo Mode Seed Data. Upload a screenshot to view your real portfolio.
                 </div>
               )}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                 <StatCard 
                   title="Total Net Worth" 
                   value={\`$\${netWorth.toLocaleString('en-US', {minimumFractionDigits: 2})}\`} 
                   info="Sum of all asset values across all connected institutions (excluding option premiums)." 
                 />
                 <StatCard 
                   title="Global Net Free Cash" 
                   value={\`$\${netFreeCash.toLocaleString('en-US', {minimumFractionDigits: 2})}\`}
                   info="Aggregated cash across all institutions minus locked CSP reserves." 
                   valueColorClass="text-emerald-500" 
                 />
                 <StatCard 
                   title="Blended APY%" 
                   value="8.4%" 
                   info="Weighted average of APY across all yield-bearing assets (CDs, Bonds, Cash)." 
                   valueColorClass="text-secondary-violet" 
                 />
                 <StatCard 
                   title="Total Option Collateral" 
                   value={\`$\${totalCspReserve.toLocaleString('en-US', {minimumFractionDigits: 2})}\`}
                   info="Total cash secured for active put contracts." 
                   valueColorClass="text-primary-amber" 
                 />
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 
                 {/* Cash Manager Container */}
                 <div className="lg:col-span-1 flex flex-col gap-6">
                   <AppletContainer 
                     title="Cash Manager" 
                     infoDescription="Aggregated cash reserves and locked collateral across all brokerages."
                   >
                     <div className="p-4 space-y-4">
                        <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                          {activeData.filter(p => p.category === 'Cash').map((cashPos, i) => (
                             <div key={i} className="flex justify-between text-sm">
                               <span className="text-gray-500 dark:text-gray-400 font-medium">{cashPos.institution || 'Unknown'} Raw Cash</span>
                               <span className="font-mono dark:text-white">$\{(cashPos.value).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                             </div>
                          ))}
                          <div className="pt-2 border-t border-gray-200 dark:border-slate-800 flex justify-between text-sm">
                            <span className="text-amber-600 dark:text-amber-500 flex items-center gap-2">Global CSP Reserves</span>
                            <span className="font-mono text-amber-600 dark:text-amber-500">-$\{(totalCspReserve).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="pt-2 border-t border-gray-200 dark:border-slate-800 flex justify-between font-bold">
                            <span className="text-emerald-600 dark:text-emerald-500">Global Net Free Cash</span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-500">$\{(netFreeCash).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                          </div>
                        </div>
                     </div>
                   </AppletContainer>
                   
                   <AppletContainer title="Asset Allocation" infoDescription="Breakdown by asset class">
                     <AssetAllocationChart />
                   </AppletContainer>
                 </div>

                 {/* Equities Portfolio Container */}
                 <div className="lg:col-span-2 flex flex-col gap-6">
                   <AppletContainer 
                     title="Equities Portfolio (Stocks & ETFs)" 
                     infoDescription="Aggregated equity holdings. Assets locked by active Covered Calls are flagged."
                   >
                     <div className="p-4">
                       <table className="w-full text-sm text-slate-900 dark:text-slate-200">
                         <thead>
                           <tr className="border-b border-gray-200 dark:border-slate-700 text-xs text-gray-500 uppercase">
                             <th className="text-left py-2 px-2">Asset</th>
                             <th className="text-left py-2 px-2">Category</th>
                             <th className="text-right py-2 px-2">Aggregated Value</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                           {[...stocks, ...etfs].length === 0 ? (
                             <tr><td colSpan={3} className="py-4 text-center text-gray-500">No Equities Imported</td></tr>
                           ) : [...stocks, ...etfs].map((asset, i) => (
                             <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                               <td className="py-3 px-2 font-medium flex items-center gap-2">
                                 {asset.symbol}
                                 {isCovered(asset.symbol) && (
                                   <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold" title="Collateral Locked by Covered Call">
                                     (CC) <Lock size={10} />
                                   </span>
                                 )}
                               </td>
                               <td className="py-3 px-2">
                                 <span className={\`px-2 py-1 rounded text-xs \${asset.category === 'Stock' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}\`}>
                                   {asset.category}
                                 </span>
                               </td>
                               <td className="py-3 px-2 text-right font-mono">$\{(asset.value).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                    </div>
                   </AppletContainer>

                   <AppletContainer 
                     title="Active Options Monitor" 
                     infoDescription="Tracks all active Cash Secured Puts (locking cash) and Covered Calls (locking equities)."
                   >
                     <div className="p-4">
                       <table className="w-full text-sm text-slate-900 dark:text-slate-200">
                         <thead>
                           <tr className="border-b border-gray-200 dark:border-slate-700 text-xs text-gray-500 uppercase">
                             <th className="text-left py-2 px-2">Contract</th>
                             <th className="text-left py-2 px-2">Underlier</th>
                             <th className="text-right py-2 px-2">Ignored Premium</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                           {[...csps, ...ccs].length === 0 ? (
                             <tr><td colSpan={3} className="py-4 text-center text-gray-500">No Active Options</td></tr>
                           ) : [...csps, ...ccs].map((opt, i) => (
                             <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                               <td className="py-3 px-2 font-medium">{opt.symbol}</td>
                               <td className={\`py-3 px-2 \${opt.category === 'Covered Call' ? 'text-amber-600 font-bold flex items-center gap-1' : 'text-gray-500'}\`}>
                                 {opt.metadata?.underlyingSymbol || 'Unknown'} {opt.category === 'Covered Call' && <Lock size={12}/>}
                               </td>
                               <td className="py-3 px-2 text-right font-mono line-through text-gray-400">$\{(opt.value).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                    </div>
                   </AppletContainer>
                 </div>
             </>
               );
             })()}
             
             {activeTab === 'calendar' && <MaturityCalendar positions={[]} />}`;

    pageCode = parts[0] + dynamicDashboard + tail[1];
    fs.writeFileSync('src/app/page.tsx', pageCode);
    console.log("Successfully replaced dashboard mapping logic.");
  }
}
