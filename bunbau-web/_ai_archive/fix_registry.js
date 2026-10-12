const fs = require('fs');
let registry = fs.readFileSync('../docs/BunBau_Implementation_Registry.md', 'utf8');

// Replace the previous incorrect v1.6 entry
registry = registry.replace('| **v1.6** | **[PENDING]** UX Safeguards & Global State | `BunBau_v1.6_UX_State_Fixes_Plan.md` | Chatbot state realism, Import idempotency & safeguards, removal of hardcoded Dashboard mock data in favor of a zero-to-imported global state engine. | **AWAITING APPROVAL** |', 
'| **v1.6** | **[PENDING]** UX Safeguards & Demo Mode | `BunBau_v1.6_UX_State_Fixes_Plan.md` | True Seed Data/Demo Mode architecture (switching between Schwab dummy data and live Fidelity data), Chatbot dynamic state integration, Import idempotency safeguards, and Header Theme deduplication. | **AWAITING APPROVAL** |');

fs.writeFileSync('../docs/BunBau_Implementation_Registry.md', registry);
