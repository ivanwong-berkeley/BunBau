const fs = require('fs');

let pageCode = fs.readFileSync('src/app/page.tsx', 'utf8');

// Ensure Lock is imported
if (!pageCode.includes('Lock,')) {
  pageCode = pageCode.replace('import { ChevronDown,', 'import { ChevronDown, Lock,');
}

// Locate the dashboard tab rendering
const dashboardStart = `{activeTab === 'dashboard' && (
             <>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">`;
               
const newDashboardContent = `{activeTab === 'dashboard' && (
             <>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                 <StatCard 
                   title="Total Net Worth" 
                   value="$2,145,000.00" 
                   info="Sum of all asset values across all connected institutions (excluding option premiums)." 
                 />
                 <StatCard 
                   title="Global Net Free Cash" 
                   value="$69,008.97" 
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
                   value="$150,000.00" 
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
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Fidelity Raw Cash</span>
                            <span className="font-mono dark:text-white">$100,008.97</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Schwab Raw Cash</span>
                            <span className="font-mono dark:text-white">$67,500.00</span>
                          </div>
                          <div className="pt-2 border-t border-gray-200 dark:border-slate-800 flex justify-between text-sm">
                            <span className="text-amber-600 dark:text-amber-500 flex items-center gap-2">Global CSP Reserves</span>
                            <span className="font-mono text-amber-600 dark:text-amber-500">-$98,500.00</span>
                          </div>
                          <div className="pt-2 border-t border-gray-200 dark:border-slate-800 flex justify-between font-bold">
                            <span className="text-emerald-600 dark:text-emerald-500">Global Net Free Cash</span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-500">$69,008.97</span>
                          </div>
                        </div>
                     </div>
                   </AppletContainer>
                   
                   <AppletContainer title="Asset Allocation">
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
                           <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                             <td className="py-3 px-2 font-medium flex items-center gap-2">
                               ORCL
                             </td>
                             <td className="py-3 px-2"><span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs">Stock</span></td>
                             <td className="py-3 px-2 text-right font-mono">$426,919.63</td>
                           </tr>
                           <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                             <td className="py-3 px-2 font-medium flex items-center gap-2">
                               SLV
                               <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold" title="Collateral Locked by Covered Call">
                                 (CC) <Lock size={10} />
                               </span>
                             </td>
                             <td className="py-3 px-2"><span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">ETF</span></td>
                             <td className="py-3 px-2 text-right font-mono">$10,948.00</td>
                           </tr>
                           <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                             <td className="py-3 px-2 font-medium flex items-center gap-2">
                               T
                               <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold" title="Collateral Locked by Covered Call">
                                 (CC) <Lock size={10} />
                               </span>
                             </td>
                             <td className="py-3 px-2"><span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs">Stock</span></td>
                             <td className="py-3 px-2 text-right font-mono">$2,430.00</td>
                           </tr>
                           <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                             <td className="py-3 px-2 font-medium flex items-center gap-2">UNH</td>
                             <td className="py-3 px-2"><span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs">Stock</span></td>
                             <td className="py-3 px-2 text-right font-mono">$37,190.00</td>
                           </tr>
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
                           <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                             <td className="py-3 px-2 font-medium">AAPL 310 Put</td>
                             <td className="py-3 px-2 text-gray-500">AAPL</td>
                             <td className="py-3 px-2 text-right font-mono line-through text-gray-400">$-103.00</td>
                           </tr>
                           <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                             <td className="py-3 px-2 font-medium">MSFT 475 Put</td>
                             <td className="py-3 px-2 text-gray-500">MSFT</td>
                             <td className="py-3 px-2 text-right font-mono line-through text-gray-400">$-125.00</td>
                           </tr>
                           <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                             <td className="py-3 px-2 font-medium">SLV 68 Call</td>
                             <td className="py-3 px-2 text-amber-600 font-bold">SLV 🔒</td>
                             <td className="py-3 px-2 text-right font-mono line-through text-gray-400">$-8.00</td>
                           </tr>
                         </tbody>
                       </table>
                    </div>
                   </AppletContainer>
                 </div>
               </div>
             </>
           )}`;

// We need to carefully replace the `dashboard` tab block.
const parts = pageCode.split(dashboardStart);
if (parts.length === 2) {
  const tail = parts[1].split(`{activeTab === 'calendar' && <MaturityCalendar positions={[]} />}`);
  if (tail.length === 2) {
    pageCode = parts[0] + newDashboardContent + `\n\n           {activeTab === 'calendar' && <MaturityCalendar positions={[]} />}` + tail[1];
    fs.writeFileSync('src/app/page.tsx', pageCode);
    console.log("Successfully replaced dashboard content.");
  } else {
    console.log("Failed to find tail end of dashboard tab.");
  }
} else {
  console.log("Failed to find dashboard start.");
}

