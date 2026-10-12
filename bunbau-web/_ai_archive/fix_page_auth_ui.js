const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

const oldButton = `<button onClick={signInWithGoogle} className="flex items-center gap-2 text-sm font-medium text-primary-mint bg-primary-mint/10 px-4 py-2 rounded-full hover:bg-primary-mint/20 transition">
                 <LogIn size={16} /> Sign In
               </button>`;

const newButton = `<button 
                 onClick={signInWithGoogle} 
                 disabled={isAuthenticating}
                 className={\`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition \${isAuthenticating ? 'bg-primary-mint/5 text-primary-mint/50 cursor-not-allowed' : 'bg-primary-mint/10 text-primary-mint hover:bg-primary-mint/20'}\`}
               >
                 <LogIn size={16} /> {isAuthenticating ? 'Signing In...' : 'Sign In'}
               </button>`;

// If the first regex failed, try a looser replacement
if (code.includes('onClick={signInWithGoogle}')) {
  code = code.replace(/<button onClick=\{signInWithGoogle\}[\s\S]*?<\/button>/m, newButton);
}

fs.writeFileSync('src/app/page.tsx', code);
console.log('page.tsx Sign In button updated with feedback state (fallback regex).');
