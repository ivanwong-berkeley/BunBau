const fs = require('fs');
let code = fs.readFileSync('src/components/DeleteDangerZone.tsx', 'utf8');

code = code.replace(
  "const [mode, setMode] = useState<'entire' | 'institution'>('entire');",
  "const [mode, setMode] = useState<'entire' | 'institution'>('entire');\n  const [selectedInst, setSelectedInst] = useState('Schwab');"
);

code = code.replace(
  "const expectedText = mode === 'entire' ? 'Delete the entire portfolio' : 'Delete all Schwab accounts';",
  "const expectedText = mode === 'entire' ? 'Delete the entire portfolio' : `Delete all ${selectedInst} accounts`;"
);

code = code.replace(
  "<select className=\"bg-gray-100 dark:bg-slate-800 text-xs p-1 rounded border-none focus:ring-0 dark:text-white\">",
  "<select value={selectedInst} onChange={(e) => setSelectedInst(e.target.value)} className=\"bg-gray-100 dark:bg-slate-800 text-xs p-1 rounded border-none focus:ring-0 dark:text-white\">"
);

fs.writeFileSync('src/components/DeleteDangerZone.tsx', code);
