const fs = require('fs');
let code = fs.readFileSync('src/components/UploadValidationModal.tsx', 'utf8');

const regex = /\{\/\* Floating Chatbot Popover \*\/\}[\s\S]*?(?=\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<PortfolioPreviewModal)/;

const newChatMarkup = `{/* Floating Chatbot Popover */}
              {isChatOpen && (
                 <div className="absolute bottom-24 right-6 w-[400px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden z-50">
                    <div className="p-3 bg-primary-mint text-white font-bold flex justify-between items-center shrink-0">
                      <span className="flex items-center gap-2"><Bot size={16}/> BunBau AI Agent</span>
                      <button onClick={() => setIsChatOpen(false)} className="hover:bg-white/20 p-1 rounded transition"><X size={16}/></button>
                    </div>
                    <div className="h-64 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50 flex flex-col">
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={\`p-3 rounded-xl max-w-[85%] text-sm shadow-sm \${msg.role === 'system' ? 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-gray-200 self-start rounded-tl-sm' : 'bg-primary-mint/10 border border-primary-mint/20 text-slate-800 dark:text-white self-end rounded-tr-sm'}\`}>
                          {msg.role === 'system' && <span className="font-bold text-primary-mint text-[10px] uppercase block mb-1">BunBau AI Agent</span>}
                          {msg.text}
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-white dark:bg-[#0b1021] border-t border-gray-100 dark:border-slate-800 flex gap-2 shrink-0">
                      <input 
                        type="text" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && chatInput.trim()) {
                            setChatMessages([...chatMessages, {role: 'user', text: chatInput}]);
                            setChatInput("");
                          }
                        }}
                        placeholder="Chat with AI..." 
                        className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-mint dark:text-white" 
                      />
                      <button 
                        onClick={() => {
                          if (chatInput.trim()) {
                            setChatMessages([...chatMessages, {role: 'user', text: chatInput}]);
                            setChatInput("");
                          }
                        }}
                        className="bg-primary-mint text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-600 transition">Send</button>
                    </div>
                 </div>
              )}`;

code = code.replace(regex, newChatMarkup);
fs.writeFileSync('src/components/UploadValidationModal.tsx', code);
console.log('Chatbot updated.');
