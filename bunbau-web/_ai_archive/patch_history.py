with open('src/app/page.tsx', 'r') as f:
    content = f.read()

target = """           {activeTab === 'history' && (
             <AppletContainer title="Snapshot History" infoDescription="A chronological record of past portfolio uploads, allowing you to reconstruct or rollback data to any previous point in time.">
               <div className="p-8 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl m-4">
                  <div className="text-center text-gray-400">
                    <History size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="font-medium text-lg">Coming Soon</p>
                    <p className="text-sm mt-1">Snapshot tracking is under development.</p>
                  </div>
               </div>
             </AppletContainer>
           )}"""

replacement = """           {activeTab === 'history' && (
             <AppletContainer 
               title="Snapshot History" 
               infoDescription="An immutable chronological record of portfolio snapshots, capturing point-in-time net worth and account holdings."
             >
               <div className="p-4">
                 {snapshots.length === 0 ? (
                   <div className="p-8 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl m-2">
                     <div className="text-center text-gray-400">
                       <History size={48} className="mx-auto mb-4 opacity-50" />
                       <p className="font-medium text-lg">No Snapshots Captured Yet</p>
                       <p className="text-sm mt-1 mb-4">Click "Capture Snapshot" in the header anytime to freeze your portfolio state.</p>
                       <button 
                         onClick={handleCaptureSnapshot}
                         disabled={isDemo || isCapturingSnapshot}
                         data-testid="capture-snapshot-empty-btn"
                         className="px-4 py-2 bg-primary-mint text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition disabled:opacity-50 inline-flex items-center gap-2"
                       >
                         <Camera size={16} /> Capture First Snapshot
                       </button>
                     </div>
                   </div>
                 ) : (
                   <div className="overflow-x-auto">
                     <table className="w-full text-sm text-slate-900 dark:text-slate-200">
                       <thead>
                         <tr className="border-b border-gray-200 dark:border-slate-700 text-xs text-gray-500 uppercase">
                           <th className="text-left py-2 px-3">Snapshot ID</th>
                           <th className="text-left py-2 px-3">Date & Time</th>
                           <th className="text-left py-2 px-3">Institutions</th>
                           <th className="text-right py-2 px-3">Accounts</th>
                           <th className="text-right py-2 px-3">Positions</th>
                           <th className="text-right py-2 px-3">Captured Net Worth</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                         {snapshots.map((snap) => (
                           <tr key={snap.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                             <td className="py-3 px-3 font-mono text-xs text-gray-500">{snap.id}</td>
                             <td className="py-3 px-3 font-medium">
                               {new Date(snap.createdAt).toLocaleString()}
                             </td>
                             <td className="py-3 px-3">
                               <span className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                 {snap.institutions.join(', ') || 'Brokerage'}
                               </span>
                             </td>
                             <td className="py-3 px-3 text-right font-mono">{snap.accountsCount}</td>
                             <td className="py-3 px-3 text-right font-mono">{snap.positionsCount}</td>
                             <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                               ${snap.totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}
               </div>
             </AppletContainer>
           )}"""

if target in content:
    content = content.replace(target, replacement, 1)
    with open('src/app/page.tsx', 'w') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('TARGET NOT FOUND')
