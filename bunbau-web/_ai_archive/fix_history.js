const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

const oldHistory = `{activeTab === 'history' && (
             <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <h3 className="font-semibold text-lg mb-4 text-slate-900 dark:text-slate-100">Snapshot History (Coming Soon)</h3>
             </div>
           )}`;

const newHistory = `{activeTab === 'history' && (
             <AppletContainer title="Snapshot History" infoDescription="A chronological record of past portfolio uploads, allowing you to reconstruct or rollback data to any previous point in time.">
               <div className="p-8 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl m-4">
                  <div className="text-center text-gray-400">
                    <History size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="font-medium text-lg">Coming Soon</p>
                    <p className="text-sm mt-1">Snapshot tracking is under development.</p>
                  </div>
               </div>
             </AppletContainer>
           )}`;

code = code.replace(oldHistory, newHistory);
fs.writeFileSync('src/app/page.tsx', code);
console.log("History wrapped.");
