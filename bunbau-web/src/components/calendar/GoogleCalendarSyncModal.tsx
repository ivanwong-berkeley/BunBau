'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  ExternalLink,
  Download,
  Copy,
  Check,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Info,
  ShieldCheck,
  Lock,
  Layers,
  Search,
  Globe,
  MapPin,
  Plane,
} from 'lucide-react';
import { CalendarTimelineEvent, CanonicalAccount } from '../../lib/portfolio/types';
import { UserTimezoneSettings } from '../../lib/models';
import { AccessibilityZoomBar } from '../common/AccessibilityZoomBar';
import {
  getImmediateOptionsActionSlot,
  getCdMaturitySlot,
  resolveAccountInfo,
  buildCdMaturityCalendarUrl,
  buildOptionsImmediateCalendarUrl,
  generateIcsCalendar,
  downloadIcsFile,
  getSyncedEventIds,
  markEventSynced,
} from '../../lib/calendar/googleCalendar';
import {
  getDeviceTimezone,
  getTimezoneMetadata,
  MAJOR_FINANCIAL_TIMEZONES,
} from '../../lib/utils/timezone';
import { ContainerInfoPopover } from '../common/ContainerInfoPopover';

export interface GoogleCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'fixed-income' | 'urgent-options';
  events: CalendarTimelineEvent[];
  accounts?: CanonicalAccount[];
  userId?: string;
  userTimezoneSettings?: UserTimezoneSettings;
}

