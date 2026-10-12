const fs = require('fs');
let code = fs.readFileSync('src/components/UploadValidationModal.tsx', 'utf8');

// 1. Add Chat State
code = code.replace(
  "const [activeImageIndex, setActiveImageIndex] = useState(0);",
  "const [activeImageIndex, setActiveImageIndex] = useState(0);\n  const [isChatOpen, setIsChatOpen] = useState(false);"
);

// 2. Fix Left Panel (Split Zoom Controls)
const oldLeftPanel = `<div className="flex-1 relative overflow-auto p-4">
                    {/* Level-2 Controls (Image Specific) */}
                    <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur p-1 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                      <button onClick={() => setImageScale(s => Math.min(s + 0.25, 3))} className="p-2 hover:text-primary-mint dark:text-slate-300" title="Zoom In"><ZoomIn size={16}/></button>
                      <button onClick={() => setImageScale(1)} className="p-2 hover:text-primary-mint dark:text-slate-300" title="Reset Zoom"><RotateCcw size={16}/></button>
                      <button onClick={() => setImageScale(s => Math.max(s - 0.25, 0.5))} className="p-2 hover:text-primary-mint dark:text-slate-300" title="Zoom Out"><ZoomOut size={16}/></button>
                      <button onClick={() => imageContainerRef.current?.requestFullscreen()} className="p-2 hover:text-primary-mint dark:text-slate-300" title="Full Screen View"><Maximize size={16}/></button>
                    </div>
                    
                    {/* The Image */}
                    <div ref={imageContainerRef} className="transition-transform" style={{ transformOrigin: "top left", width: \`calc(100% * \${imageScale})\`, height: \`calc(100% * \${imageScale})\` }}>
                      <img src={images[activeImageIndex]} alt={\`Screenshot \${activeImageIndex + 1}\`} className="w-full h-full object-contain rounded shadow-md border border-gray-300 dark:border-slate-700" />
                    </div>
                  </div>`;

const newLeftPanel = `<div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-gray-500 uppercase px-2">Image Controls</span>
                    <div className="flex gap-1 bg-white dark:bg-slate-900 rounded-lg p-1 border border-gray-200 dark:border-slate-700 shadow-sm">
                      <button onClick={() => setImageScale(s => Math.min(s + 0.25, 3))} className="p-1 hover:text-primary-mint dark:text-slate-300" title="Zoom In"><ZoomIn size={16}/></button>
                      <button onClick={() => setImageScale(1)} className="p-1 hover:text-primary-mint dark:text-slate-300" title="Reset Zoom"><RotateCcw size={16}/></button>
                      <button onClick={() => setImageScale(s => Math.max(s - 0.25, 0.5))} className="p-1 hover:text-primary-mint dark:text-slate-300" title="Zoom Out"><ZoomOut size={16}/></button>
                      <button onClick={() => imageContainerRef.current?.requestFullscreen()} className="p-1 hover:text-primary-mint dark:text-slate-300" title="Full Screen View"><Maximize size={16}/></button>
                    </div>
                  </div>
                  <div className="flex-1 relative overflow-auto p-4">
                    <div ref={imageContainerRef} className="transition-transform" style={{ transformOrigin: "top left", width: \`calc(100% * \${imageScale})\`, height: \`calc(100% * \${imageScale})\` }}>
                      <img src={images[activeImageIndex]} alt={\`Screenshot \${activeImageIndex + 1}\`} className="w-full h-full object-contain rounded shadow-md border border-gray-300 dark:border-slate-700" />
                    </div>
                  </div>`;

code = code.replace(oldLeftPanel, newLeftPanel);


// 3. Fix Chat UI Layout
// Find the old Validation Chatbot block and remove it
const chatbotStart = "{/* Validation Chatbot (Self-Learning Loop) */}";
const chatbotEnd = "</div>\n              {/* Action Footer */}";
if (code.includes(chatbotStart)) {
  const parts = code.split(chatbotStart);
  const tailParts = parts[1].split("{/* Action Footer */}");
  code = parts[0] + "{/* Action Footer */}" + tailParts[1];
}

// Re-inject Chatbot as Absolute Floating Popover and add FAB to footer
const actionFooterPattern = `<button 
                  onClick={() => setShowPreview(true)}`;
const actionFooterReplacement = `<button onClick={() => setIsChatOpen(!isChatOpen)} className="px-6 py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition flex items-center gap-2">
                  <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></span> Ask AI
                </button>
                <button 
                  onClick={() => setShowPreview(true)}`;

code = code.replace(actionFooterPattern, actionFooterReplacement);

// Add the floating popover at the end of the Right panel
const rightPanelEndPattern = `</div>
          </div>
        </div>
      </div>`;

const floatingChat = `
              {/* Floating Chatbot Popover */}
              {isChatOpen && (
                 <div className="absolute bottom-24 right-6 w-[400px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden z-50">
                    <div className="p-3 bg-primary-mint text-white font-bold flex justify-between items-center">
                      <span>BunBau AI Agent</span>
                      <button onClick={() => setIsChatOpen(false)} className="hover:bg-white/20 p-1 rounded transition"><X size={16}/></button>
                    </div>
                    <div className="h-64 overflow-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
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
              )}
            </div>
          </div>
        </div>
      </div>`;

code = code.replace(rightPanelEndPattern, floatingChat);

// Ensure right panel has 'relative'
code = code.replace('<div className="w-1/2 flex flex-col bg-white dark:bg-[#0b1021]">', '<div className="w-1/2 flex flex-col bg-white dark:bg-[#0b1021] relative">');

fs.writeFileSync('src/components/UploadValidationModal.tsx', code);
