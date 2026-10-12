const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

const oldBanner = `{isDemoMode && (
                 <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-sm flex items-center justify-center font-medium gap-2">
                   <InfoIcon size={16} /> You are viewing Demo Mode Seed Data. Upload a screenshot to view your real portfolio.
                 </div>
               )}`;

code = code.replace(oldBanner, '');

const newBanner = `
           {realPortfolio.length === 0 && (
             <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-sm flex items-center justify-center font-medium gap-2 shadow-sm">
               <InfoIcon size={16} /> You are viewing Demo Mode Seed Data. Upload a screenshot to view your real portfolio.
             </div>
           )}
`;

code = code.replace('<main className="flex-1 overflow-auto p-6">', '<main className="flex-1 overflow-auto p-6">' + newBanner);

fs.writeFileSync('src/app/page.tsx', code);
console.log('Demo banner hoisted.');
