'use client';

import React from 'react';
import { X, AlertTriangle, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLLMDrawer?: () => void;
}

export function AboutModal({ isOpen, onClose, onOpenLLMDrawer }: AboutModalProps) {
  const { profile } = useAuth();
  if (!isOpen) return null;

  // Derive active LLM status from MultiVendorVault or legacy config
  const activeVendor: import('../lib/models').LlmVendor = profile?.llmVault?.activeVendor || (profile?.llmConfig?.tier1?.vendor as import('../lib/models').LlmVendor) || 'Gemini';
  const vendorConfig = profile?.llmVault?.vendors?.[activeVendor];
  const isKeyConfigured = !!vendorConfig?.validated || !!profile?.byokKey;
  const activeTier1Model = vendorConfig?.tier1Model || profile?.llmConfig?.tier1?.model || 'None';
  const activeTier2Model = vendorConfig?.tier2Model || profile?.llmConfig?.tier2?.model || 'None';

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#0b1021] text-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-800 overflow-hidden relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>

          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-primary-amber rounded-3xl flex items-center justify-center text-4xl font-bold shadow-lg mb-4 text-slate-900">
              B
            </div>

            <h2 className="text-2xl font-bold text-primary-mint mb-1">BunBau (資本寶)</h2>
            <p className="text-xs tracking-[0.2em] text-slate-400 uppercase mb-6">Personal Portfolio Intelligence</p>

            {/* Version & Build info */}
            <div className="w-full bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden mb-5 text-xs">
              <div className="flex justify-between p-2.5 border-b border-slate-700/50">
                <span className="text-slate-400">Application Version</span>
                <span className="text-white font-medium">2.7.16 (Build 131)</span>
              </div>
              <div className="flex justify-between p-2.5">
                <span className="text-slate-400">Architecture</span>
                <span className="text-primary-violet font-mono">{'v2.9.9 High-Visibility Tactile Sub-Navigation, Two-Tier Advisory Box Accessibility & Multi-Year Audit Report/Chart/Scroll Workstation Architecture'}</span>
              </div>
            </div>

            {/* Active LLM Vendor & Model Status */}
            <div className="w-full bg-slate-800/60 rounded-xl border border-slate-700/60 p-3.5 mb-5 text-left text-xs space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
                <span className="font-bold uppercase text-slate-400 tracking-wider text-[10px]">Active AI Vendor</span>
                <span className="font-bold text-primary-mint flex items-center gap-1.5">
                  {isKeyConfigured && <CheckCircle2 size={13} className="text-emerald-400" />}
                  {activeVendor}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Tier 1 Model (Extraction):</span>
                <span className="font-mono text-slate-200">{activeTier1Model}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Tier 2 Model (Intel & Chat):</span>
                <span className="font-mono text-slate-200">{activeTier2Model}</span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-slate-700/40">
                <span className="text-slate-400">Security & Encryption:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                  <ShieldCheck size={12} /> AES-256-GCM (Zero Plaintext)
                </span>
              </div>
            </div>

            {/* RED Alert Banner if no key is configured */}
            {!isKeyConfigured ? (
              <div
                data-testid="about-no-key-alert"
                className="w-full mb-6 p-3 bg-red-950/70 border border-red-500/60 rounded-xl text-red-200 text-xs flex items-center justify-between gap-2 shadow-lg animate-pulse"
              >
                <div className="flex items-center gap-2 text-left">
                  <AlertTriangle size={18} className="text-red-400 shrink-0" />
                  <div>
                    <p className="font-bold text-red-300">No LLM Key Configured</p>
                    <p className="text-[10px] text-red-400/90">AI screenshot import and chat advisor inactive.</p>
                  </div>
                </div>
                {onOpenLLMDrawer && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLLMDrawer();
                    }}
                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-[11px] shrink-0 transition flex items-center gap-1"
                  >
                    Setup <ArrowRight size={10} />
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full mb-6 p-2 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-[11px] flex items-center justify-center gap-1.5 font-medium">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Active LLM validated and ready for intelligent extraction.</span>
              </div>
            )}

            <p className="text-xs text-slate-500">© 2026 BunBau AI. All rights reserved.</p>
          </div>
        </div>
      </div>
    </>
  );
}