export function GoogleCalendarSyncModal({
  isOpen,
  onClose,
  mode,
  events,
  accounts = [],
  userId = 'default',
  userTimezoneSettings,
}: GoogleCalendarSyncModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Timezone State Management
  const homeTz = userTimezoneSettings?.homeTimezone || 'America/Los_Angeles';
  const [deviceTz, setDeviceTz] = useState<string>('America/Los_Angeles');
  const [activeTz, setActiveTz] = useState<string>(homeTz);

  useEffect(() => {
    setMounted(true);
    const detected = getDeviceTimezone();
    setDeviceTz(detected);
    // If user's preferredMode is 'device' when traveling, honor that
    if (userTimezoneSettings?.preferredMode === 'device' && detected !== homeTz) {
      setActiveTz(detected);
    } else {
      setActiveTz(homeTz);
    }
  }, [homeTz, userTimezoneSettings?.preferredMode]);

  const isTraveling = deviceTz !== homeTz;
  const activeMeta = useMemo(() => getTimezoneMetadata(activeTz), [activeTz]);
  const homeMeta = useMemo(() => getTimezoneMetadata(homeTz), [homeTz]);
  const deviceMeta = useMemo(() => getTimezoneMetadata(deviceTz), [deviceTz]);

  // Level 1 Accessibility Menu State (Zoom & Fullscreen)
  const [zoomScale, setZoomScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  // Compute Immediate Option Slot in active timezone (recomputed when activeTz changes)
  const optionsSlot = useMemo(() => {
    return getImmediateOptionsActionSlot(new Date(), activeTz);
  }, [isOpen, activeTz]);

  // Initialize selected IDs (default: select all) and load synced IDs from localStorage
  useEffect(() => {
    if (isOpen) {
      const allIds = new Set(events.map((e) => e.id));
      setSelectedIds(allIds);
      setSyncedIds(getSyncedEventIds(userId));
    }
  }, [isOpen, events, userId]);

  // Fullscreen event listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard navigation & accessibility (ESC handling)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isInfoOpen) {
          setIsInfoOpen(false);
        } else if (document.fullscreenElement) {
          document.exitFullscreen?.();
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isInfoOpen, onClose]);

  if (!isOpen || !mounted) return null;

  // Zoom handlers
  const handleZoomIn = () => setZoomScale((s) => Math.min(1.4, Math.round((s + 0.1) * 10) / 10));
  const handleZoomOut = () => setZoomScale((s) => Math.max(0.7, Math.round((s - 0.1) * 10) / 10));
  const handleResetZoom = () => setZoomScale(1);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Toggle single item selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select / Deselect all
  const isAllSelected = events.length > 0 && selectedIds.size === events.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(events.map((e) => e.id)));
    }
  };

  // Filter events based on search query
  const filteredEvents = events.filter((evt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const acc = resolveAccountInfo(evt, accounts).toLowerCase();
    return (
      evt.symbol.toLowerCase().includes(q) ||
      evt.name.toLowerCase().includes(q) ||
      evt.institution.toLowerCase().includes(q) ||
      acc.includes(q)
    );
  });

  // Handle single item sync to Google Calendar in active timezone
  const handleSingleSync = (evt: CalendarTimelineEvent) => {
    const accInfo = resolveAccountInfo(evt, accounts);
    const url =
      mode === 'fixed-income'
        ? buildCdMaturityCalendarUrl(evt, accInfo, activeTz)
        : buildOptionsImmediateCalendarUrl(evt, optionsSlot, accInfo, activeTz);

    markEventSynced(evt.id, userId);
    setSyncedIds((prev) => new Set(prev).add(evt.id));

    // Fly-away to Google Calendar
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Handle bulk sync all selected
  const handleBulkSync = () => {
    const selectedEvents = events.filter((e) => selectedIds.has(e.id));
    if (selectedEvents.length === 0) {
      alert('Please select at least one calendar item to sync.');
      return;
    }

    // Mark all selected as synced
    for (const evt of selectedEvents) {
      markEventSynced(evt.id, userId);
    }
    setSyncedIds(getSyncedEventIds(userId));

    // Open first event directly in Google Calendar and download full .ics bundle for complete sync
    if (selectedEvents.length === 1) {
      handleSingleSync(selectedEvents[0]);
    } else {
      // Export full ICS bundle for 1-click Google Calendar bulk import
      const ics = generateIcsCalendar(selectedEvents, mode, accounts, optionsSlot, activeTz);
      const filename =
        mode === 'fixed-income'
          ? 'bunbau_cd_maturities.ics'
          : 'bunbau_urgent_options.ics';
      downloadIcsFile(filename, ics);

      // Also open Google Calendar import page in a fly-away tab
      window.open('https://calendar.google.com/calendar/r/settings/export', '_blank', 'noopener,noreferrer');
    }
  };

  // Download .ics bundle
  const handleDownloadIcs = () => {
    const selectedEvents = events.filter((e) => selectedIds.has(e.id));
    const toExport = selectedEvents.length > 0 ? selectedEvents : events;
    const ics = generateIcsCalendar(toExport, mode, accounts, optionsSlot, activeTz);
    const filename =
      mode === 'fixed-income'
        ? 'bunbau_cd_maturities.ics'
        : 'bunbau_urgent_options.ics';
    downloadIcsFile(filename, ics);
  };

  // Copy structured details
  const handleCopyAll = () => {
    const selectedEvents = events.filter((e) => selectedIds.has(e.id));
    const toCopy = selectedEvents.length > 0 ? selectedEvents : events;

    const text = toCopy
      .map((evt, idx) => {
        const accInfo = resolveAccountInfo(evt, accounts);
        if (mode === 'fixed-income') {
          return `[${idx + 1}] BunBau: ${evt.name || evt.symbol} Maturity - ${evt.institution} (${accInfo})\nDate: ${evt.date} @ 9:00 AM ${activeMeta.genericShortCode} (${activeMeta.friendlyName})\nPrincipal: $${Math.abs(evt.marketValue).toLocaleString()} | APY: ${evt.apy || 0}%\nReminders: 7 days prior + Day of maturity\n`;
        }
        return `[${idx + 1}] BunBau: IMMEDIATE ACTION - ${evt.symbol} ${evt.eventType} ($${evt.strike})\nAccount: ${evt.institution} (${accInfo})\nScheduled Review: ${optionsSlot.slotLabel} (${activeMeta.friendlyName})\nBuffer Cushion: ${evt.moneynessPct || 0}% | DTE: ${evt.daysRemaining}d\n`;
      })
      .join('\n---\n\n');

    navigator.clipboard?.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopySingle = (evt: CalendarTimelineEvent) => {
    const accInfo = resolveAccountInfo(evt, accounts);
    const text =
      mode === 'fixed-income'
        ? `BunBau: ${evt.name || evt.symbol} Maturity - ${evt.institution} (${accInfo})\nDate: ${evt.date} @ 9:00 AM ${activeMeta.genericShortCode} (${activeMeta.friendlyName})\nPrincipal: $${Math.abs(evt.marketValue).toLocaleString()} | APY: ${evt.apy || 0}%\nReminders: 7 days prior + Day of maturity`
        : `BunBau: IMMEDIATE ACTION - ${evt.symbol} ${evt.eventType} ($${evt.strike})\nAccount: ${evt.institution} (${accInfo})\nScheduled Review: ${optionsSlot.slotLabel} (${activeMeta.friendlyName})\nBuffer Cushion: ${evt.moneynessPct || 0}% | DTE: ${evt.daysRemaining}d`;

    navigator.clipboard?.writeText(text);
    setCopiedId(evt.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const modalNode = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in"
      data-testid="google-calendar-sync-modal"
    >
      <div
        ref={modalRef}
        style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
        className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col w-full transition-transform ${
          isFullscreen ? 'w-screen h-screen rounded-none' : 'max-w-4xl max-h-[92vh]'
        }`}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl flex items-center justify-center ${
                mode === 'fixed-income'
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              }`}
            >
              <Calendar size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                  {mode === 'fixed-income'
                    ? 'Sync CD & Treasury Maturities to Google Calendar'
                    : 'Sync Urgent Options to Google Calendar (Immediate Action)'}
                </h3>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    mode === 'fixed-income'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  }`}
                >
                  {mode === 'fixed-income' ? 'Fixed Income' : 'Risk Defense'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {mode === 'fixed-income'
                  ? `Scheduled at 9:00 AM ${activeMeta.genericShortCode} (Brokerage Settlement Window) with 7-Day Pre-Alerts`
                  : `Scheduled for Immediate Review: ${optionsSlot.slotLabel} (${optionsSlot.timeLabel})`}
              </p>
            </div>
          </div>

          {/* ACCESSIBILITY & HEADER CONTROLS */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Guide Info Button */}
            <button
              onClick={() => setIsInfoOpen(true)}
              title="Google Calendar Integration Guide"
              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 border border-blue-500/30 rounded-lg transition cursor-pointer"
            >
              <Info size={16} />
            </button>

            {/* Zoom Controls */}
            <AccessibilityZoomBar
              scale={zoomScale}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onReset={handleResetZoom}
              minScale={0.7}
              maxScale={1.4}
              testIdPrefix="calendar-sync"
            />

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg transition cursor-pointer"
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* TIME SLOT BANNER WITH DYNAMIC TIMEZONE ENGINE */}
        <div
          className={`px-5 py-3 border-b text-xs flex flex-wrap items-center justify-between gap-3 ${
            mode === 'fixed-income'
              ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40 text-blue-900 dark:text-blue-200'
              : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40 text-rose-900 dark:text-rose-200'
          }`}
          data-testid="sync-modal-time-slot-banner"
        >
          <div className="flex items-center gap-2">
            <Clock size={16} className="shrink-0" />
            <div>
              <span className="font-bold">
                {mode === 'fixed-income'
                  ? `Automatic Settlement Window: 9:00 AM – 9:30 AM ${activeMeta.genericShortCode}`
                  : `Next Immediate Action Window: ${optionsSlot.slotLabel} (${optionsSlot.timeLabel})`}
              </span>
              <p className="text-[11px] opacity-80 mt-0.5">
                {mode === 'fixed-income'
                  ? `7-Day Pre-Maturity Alert scheduled automatically in Google Calendar (${activeMeta.friendlyName}).`
                  : `Triggers immediately today for urgent options in ${activeMeta.friendlyName}.`}
              </p>
            </div>
          </div>

          {/* DYNAMIC TIMEZONE SWITCHER & TRAVEL CONTROLS */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Travel Dual-Mode Toggle */}
            {isTraveling && userTimezoneSettings?.travelAutoDetect !== false && (
              <div
                className="flex items-center p-0.5 bg-white/90 dark:bg-slate-800/90 rounded-xl border border-current/20 text-[11px]"
                data-testid="travel-timezone-switcher"
              >
                <button
                  type="button"
                  onClick={() => setActiveTz(homeTz)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                    activeTz === homeTz
                      ? 'bg-primary-violet text-white shadow-sm'
                      : 'text-gray-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title={`Switch to Home Base (${homeMeta.friendlyName})`}
                >
                  <span>🏠 Home ({homeMeta.genericShortCode})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTz(deviceTz)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                    activeTz === deviceTz
                      ? 'bg-primary-violet text-white shadow-sm'
                      : 'text-gray-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title={`Switch to Current Device Time (${deviceMeta.friendlyName})`}
                >
                  <Plane size={11} />
                  <span>Device ({deviceMeta.genericShortCode})</span>
                </button>
              </div>
            )}

            {/* Timezone Selector Dropdown */}
            <select
              value={activeTz}
              onChange={(e) => setActiveTz(e.target.value)}
              className="p-1 px-2.5 text-xs font-mono font-semibold rounded-lg bg-white/90 dark:bg-slate-800/90 border border-current/20 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              data-testid="sync-modal-timezone-select"
              title="Change active calendar timezone"
            >
              <option value={homeTz}>
                🏠 Home: {homeMeta.city} ({homeMeta.genericShortCode})
              </option>
              {isTraveling && (
                <option value={deviceTz}>
                  📍 Device: {deviceMeta.city} ({deviceMeta.genericShortCode})
                </option>
              )}
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
          </div>
        </div>

        {/* TOOLBAR CONTROLS */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer"
            >
              {isAllSelected ? 'Deselect All' : `Select All (${events.length})`}
            </button>
            <span className="text-xs text-gray-500">
              <span className="font-bold text-slate-900 dark:text-white">{selectedIds.size}</span> of {events.length} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search symbol, account..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* EVENTS LIST */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 scrollbar-thin">
          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center text-gray-500 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
              <Calendar size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="font-semibold">No calendar events match the current filter.</p>
            </div>
          ) : (
            filteredEvents.map((evt) => {
              const isSelected = selectedIds.has(evt.id);
              const isSynced = syncedIds.has(evt.id);
              const accInfo = resolveAccountInfo(evt, accounts);
              const cdSlot = mode === 'fixed-income' ? getCdMaturitySlot(evt.date, activeTz) : null;

              return (
                <div
                  key={evt.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSynced
                      ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                      : isSelected
                      ? 'border-blue-300 dark:border-blue-800/60 bg-blue-50/20 dark:bg-blue-950/10'
                      : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800/60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left Checkbox & Title Details */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(evt.id)}
                        className="mt-1 w-4 h-4 accent-primary-mint rounded cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white text-sm font-mono truncate">
                            {mode === 'fixed-income'
                              ? `BunBau: ${evt.name || evt.symbol} Maturity`
                              : `BunBau: IMMEDIATE ACTION - ${evt.symbol} ${evt.eventType}`}
                          </span>
                          {/* Synced Badge */}
                          {isSynced && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 size={11} /> Synced
                            </span>
                          )}
                        </div>

                        {/* Account & Institution Subtitle */}
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{evt.institution}</span>
                          {accInfo && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-primary-violet dark:text-violet-400 font-medium">
                                {accInfo}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Financial Metrics */}
                        <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase">
                              {mode === 'fixed-income' ? 'Maturity Date' : 'Expiration DTE'}
                            </span>
                            <span className="font-semibold">
                              {mode === 'fixed-income'
                                ? `${evt.date} (9 AM ${activeMeta.genericShortCode})`
                                : `${evt.date} (${evt.daysRemaining}d)`}
                            </span>
                          </div>

                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase">
                              {mode === 'fixed-income' ? 'Yield / APY' : 'Strike / Quote'}
                            </span>
                            <span className="font-semibold">
                              {mode === 'fixed-income'
                                ? evt.apy ? `${evt.apy}% APY` : '—'
                                : `$${evt.strike?.toFixed(2)} / $${evt.marketPrice?.toFixed(2) || '—'}`}
                            </span>
                          </div>

                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase">
                              {mode === 'fixed-income' ? 'Principal Value' : 'Cushion / Status'}
                            </span>
                            <span className="font-semibold">
                              {mode === 'fixed-income'
                                ? `$${Math.abs(evt.marketValue).toLocaleString()}`
                                : evt.moneynessPct !== undefined
                                ? evt.isItm ? `ITM (${evt.moneynessPct}%)` : `+${evt.moneynessPct}%`
                                : 'Pending'}
                            </span>
                          </div>

                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase">Reminder Alarm</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {mode === 'fixed-income' ? `7 Days Prior (${cdSlot?.reminderDateStr})` : '15m Prior'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Single Action Buttons */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-slate-800">
                      {isSynced ? (
                        <button
                          onClick={() => handleSingleSync(evt)}
                          title="Open event in Google Calendar"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow-sm cursor-pointer"
                        >
                          <ExternalLink size={13} /> Open in Google Calendar ↗
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSingleSync(evt)}
                          title="Sync this event to Google Calendar"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow-sm cursor-pointer"
                        >
                          <Calendar size={13} /> Sync to Google Calendar
                        </button>
                      )}

                      <button
                        onClick={() => handleCopySingle(evt)}
                        title="Copy event details"
                        className="p-1.5 text-gray-500 hover:text-slate-900 dark:hover:text-white rounded transition cursor-pointer"
                      >
                        {copiedId === evt.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 rounded-b-2xl flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              {copiedAll ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copiedAll ? 'Copied Details!' : 'Copy Details'}</span>
            </button>

            <button
              onClick={handleDownloadIcs}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <Download size={14} />
              <span>Download .ICS</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
            >
              Close
            </button>

            <button
              onClick={handleBulkSync}
              disabled={selectedIds.size === 0}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 ${
                mode === 'fixed-income'
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              <Calendar size={14} />
              <span>
                {mode === 'fixed-income'
                  ? `Sync ${selectedIds.size} Selected to Google Calendar`
                  : `Sync ${selectedIds.size} Urgent to Google Calendar`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Guide Info Popover */}
      <ContainerInfoPopover
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="Google Calendar Integration Guide"
        subtitle="Dynamic Multi-Timezone Scheduling & Travel Intelligence"
        description="BunBau bridges your active portfolio intelligence into Google Calendar without requiring re-authentication or secondary Gmail logins."
        definitions={[
          {
            term: 'Fixed Income 9:00 AM Settlement',
            definition:
              `Maturities are scheduled at 9:00 AM in your selected timezone (${activeMeta.friendlyName}) on the maturity date with an automatic 7-day prior alert, matching brokerage settlement hours.`,
          },
          {
            term: 'Urgent Options Immediate Review',
            definition:
              `Options with moneyness cushion ≤ 2% or impending expiration are scheduled for immediate action in the next available action window (9 AM, 12 PM, 5 PM today, or 7 AM tomorrow in ${activeMeta.genericShortCode}).`,
          },
          {
            term: 'Home Base vs Device Travel Mode',
            definition:
              'When traveling abroad (e.g. Hong Kong, Singapore, Europe), Google Calendar preserves the exact UTC time coordinates. Events anchored to Home Base will appear at their correct US hours when you return home.',
          },
          {
            term: 'Fly-Away Launcher Button',
            definition:
              'Once an event is synced, a modern fly-away button allows viewing the event in Google Calendar in a new tab without logging in again.',
          },
        ]}
        shortcuts={[
          { action: 'ESC', description: 'Close modal or exit full screen' },
          { action: 'Click Sync', description: 'Launch event pre-filled in Google Calendar' },
        ]}
      />
    </div>
  );

  return createPortal(modalNode, document.body);
}
