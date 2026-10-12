const fs = require('fs');
let registry = fs.readFileSync('../docs/BunBau_Implementation_Registry.md', 'utf8');

registry = registry.replace('| **v1.9** | **[PENDING]**', '| **v1.9** | **[COMPLETED]**');

const newEntry = `| **v1.10** | **[COMPLETED]** Firebase Security Rules & Permissions Fix | \`BunBau_v1.10_Firestore_Rules_Status_Report.md\` | Added \`portfolios\` collection to \`firestore.rules\`. Wrapped all DB interactions across Profile, Settings, and Dashboard in try/catch to explicitly flag permission errors. Required manual Firebase console paste. | **DEPLOYED** |\n`;

registry += newEntry;
fs.writeFileSync('../docs/BunBau_Implementation_Registry.md', registry);
