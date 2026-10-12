const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

code = code.replace(/<\/AppletContainer>\n                 <\/>/g, '</AppletContainer>\n                 </div>\n               </div>\n             </>');

fs.writeFileSync('src/app/page.tsx', code);
