const fs = require('fs');
let code = fs.readFileSync('src/components/UploadValidationModal.tsx', 'utf8');

// 1. Fix panning
code = code.replace(
  'className="flex-1 relative overflow-auto p-4 flex items-center justify-center"',
  'className="flex-1 relative overflow-auto p-4"'
);

code = code.replace(
  'className="transition-transform origin-center flex items-center justify-center w-full h-full" style={{ transform: `scale(${imageScale})` }}',
  'className="transition-transform" style={{ transformOrigin: "top left", width: `calc(100% * ${imageScale})`, height: `calc(100% * ${imageScale})` }}'
);

code = code.replace(
  'className="max-w-full max-h-full object-contain rounded shadow-md border border-gray-300 dark:border-slate-700"',
  'className="w-full h-full object-contain rounded shadow-md border border-gray-300 dark:border-slate-700"'
);

// 2. Chatbot injection
// We need to inject into the right panel which is currently `<div className="w-1/2 flex flex-col bg-white dark:bg-[#0b1021]">`
// It currently has `<div className="flex-1 overflow-auto p-6">` ... `</div>`
// Replace the closing `</div>` of the flex-1 container before the Action Footer with the chatbot.
const oldActionFooterStart = '{/* Action Footer */}';
const chatbotUI = `
              {/* Validation Chatbot (Self-Learning Loop) */}
              <div className="h-64 border-t border-gray-100 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900/50">
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700 max-w-[85%] text-sm shadow-sm dark:text-gray-200">
                    <span className="font-bold text-primary-mint text-xs mb-1 block">BunBau AI Agent</span>
                    I found a potential issue. Is "UNH" an Option or a Stock in this specific Schwab account?
                  </div>
                  <div className="bg-primary-mint/10 p-3 rounded-lg border border-primary-mint/20 max-w-[85%] ml-auto text-sm text-slate-800 dark:text-white shadow-sm">
                    It is always a Covered Call.
                    <button className="mt-2 flex items-center gap-1 text-xs bg-white dark:bg-slate-900 px-2 py-1 rounded shadow-sm hover:text-primary-mint transition font-bold border border-gray-200 dark:border-slate-700">
                      📌 Save as Rule
                    </button>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-[#0b1021] border-t border-gray-100 dark:border-slate-800 flex gap-2">
                  <input type="text" placeholder="Explain correction or click 📌 Save as Rule..." className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-mint dark:text-white" />
                  <button className="bg-primary-mint text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-600 transition">Send</button>
                </div>
              </div>
`;

code = code.replace(oldActionFooterStart, chatbotUI + '\n              ' + oldActionFooterStart);

fs.writeFileSync('src/components/UploadValidationModal.tsx', code);
