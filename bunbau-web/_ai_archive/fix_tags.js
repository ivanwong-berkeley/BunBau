const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

// The block starts near:
//               return (
//             <div className="w-full">
//               {isDemoMode && (

code = code.replace(/return \(\n             <div className="w-full">/g, 'return (\n             <>');
code = code.replace(/<\/div>\n             <\/>/g, '</>');
code = code.replace(/<\/>\s*\);\s*\}\)\(\)\}/g, '</>\n               );\n             })()}');
fs.writeFileSync('src/app/page.tsx', code);
