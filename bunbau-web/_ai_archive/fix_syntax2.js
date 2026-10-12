const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// Find the avatar dropdown block
const lines = content.split('\n');
let fixed = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('</>') && lines[i+1].includes('</div>') && lines[i+2].includes(')}')) {
        fixed.push(lines[i]); // </>
        fixed.push('                  )}'); // )} to close the isDropdownOpen block
        fixed.push('                </div>'); // close the relative div
        fixed.push('              </div>'); // close the flex container
        i += 3; // skip the broken ones
    } else {
        fixed.push(lines[i]);
    }
}
fs.writeFileSync('src/app/page.tsx', fixed.join('\n'));
