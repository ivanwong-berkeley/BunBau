const fs = require('fs');

const code = `'use client';

import React, { useState, useEffect } from 'react';
import { X, ZoomIn, Info, ZoomOut, RotateCcw, Maximize, AlertTriangle, CheckCircle, Plus, Image as ImageIcon, Trash2, ChevronLeft, ChevronRight, Bot } from 'lucide-react';
import { PortfolioPreviewModal } from './PortfolioPreviewModal';
import { DeleteDangerZone } from './DeleteDangerZone';

interface UploadValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
}

export function UploadValidationModal({ isOpen, onClose, onApprove }: UploadValidationModalProps) {
  const [globalScale, setGlobalScale] = useState(1);
  const [imageScale, setImageScale] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Terminal Extraction State
  const [isExtracting, setIsExtracting] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const terminalTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // AI Validation State
  const [aiStatus, setAiStatus] = useState<'red' | 'green'>('red');
  const [showPreview, setShowPreview] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const imageContainerRef = React.useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const newImageUrl = URL.createObjectURL(file);
      
      // Start Terminal Simulation
      setIsExtracting(true);
      setTerminalLogs([\`[System] Initializing Gemini 1.5 Pro Multimodal Engine...\`]);
      
      setTimeout(() => setTerminalLogs(prev => [...prev, \`[File] Ingesting \${file.name} (Reading screenshot data)...\`]), 800);
      setTimeout(() => setTerminalLogs(prev => [...prev, \`[Extract] Parsing dense financial grid... scanning row data...\`]), 2000);
      setTimeout(() => setTerminalLogs(prev => [...prev, \`[Extract] Successfully extracted 15 individual positions.\`]), 3500);
      setTimeout(() => setTerminalLogs(prev => [...prev, \`[Analysis] Validating against custom rule DB (e.g. UNH -> Stock)...\`]), 5000);
      setTimeout(() => {
        setTerminalLogs(prev => [...prev, \`[Complete] Validation Success. UI unlocked. Auto-closing terminal in 10s...\`]);
        setImages([...images, newImageUrl]);
        setAiStatus('green'); 
        
        terminalTimeoutRef.current = setTimeout(() => {
          setIsExtracting(false);
        }, 10000);
      }, 7000);
    }
  };

  const closeTerminal = () => {
    if (terminalTimeoutRef.current) clearTimeout(terminalTimeoutRef.current);
    setIsExtracting(false);
  };

  const handleReject = () => {
    setImages([]);
    setActiveImageIndex(0);
    setAiStatus('red');
    setIsChatOpen(false);
  };

  // Completely robust 15-item mock data perfectly mapping the screenshot
  const mockExtractedData = {
    institution: 'Fidelity',
    account: '***-6238',
    positions: [
      { symbol: 'CASH', value: 100008.97, category: 'Cash' },
      { symbol: 'AAPL 310 Put', value: -103.00, category: 'CSP' },
      { symbol: 'FBTC', value: 5864.78, category: 'ETF' },
      { symbol: 'FCNTX', value: 7397.24, category: 'ETF' },
      { symbol: 'GLDM', value: 1711.31, category: 'ETF' },
      { symbol: 'MSFT 475 Put', value: -125.00, category: 'CSP' },
      { symbol: 'NVDA', value: 4382.81, category: 'Stock' },
      { symbol: 'NVDA 200 Put', value: -89.00, category: 'CSP' },
      { symbol: 'ORCL', value: 426919.63, category: 'Stock' },
      { symbol: 'SGOV', value: 77788.16, category: 'ETF' },
      { symbol: 'SLV', value: 10948.00, category: 'ETF' },
      { symbol: 'SLV 68 Call', value: -8.00, category: 'Covered Call' },
      { symbol: 'T', value: 2430.00, category: 'Stock' },
      { symbol: 'T 28 Call', value: -8.00, category: 'Covered Call' },
      { symbol: 'UNH', value: 37190.00, category: 'Stock' },
    ]
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 transition-opacity" onClick={onClose} />
      
      {/* Global Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="relative bg-white dark:bg-[#0b1021] w-full max-w-7xl h-[85vh] rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col overflow-hidden transition-transform origin-center"
          style={{ transform: \`scale(\${globalScale})\` }}
        >
          {/* Hacker Terminal Overlay */}
          {isExtracting && (
            <div className="absolute inset-0 z-[60] bg-black/95 flex flex-col m-4 rounded-xl shadow-2xl border border-gray-800 overflow-hidden">
              <div className="flex justify-between items-center p-3 bg-gray-900 border-b border-gray-800">
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-red-500"></div>
                   <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                   <div className="w-3 h-3 rounded-full bg-green-500"></div>
                   <span className="text-gray-400 font-mono text-xs ml-2">bunbau_extraction_term</span>
                </div>
                <button onClick={closeTerminal} className="text-gray-400 hover:text-white transition bg-gray-800 hover:bg-gray-700 rounded p-1" title="Close Terminal"><X size={16} /></button>
              </div>
              <div className="flex-1 p-6 font-mono text-sm text-green-500 space-y-3 overflow-auto">
                {terminalLogs.map((log, i) => (
                  <div key={i} className="animate-pulse">{log}</div>
                ))}
                {terminalLogs.length < 6 && (
                  <div className="animate-pulse opacity-50">_</div>
                )}
              </div>
            </div>
          )}

          {/* Header & Level-1 Controls */}
          <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold dark:text-white">Screenshot Upload & Validation</h2>
              
              {images.length > 0 && (
                <div className={\`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold \${aiStatus === 'green' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20 cursor-pointer hover:bg-red-500/20'}\`}>
                  {aiStatus === 'green' ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>}
                  {aiStatus === 'green' ? 'AI Validation Pass' : 'AI Found Issues (Click to Resolve)'}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-lg p-1 border border-gray-200 dark:border-slate-700">
                <button onClick={() => setGlobalScale(s => Math.min(s + 0.1, 1.2))} className="p-1 hover:text-primary-mint dark:text-slate-300" title="Zoom In"><ZoomIn size={16}/></button>
                <button onClick={() => setGlobalScale(1)} className="p-1 hover:text-primary-mint dark:text-slate-300" title="Reset Zoom"><RotateCcw size={16}/></button>
                <button onClick={() => setGlobalScale(s => Math.max(s - 0.1, 0.8))} className="p-1 hover:text-primary-mint dark:text-slate-300" title="Zoom Out"><ZoomOut size={16}/></button>
                <button onClick={() => document.documentElement.requestFullscreen()} className="p-1 hover:text-primary-mint dark:text-slate-300" title="Full Page"><Maximize size={16}/></button>
              </div>
              <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition" title="Information"><Info size={20}/></button>
              <button onClick={() => setShowDelete(true)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition" title="Clear Portfolio"><Trash2 size={20}/></button>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition dark:text-gray-400"><X size={20}/></button>
            </div>
          </div>

          {/* Main Body */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Left: Image Carousel & Level-2 Zoom */}
            <div className="w-1/2 border-r border-gray-100 dark:border-slate-800 flex flex-col bg-slate-100 dark:bg-slate-900 relative">
              {images.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <div className="w-20 h-20 bg-primary-mint/10 rounded-full flex items-center justify-center mb-4 text-primary-mint">
                    <ImageIcon size={32} />
                  </div>
                  <h3 className="text-lg font-bold dark:text-white mb-2">Upload First Screenshot</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">Select your primary brokerage screenshot to begin the AI extraction process.</p>
                  <label className="bg-primary-mint text-white px-6 py-3 rounded-xl font-medium cursor-pointer hover:bg-emerald-600 transition">
                    Browse Files
                    <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                  </label>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
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
                  </div>
                  
                  {/* Carousel Thumbnails */}
                  <div className="h-24 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 p-2 flex items-center gap-2 overflow-x-auto relative group">
                    <button className="absolute left-2 z-10 p-1 bg-white/80 dark:bg-slate-700/80 rounded-full shadow hover:text-primary-mint hidden group-hover:block"><ChevronLeft size={16}/></button>
                    <button className="absolute right-2 z-10 p-1 bg-white/80 dark:bg-slate-700/80 rounded-full shadow hover:text-primary-mint hidden group-hover:block"><ChevronRight size={16}/></button>
                    
                    {images.map((imgUrl, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => setActiveImageIndex(idx)}
                        className={\`w-16 h-16 shrink-0 rounded-lg border-2 overflow-hidden bg-slate-100 \${activeImageIndex === idx ? 'border-primary-mint' : 'border-transparent opacity-50 hover:opacity-100'}\`}
                      >
                        <img src={imgUrl} className="w-full h-full object-cover" alt="thumbnail" />
                      </button>
                    ))}
                    <label className="w-16 h-16 shrink-0 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 flex flex-col items-center justify-center text-gray-400 hover:text-primary-mint hover:border-primary-mint transition cursor-pointer bg-gray-50 dark:bg-slate-900">
                      <Plus size={20} />
                      <span className="text-[10px] mt-1 font-medium">Add Supp.</span>
                      <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                    </label>
                  </div>
                </>
              )}
            </div>

            {/* Right: Extraction Data Table */}
            <div className="w-1/2 flex flex-col bg-white dark:bg-[#0b1021] relative">
              <div className="flex-1 overflow-auto p-6">
                
                {images.length > 0 && (
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Institution</label>
                      <div className="p-2.5 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 font-medium dark:text-white mt-1.5 shadow-sm">{mockExtractedData.institution}</div>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Masked Account</label>
                      <div className="p-2.5 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 font-mono text-sm dark:text-white mt-1.5 shadow-sm">{mockExtractedData.account}</div>
                    </div>
                  </div>
                )}

                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Extracted Positions (Stitched)</h3>
                
                {images.length > 0 ? (
                  <table className="w-full text-sm text-left text-slate-900 dark:text-slate-200 mb-12">
                    <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Symbol</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Value</th>
                        <th className="px-4 py-3 rounded-tr-lg text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {mockExtractedData.positions.map((pos, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-medium">{pos.symbol}</td>
                          <td className="px-4 py-3">
                            <span className={\`px-2 py-1 rounded text-xs \${
                              pos.category === 'Cash' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                              pos.category === 'CSP' || pos.category === 'Covered Call' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                              pos.category === 'ETF' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                              'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                            }\`}>
                              {pos.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {pos.value < 0 ? \`-\$\${Math.abs(pos.value).toLocaleString('en-US', {minimumFractionDigits: 2})}\` : \`\$\${pos.value.toLocaleString('en-US', {minimumFractionDigits: 2})}\`}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400 hover:text-primary-mint cursor-pointer">Edit</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex items-center justify-center h-48 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl text-sm text-gray-400 italic">
                    Waiting for screenshot upload...
                  </div>
                )}
              </div>
              
              {/* Action Footer */}
              <div className="p-6 border-t border-gray-100 dark:border-slate-800 flex gap-4 bg-gray-50 dark:bg-slate-900/30 shrink-0">
                <button 
                  onClick={handleReject}
                  disabled={images.length === 0}
                  className="px-6 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-red-500 rounded-xl font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition disabled:opacity-50"
                >
                  Reject & Restart
                </button>
                <button onClick={() => setIsChatOpen(!isChatOpen)} disabled={images.length === 0} className="px-6 py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition flex items-center gap-2 disabled:opacity-50">
                  <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></span> Ask AI
                </button>
                <button 
                  onClick={() => setShowPreview(true)} 
                  disabled={images.length === 0}
                  className="px-6 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-medium dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
                >
                  Preview Impact
                </button>
                <div className="flex-1"></div>
                <button 
                  onClick={onApprove} 
                  disabled={aiStatus === 'red' || images.length === 0}
                  className="px-8 py-3 bg-primary-mint text-white rounded-xl font-bold hover:bg-emerald-600 transition disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle size={18}/> Approve & Import
                </button>
              </div>

              {/* Floating Chatbot Popover */}
              {isChatOpen && (
                 <div className="absolute bottom-24 right-6 w-[400px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden z-50">
                    <div className="p-3 bg-primary-mint text-white font-bold flex justify-between items-center">
                      <span className="flex items-center gap-2"><Bot size={16}/> BunBau AI Agent</span>
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
      </div>

      <PortfolioPreviewModal isOpen={showPreview} onClose={() => setShowPreview(false)} />
      
      {showDelete && (
        <DeleteDangerZone 
          isOpen={showDelete} 
          onClose={() => setShowDelete(false)} 
          type="portfolio" 
        />
      )}
    </>
  );
}
`;

fs.writeFileSync('src/components/UploadValidationModal.tsx', code);
