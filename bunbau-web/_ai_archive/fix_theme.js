const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

// Remove the one outside the user block
code = code.replace(/\{\/\* Theme Toggle \*\/\}\s*<button onClick=\{toggleTheme\} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition">\s*\{theme === 'dark' \? <Sun size=\{18\} \/> : <Moon size=\{18\} \/>\}\s*<\/button>/m, '');

// Fix the one inside the user block
const oldBtn2 = `<button onClick={toggleTheme} className="p-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition dark:text-yellow-400" title="Toggle Theme">
                   <Sun size={18} className="hidden dark:block" />
                   <Moon size={18} className="block dark:hidden text-slate-700" />
                 </button>`;
const newBtn2 = `<button onClick={toggleTheme} className="p-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition dark:text-yellow-400" title="Toggle Theme">
                   {isDarkMode ? <Sun size={18} /> : <Moon size={18} className="text-slate-700" />}
                 </button>`;
                 
code = code.replace(oldBtn2, newBtn2);

fs.writeFileSync('src/app/page.tsx', code);
