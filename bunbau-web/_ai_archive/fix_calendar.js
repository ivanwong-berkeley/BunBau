const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarView.tsx', 'utf8');

if (!code.includes('AppletContainer')) {
  code = code.replace("import { Calendar, AlertCircle } from 'lucide-react';", "import { Calendar, AlertCircle } from 'lucide-react';\nimport { AppletContainer } from './AppletContainer';");
  
  const oldReturn = `return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Calendar size={20} className="text-secondary-violet" /> 
          Upcoming Maturities
        </h3>
      </div>
      
      <div className="space-y-4">`;
      
  const newReturn = `return (
    <AppletContainer 
      title="Upcoming Maturities" 
      infoDescription="Tracks fixed income instruments (CDs, Treasury Bills, Bonds) approaching maturity, color-coded by urgency."
    >
      <div className="space-y-4 p-4">`;
      
  code = code.replace(oldReturn, newReturn);
  code = code.replace(/<\/div>\n    <\/div>\n  \);\n\}/, '</div>\n    </AppletContainer>\n  );\n}');
  
  fs.writeFileSync('src/components/CalendarView.tsx', code);
  console.log("Calendar wrapped.");
}
