const fs = require('fs');

let code = fs.readFileSync('src/components/UploadValidationModal.tsx', 'utf8');

const oldTerminalLogs = `setTimeout(() => setTerminalLogs(prev => [...prev, \`[Extract] Successfully extracted 15 individual positions.\`]), 3500);
      setTimeout(() => setTerminalLogs(prev => [...prev, \`[Analysis] Validating against custom rule DB (e.g. UNH -> Stock)...\`]), 5000);
      setTimeout(() => {
        setTerminalLogs(prev => [...prev, \`[Complete] Validation Success. UI unlocked. Auto-closing terminal in 10s...\`]);`;

const newTerminalLogs = `setTimeout(() => setTerminalLogs(prev => [...prev, \`[Extract] Structuring Option schemas (Underlier & Strike isolation)...\`]), 3500);
      setTimeout(() => setTerminalLogs(prev => [...prev, \`[Mapping] Calculating CSP Cash Reserves (AAPL, MSFT, NVDA)...\`]), 5000);
      setTimeout(() => setTerminalLogs(prev => [...prev, \`[Mapping] Linking Covered Calls to underlying Equities (SLV, T)...\`]), 6500);
      setTimeout(() => {
        setTerminalLogs(prev => [...prev, \`[Complete] AI Mapping Success. UI unlocked. Auto-closing terminal in 10s...\`]);`;

// Need to update the timeouts as well
code = code.replace(oldTerminalLogs, newTerminalLogs);

// update the overall timeout array
code = code.replace(`}, 7000);`, `}, 8500);`);

fs.writeFileSync('src/components/UploadValidationModal.tsx', code);
