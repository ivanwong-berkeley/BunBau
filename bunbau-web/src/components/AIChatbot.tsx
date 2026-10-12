'use client';

import React, { useState } from 'react';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user'|'ai', text: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { profile } = useAuth();

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          apiKey: profile?.byokKey,
          portfolioContext: { note: "Context injected from Firestore in real app" }
        })
      });
      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'ai', text: data.text }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: `Error: ${data.error}` }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Network error connecting to Gemini.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-primary-violet text-white p-4 rounded-full shadow-lg hover:bg-violet-600 transition flex items-center justify-center"
      >
        <Sparkles size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 h-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden z-50">
      <div className="bg-primary-violet text-white p-4 flex justify-between items-center shrink-0">
        <h3 className="font-semibold flex items-center gap-2"><Sparkles size={18} /> BunBau AI</h3>
        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded transition"><X size={18} /></button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-900">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-500 mt-10">Ask me anything about your portfolio yields or asset allocation!</p>
        )}
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-2xl max-w-[85%] text-sm ${m.role === 'user' ? 'bg-primary-mint text-white rounded-br-none' : 'bg-white dark:bg-slate-800 dark:text-gray-200 border border-gray-100 dark:border-slate-700 rounded-bl-none'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl rounded-bl-none border border-gray-100 dark:border-slate-700 text-gray-500"><Loader2 className="animate-spin" size={16} /></div>
          </div>
        )}
      </div>

      <div className="p-3 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 shrink-0">
        <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <input 
            value={input} onChange={e => setInput(e.target.value)}
            placeholder="Ask AI..." 
            className="flex-1 p-2 bg-gray-100 dark:bg-slate-700 dark:text-white rounded-lg outline-none text-sm"
          />
          <button type="submit" disabled={!input.trim()} className="bg-primary-violet text-white p-2 rounded-lg disabled:opacity-50 hover:bg-violet-600"><Send size={16} /></button>
        </form>
      </div>
    </div>
  );
}
