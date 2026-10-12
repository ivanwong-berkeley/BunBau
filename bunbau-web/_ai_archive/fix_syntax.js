const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

// I'll manually fix the trailing block.
// The issue is `</div>\n             </div>\n               );\n             })()}`
// Wait, looking at the previous injection:
/*
             {activeTab === 'dashboard' && (() => {
               // ... declarations
               return (
             <>
               // ...
             </>
               );
             })()}
*/

code = code.replace(/<\/div>\n             <\/div>\n               \);\n             \}\)\(\)\}/g, '</div>\n             </>\n               );\n             })()}');
fs.writeFileSync('src/app/page.tsx', code);
