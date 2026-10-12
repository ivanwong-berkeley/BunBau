'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Globe, Check, ShieldCheck, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import { UserTimezoneSettings, DEFAULT_TIMEZONE_SETTINGS } from '../../lib/models';
import {
  getDeviceTimezone,
  getTimezoneMetadata,
  MAJOR_FINANCIAL_TIMEZONES,
} from '../../lib/utils/timezone';

export interface HomeTimezoneSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: UserTimezoneSettings) => Promise<void>;
}

export function HomeTimezoneSetupModal({
  isOpen,
  onClose,
  onSave,
}: HomeTimezoneSetupModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedTz, setSelectedTz] = useState<string>('America/Los_Angeles');
  const [travelAutoDetect, setTravelAutoDetect] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deviceTz, setDeviceTz] = useState<string>('America/Los_Angeles');

  useEffect(() => {
    setMounted(true);
    const detected = getDeviceTimezone();
    setDeviceTz(detected);
    // Pre-fill detected device timezone by default
    setSelectedTz(detected);
  }, []);

  if (!isOpen || !mounted) return null;

  const currentMeta = getTimezoneMetadata(selectedTz);
  const detectedMeta = getTimezoneMetadata(deviceTz);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onSave({
        homeTimezone: selectedTz,
        travelAutoDetect,
        preferredMode: 'home',
      });
      onClose();
    } catch (e) {
      console.error('Failed to save home base timezone:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickDefault = async () => {
    setSaving(true);
    try {
      await onSave({
        homeTimezone: 'America/Los_Angeles',
        travelAutoDetect: true,
        preferredMode: 'home',
      });
      onClose();
    } catch (e) {
      console.error('Failed to save default home timezone:', e);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in"
      data-testid="home-timezone-setup-modal"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-6">
        {/* Header with Globe Icon */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary-violet/10 text-primary-violet rounded-2xl shrink-0">
            <Globe size={28} />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
              <Sparkles size={11} /> Portfolio Base Setup
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Set Your Home Base Portfolio Timezone
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              BunBau anchors your options expirations, US trading settlement windows, and CD maturity alerts to your primary financial base — keeping your calendar accurate even when you travel internationally.
            </p>
          </div>
        </div>

        {/* Detected Device Timezone Highlight */}
        <div className="p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-200/70 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <MapPin size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold">Detected from your device:</span>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                {detectedMeta.friendlyName}
              </div>
            </div>
          </div>
          {selectedTz !== deviceTz && (
            <button
              type="button"
              onClick={() => setSelectedTz(deviceTz)}
              className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 rounded-lg transition"
            >
              Use Detected
            </button>
          )}
        </div>

        {/* Timezone Selector Dropdown */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase text-gray-500 tracking-wider">
            Select Your Primary Home Base Timezone
          </label>
          <select
            value={selectedTz}
            onChange={(e) => setSelectedTz(e.target.value)}
            className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-violet outline-none"
            data-testid="home-timezone-select"
          >
            <option value={deviceTz}>
              📍 Device Default: {detectedMeta.city} ({detectedMeta.genericShortCode}, {detectedMeta.offsetString})
            </option>
            {MAJOR_FINANCIAL_TIMEZONES.map((group) => (
              <optgroup key={group.region} label={group.region}>
                {group.zones.map((zone) => (
                  <option key={zone.iana} value={zone.iana}>
                    {zone.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* Active Selection Summary Card */}
          <div className="p-3 bg-violet-50/60 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 rounded-xl text-xs flex items-center justify-between text-violet-900 dark:text-violet-200">
            <div>
              <span className="font-bold">Active Anchor: </span>
              <span>{currentMeta.friendlyName}</span>
            </div>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-900/60 font-semibold">
              {currentMeta.genericShortCode}
            </span>
          </div>
        </div>

        {/* Travel Auto-Detect Checkbox */}
        <label className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300 cursor-pointer p-3 rounded-xl border border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition">
          <input
            type="checkbox"
            checked={travelAutoDetect}
            onChange={(e) => setTravelAutoDetect(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-primary-violet rounded"
          />
          <div>
            <span className="font-semibold block">Travel Auto-Detection & Dual Switcher</span>
            <span className="text-gray-500 dark:text-gray-400 block mt-0.5">
              When traveling in Hong Kong, Singapore, or Europe, BunBau will display a 1-click switcher between your US Home Base and your local travel device clock.
            </span>
          </div>
        </label>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleQuickDefault}
            disabled={saving}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
          >
            Use San Francisco (PT)
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            data-testid="save-home-timezone-btn"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold bg-primary-violet hover:bg-violet-600 text-white rounded-xl shadow-lg transition disabled:opacity-50"
          >
            <Check size={14} />
            <span>{saving ? 'Saving...' : 'Confirm & Save Home Base'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
