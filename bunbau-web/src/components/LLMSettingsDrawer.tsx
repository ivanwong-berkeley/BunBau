'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LlmVendor, VendorConfig, MultiVendorVault } from '../lib/models';
import { encryptApiKey, decryptApiKey, maskApiKey } from '../lib/utils/cryptoVault';

interface LLMSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPPORTED_VENDORS: LlmVendor[] = ['Gemini', 'Anthropic', 'OpenAI', 'Ollama'];

const DEFAULT_MODELS: Record<LlmVendor, { defaultTier1: string; defaultTier2: string; list: string[] }> = {
  Gemini: {
    defaultTier1: 'gemini-2.5-flash',
    defaultTier2: 'gemini-2.5-pro',
    list: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
  },
  Anthropic: {
    defaultTier1: 'claude-3-5-haiku-20241022',
    defaultTier2: 'claude-3-5-sonnet-20241022',
    list: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  },
  OpenAI: {
    defaultTier1: 'gpt-4-turbo',
    defaultTier2: 'gpt-4o',
    list: ['gpt-4o', 'gpt-4-turbo'],
  },
  Ollama: {
    defaultTier1: 'mistral',
    defaultTier2: 'llama3',
    list: ['llama3', 'mistral', 'gemma:7b'],
  },
};

export function LLMSettingsDrawer({ isOpen, onClose }: LLMSettingsDrawerProps) {
  const { user, profile, updateProfileData } = useAuth();

  // Active selected vendor tab
  const [selectedVendor, setSelectedVendor] = useState<LlmVendor>(
    profile?.llmVault?.activeVendor || (profile?.llmConfig?.tier1?.vendor as LlmVendor) || 'Gemini'
  );

  // Per-vendor vault in memory
  const [vaultState, setVaultState] = useState<Partial<Record<LlmVendor, VendorConfig>>>(
    profile?.llmVault?.vendors || {}
  );

  // Active editing inputs for currently selected vendor
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isKeyValid, setIsKeyValid] = useState(false);

  const [models, setModels] = useState<string[]>(DEFAULT_MODELS.Gemini.list);
  const [tier1Model, setTier1Model] = useState(DEFAULT_MODELS.Gemini.defaultTier1);
  const [tier2Model, setTier2Model] = useState(DEFAULT_MODELS.Gemini.defaultTier2);

  const [isSaving, setIsSaving] = useState(false);

  // v5.2 (D7): Tier 1 = Light/fast, Tier 2 = Advanced/most powerful. Existing profiles must confirm once.
  const [tierConfirmed, setTierConfirmed] = useState(false);
  const hasSavedLlmConfig = !!(profile?.llmVault || profile?.byokKey || profile?.llmConfig);
  const needsTierConfirm = hasSavedLlmConfig && profile?.llmTierVersion !== 2 && !tierConfirmed;
  const swapTiers = () => {
    setTier1Model(tier2Model);
    setTier2Model(tier1Model);
    setTierConfirmed(true);
  };

  // Sync state whenever profile hydrates or modal opens
  useEffect(() => {
    if (!profile) return;
    const vault = profile.llmVault;
    if (vault) {
      setVaultState(vault.vendors || {});
      const active = vault.activeVendor || 'Gemini';
      setSelectedVendor(active);
      loadVendorState(active, vault.vendors || {});
    } else if (profile.byokKey) {
      // Migrate legacy single key into vault structure
      const legacyVendor: LlmVendor = (profile.llmConfig?.tier1?.vendor as LlmVendor) || 'Gemini';
      const initialVault: Partial<Record<LlmVendor, VendorConfig>> = {
        [legacyVendor]: {
          encryptedKey: '',
          maskedKey: maskApiKey(profile.byokKey),
          validated: true,
          tier1Model: profile.llmConfig?.tier1?.model || DEFAULT_MODELS[legacyVendor].defaultTier1,
          tier2Model: profile.llmConfig?.tier2?.model || DEFAULT_MODELS[legacyVendor].defaultTier2,
          availableModels: DEFAULT_MODELS[legacyVendor].list,
          updatedAt: new Date().toISOString(),
        },
      };
      setVaultState(initialVault);
      setSelectedVendor(legacyVendor);
      loadVendorState(legacyVendor, initialVault, profile.byokKey);
    }
  }, [profile, isOpen]);

  // Load a vendor's saved configuration into the drawer inputs
  const loadVendorState = (
    vendor: LlmVendor,
    currentVault: Partial<Record<LlmVendor, VendorConfig>>,
    rawKeyFallback?: string
  ) => {
    const config = currentVault[vendor];
    const def = DEFAULT_MODELS[vendor];

    if (config) {
      setIsKeyValid(config.validated);
      setModels(config.availableModels && config.availableModels.length > 0 ? config.availableModels : def.list);
      setTier1Model(config.tier1Model || def.defaultTier1);
      setTier2Model(config.tier2Model || def.defaultTier2);
      // If we have a masked key, show the masked representation
      setApiKeyInput(rawKeyFallback || config.maskedKey || '');
    } else {
      setIsKeyValid(false);
      setModels(def.list);
      setTier1Model(def.defaultTier1);
      setTier2Model(def.defaultTier2);
      setApiKeyInput('');
    }
  };

  // When user switches vendor tabs in LLM Settings
  const handleVendorTabChange = (vendor: LlmVendor) => {
    setSelectedVendor(vendor);
    setShowKey(false);
    loadVendorState(vendor, vaultState);
  };

  if (!isOpen) return null;

  const handleValidate = async () => {
    if (!apiKeyInput.trim()) return;
    setIsValidating(true);
    try {
      const res = await fetch('/api/llm/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput, vendor: selectedVendor }),
      });
      const data = await res.json();
      if (data.success) {
        setIsKeyValid(true);
        const validatedModels = data.models || DEFAULT_MODELS[selectedVendor].list;
        setModels(validatedModels);
        if (!validatedModels.includes(tier1Model)) {
          setTier1Model(validatedModels[0] || DEFAULT_MODELS[selectedVendor].defaultTier1);
        }
        if (!validatedModels.includes(tier2Model)) {
          setTier2Model(validatedModels[1] || validatedModels[0] || DEFAULT_MODELS[selectedVendor].defaultTier2);
        }
        alert(`Validation successful! ${selectedVendor} API key verified.`);
      } else {
        alert('Validation failed: ' + (data.error || 'Invalid API key'));
        setIsKeyValid(false);
      }
    } catch (e) {
      alert('Network error while validating API key');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      // Encrypt API key with user's UID (AES-256-GCM)
      let encryptedPayload = '';
      let maskedKey = '';

      // If the user typed a new key (not starting with bullet mask)
      if (apiKeyInput && !apiKeyInput.includes('••••')) {
        const encrypted = await encryptApiKey(apiKeyInput, user.uid);
        encryptedPayload = encrypted.ciphertext;
        maskedKey = encrypted.masked;
      } else if (vaultState[selectedVendor]?.encryptedKey) {
        // Reuse existing ciphertext
        encryptedPayload = vaultState[selectedVendor]!.encryptedKey;
        maskedKey = vaultState[selectedVendor]!.maskedKey;
      }

      const updatedVendorConfig: VendorConfig = {
        encryptedKey: encryptedPayload,
        maskedKey: maskedKey || maskApiKey(apiKeyInput),
        validated: isKeyValid,
        tier1Model,
        tier2Model,
        availableModels: models,
        updatedAt: new Date().toISOString(),
      };

      const updatedVault: MultiVendorVault = {
        activeVendor: selectedVendor,
        vendors: {
          ...vaultState,
          [selectedVendor]: updatedVendorConfig,
        },
      };

      await updateProfileData({
        llmVault: updatedVault,
        byokProvider: selectedVendor,
        byokKey: apiKeyInput, // In memory active key for legacy callers
        byokModel: needsTierConfirm ? tier1Model : tier2Model,
        llmTierVersion: needsTierConfirm ? profile?.llmTierVersion : 2,
        llmConfig: {
          tier1: { vendor: selectedVendor, model: tier1Model },
          tier2: { vendor: selectedVendor, model: tier2Model },
        },
      });

      setVaultState(updatedVault.vendors);
      alert(`${selectedVendor} settings & encrypted key saved successfully!`);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Error saving LLM settings to profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#0b1021] text-slate-200 z-50 shadow-2xl flex flex-col transform transition-transform duration-300">
        <div className="flex justify-between items-center p-6 border-b border-slate-800 shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-primary-violet">⚙️</span> LLM Settings & Vault
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Vendor Selector */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active LLM Vendor</h3>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck size={12} /> AES-256 Encrypted
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 bg-slate-800/50 rounded-xl p-1.5">
              {SUPPORTED_VENDORS.map((v) => {
                const isConfigured = !!vaultState[v]?.validated;
                const isSelected = selectedVendor === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleVendorTabChange(v)}
                    className={`py-2 px-1 text-xs font-semibold rounded-lg transition relative ${
                      isSelected
                        ? 'bg-primary-violet text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {v}
                    {isConfigured && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-400 rounded-full" title="Key Configured" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400">
              Switching vendors instantly loads your saved keys and model choices without re-typing.
            </p>
          </div>

          {needsTierConfirm && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-2" data-testid="tier-confirm-notice">
              <p className="font-semibold">Tier meanings changed. Please confirm your Tier-1 and Tier-2 models.</p>
              <p>Tier 1 is now the <b>lighter</b> model and Tier 2 the <b>most powerful</b> one. Your saved Tier 1 is <code>{tier1Model}</code> and Tier 2 is <code>{tier2Model}</code>. Until you confirm, the app keeps treating them the way they worked before, so nothing changes.</p>
              <div className="flex gap-2">
                <button type="button" onClick={swapTiers} data-testid="tier-swap" className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-900 font-semibold">Swap them</button>
                <button type="button" onClick={() => setTierConfirmed(true)} data-testid="tier-keep" className="px-3 py-1.5 rounded-lg border border-amber-500/60 font-semibold">Keep as they are</button>
              </div>
            </div>
          )}

          {/* Tier 1 Model */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tier 1: Light / fast ({selectedVendor})
            </h3>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">MODEL</label>
              <select
                value={tier1Model}
                onChange={(e) => setTier1Model(e.target.value)}
                disabled={!isKeyValid}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white disabled:opacity-50 font-mono"
              >
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">Lighter, faster model for chat, summaries and memory upkeep</p>
            </div>
          </div>

          {/* Tier 2 Model */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tier 2: Advanced / most powerful ({selectedVendor})
            </h3>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">MODEL</label>
              <select
                value={tier2Model}
                onChange={(e) => setTier2Model(e.target.value)}
                disabled={!isKeyValid}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white disabled:opacity-50 font-mono"
              >
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">Most capable model for full reports, plan revisions and screenshot extraction</p>
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{selectedVendor} API KEY</h3>
              {isKeyValid && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle size={14} /> Key Validated
                </span>
              )}
            </div>
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex gap-2 relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    setIsKeyValid(false);
                  }}
                  placeholder={
                    selectedVendor === 'Anthropic'
                      ? 'sk-ant-api03-...'
                      : selectedVendor === 'OpenAI'
                      ? 'sk-...'
                      : 'Enter API Key'
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary-violet pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-24 top-3 text-slate-500 hover:text-slate-300"
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={isValidating || !apiKeyInput || apiKeyInput.includes('••••')}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-4 rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center shrink-0"
                >
                  {isValidating ? <Loader2 size={14} className="animate-spin" /> : 'Validate'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                Keys are encrypted client-side using AES-256-GCM before cloud sync.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-[#0b1021] flex gap-4 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !isKeyValid}
            className="flex-1 py-3 bg-primary-violet text-white rounded-xl text-sm font-medium hover:bg-violet-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Save & Apply'}
          </button>
        </div>
      </div>
    </>
  );
}
