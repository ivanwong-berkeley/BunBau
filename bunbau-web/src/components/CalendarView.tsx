'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppletContainer } from './AppletContainer';
import { CanonicalPosition, CalendarTimelineEvent, CanonicalAccount } from '../lib/portfolio/types';
import { optionsTimelineEvents, fixedIncomeTimelineEvents } from '../lib/portfolio/selectors';
import { useAuth } from '../contexts/AuthContext';
import { AlertSettings, DEFAULT_ALERT_SETTINGS } from '../lib/models';
import { Bell, Settings2, AlertTriangle, Clock, ShieldCheck, CheckCircle2, Lock, TrendingUp, RefreshCw, Layers, Calendar, Globe, Plane, MapPin } from 'lucide-react';
import { useTableSort } from '../lib/utils/tableSort';
import { SortableHeader } from './common/SortableHeader';
import { TableSortBar } from './common/SmartSortBar';
import { DelayedQuote } from '../lib/market/yahoo';
import { GoogleCalendarSyncModal } from './calendar/GoogleCalendarSyncModal';
import { HomeTimezoneSetupModal } from './calendar/HomeTimezoneSetupModal';
import { resolveAccountInfo } from '../lib/calendar/googleCalendar';
import { UserTimezoneSettings, DEFAULT_TIMEZONE_SETTINGS } from '../lib/models';
import { getDeviceTimezone, getTimezoneMetadata, MAJOR_FINANCIAL_TIMEZONES } from '../lib/utils/timezone';

interface CalendarViewProps {
  positions: CanonicalPosition[];
  accounts?: CanonicalAccount[];
}

export function CalendarView({ positions, accounts = [] }: CalendarViewProps) {
  const { profile, updateProfileData } = useAuth();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Google Calendar Sync Modal State
  const [showGoogleCalendarModal, setShowGoogleCalendarModal] = useState(false);
  const [googleCalendarMode, setGoogleCalendarMode] = useState<'fixed-income' | 'urgent-options'>('fixed-income');

  // Calendar tab toggle: Options vs Fixed Income
  const [activeTab, setActiveTab] = useState<'options' | 'fixed-income'>('options');

  // Quotes state for active options
  const [quotes, setQuotes] = useState<Record<string, DelayedQuote>>({});
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // Settings from profile, falling back to default
  const settings: AlertSettings = profile?.alertSettings || DEFAULT_ALERT_SETTINGS;

  const [urgentDaysInput, setUrgentDaysInput] = useState(settings.urgentDays);
  const [warningDaysInput, setWarningDaysInput] = useState(settings.warningDays);
  const [optionsUrgentDaysInput, setOptionsUrgentDaysInput] = useState(settings.optionsUrgentDays ?? 7);
  const [optionsWarningDaysInput, setOptionsWarningDaysInput] = useState(settings.optionsWarningDays ?? 14);
  const [optionsUrgentMoneynessInput, setOptionsUrgentMoneynessInput] = useState(settings.optionsUrgentMoneynessPct ?? 2.0);
  const [optionsWarningMoneynessInput, setOptionsWarningMoneynessInput] = useState(settings.optionsWarningMoneynessPct ?? 5.0);
  const [notifyCsp, setNotifyCsp] = useState(settings.notifyCsp);
  const [notifyCc, setNotifyCc] = useState(settings.notifyCc);
  const [notifyCdTreasury, setNotifyCdTreasury] = useState(settings.notifyCdTreasury);

  // Timezone & Travel Preferences
  const [showHomeTzModal, setShowHomeTzModal] = useState(false);
  const [hasPromptedTzModal, setHasPromptedTzModal] = useState(false);

  const homeTz = profile?.timezoneSettings?.homeTimezone || 'America/Los_Angeles';
  const travelDetect = profile?.timezoneSettings?.travelAutoDetect !== false;
  const deviceTz = getDeviceTimezone();
  const isTraveling = Boolean(travelDetect && deviceTz && deviceTz !== homeTz);

  const homeMeta = useMemo(() => getTimezoneMetadata(homeTz), [homeTz]);
  const deviceMeta = useMemo(() => (isTraveling && deviceTz ? getTimezoneMetadata(deviceTz) : null), [isTraveling, deviceTz]);

  const [homeTzInput, setHomeTzInput] = useState<string>(homeTz);
  const [travelAutoDetectInput, setTravelAutoDetectInput] = useState<boolean>(travelDetect);

  // Sync inputs whenever profile changes
  useEffect(() => {
    if (profile?.timezoneSettings?.homeTimezone) {
      setHomeTzInput(profile.timezoneSettings.homeTimezone);
    }
    if (profile?.timezoneSettings?.travelAutoDetect !== undefined) {
      setTravelAutoDetectInput(profile.timezoneSettings.travelAutoDetect);
    }
  }, [profile?.timezoneSettings]);

  // First-run automatic check: if profile loaded but homeTimezone unset, prompt setup modal once
  useEffect(() => {
    if (profile && !hasPromptedTzModal) {
      setHasPromptedTzModal(true);
      if (!profile.timezoneSettings?.homeTimezone) {
        setShowHomeTzModal(true);
      }
    }
  }, [profile, hasPromptedTzModal]);

  // Unique underlying symbols
  const underlyingSymbols = useMemo(() => {
    const syms = new Set<string>();
    for (const p of positions) {
      if (p.assetClass === 'CSP' || p.assetClass === 'CoveredCall') {
        const u = p.option?.underlying || p.symbol.split(' ')[0];
        if (u) syms.add(u.trim().toUpperCase());
      }
    }
    return Array.from(syms);
  }, [positions]);

  // Fetch delayed quotes from /api/quotes
  const fetchQuotes = async () => {
    if (underlyingSymbols.length === 0) return;
    setLoadingQuotes(true);
    try {
      const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(underlyingSymbols.join(','))}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.quotes) {
          setQuotes(data.quotes);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch delayed quotes for options calendar:', err);
    } finally {
      setLoadingQuotes(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [underlyingSymbols.join(',')]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const updated: AlertSettings = {
        urgentDays: Math.max(1, Number(urgentDaysInput) || 7),
        warningDays: Math.max(Number(urgentDaysInput) + 1, Number(warningDaysInput) || 21),
        optionsUrgentDays: Math.max(1, Number(optionsUrgentDaysInput) || 7),
        optionsWarningDays: Math.max(Number(optionsUrgentDaysInput) + 1, Number(optionsWarningDaysInput) || 14),
        optionsUrgentMoneynessPct: Math.max(0.1, Number(optionsUrgentMoneynessInput) || 2.0),
        optionsWarningMoneynessPct: Math.max(Number(optionsUrgentMoneynessInput) + 0.1, Number(optionsWarningMoneynessInput) || 5.0),
        notifyCsp,
        notifyCc,
        notifyCdTreasury,
      };
      const updatedTz: UserTimezoneSettings = {
        homeTimezone: homeTzInput || 'America/Los_Angeles',
        travelAutoDetect: travelAutoDetectInput,
        preferredMode: profile?.timezoneSettings?.preferredMode || 'home',
      };
      await updateProfileData({ 
        alertSettings: updated,
        timezoneSettings: updatedTz,
      });
      setShowSettingsModal(false);
    } catch (e) {
      console.error('Failed to save alert settings', e);
    } finally {
      setSavingSettings(false);
    }
  };

  // 1. Options Timeline Events (urgency governed by Moneyness vs Strike)
  const optionsEvents = useMemo(() => {
    return optionsTimelineEvents(positions, new Date(), settings, quotes);
  }, [positions, settings, quotes]);

  // 2. Fixed Income Timeline Events (urgency governed by Maturity DTE)
  const fixedIncomeEvents = useMemo(() => {
    return fixedIncomeTimelineEvents(positions, new Date(), settings);
  }, [positions, settings]);

  const optionsUrgentCount = optionsEvents.filter(e => e.urgency === 'urgent').length;
  const fixedIncomeUrgentCount = fixedIncomeEvents.filter(e => e.urgency === 'urgent').length;

  const currentEvents = activeTab === 'options' ? optionsEvents : fixedIncomeEvents;
  const currentUrgentCount = activeTab === 'options' ? optionsUrgentCount : fixedIncomeUrgentCount;

  // Urgency badge helper
  const getUrgencyBadge = (evt: CalendarTimelineEvent) => {
    if (evt.daysRemaining < 0) {
      return {
        container: 'bg-gray-100 text-gray-500 border-gray-300 dark:bg-slate-800 dark:text-gray-400 dark:border-slate-700',
        dot: 'bg-gray-400',
        text: `Expired (${Math.abs(evt.daysRemaining)}d ago)`,
        subtext: `Past expiry`,
        icon: <Clock size={14} />
      };
    }

    if (activeTab === 'options' && evt.optionBadgeLabel) {
      // Moneyness-based urgency
      if (evt.urgency === 'urgent') {
        return {
          container: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50',
          dot: 'bg-rose-500 animate-pulse',
          text: evt.optionBadgeLabel,
          subtext: `Expires in ${evt.daysRemaining}d`,
          icon: <AlertTriangle size={14} className="text-rose-600 dark:text-rose-400" />
        };
      }
      if (evt.urgency === 'soon') {
        return {
          container: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
          dot: 'bg-amber-500',
          text: evt.optionBadgeLabel,
          subtext: `Expires in ${evt.daysRemaining}d`,
          icon: <Clock size={14} className="text-amber-600 dark:text-amber-400" />
        };
      }
      return {
        container: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
        dot: 'bg-emerald-500',
        text: evt.optionBadgeLabel,
        subtext: `Expires in ${evt.daysRemaining}d`,
        icon: <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
      };
    }

    // Fixed income DTE-based urgency
    switch (evt.urgency) {
      case 'urgent':
        return {
          container: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50',
          dot: 'bg-rose-500 animate-pulse',
          text: evt.daysRemaining === 0 ? 'Matures Today' : `${evt.daysRemaining}d left (Urgent)`,
          subtext: `Maturity within ${settings.urgentDays}d`,
          icon: <AlertTriangle size={14} className="text-rose-600 dark:text-rose-400" />
        };
      case 'soon':
        return {
          container: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
          dot: 'bg-amber-500',
          text: `${evt.daysRemaining}d left (Approaching)`,
          subtext: `Maturity within ${settings.warningDays}d`,
          icon: <Clock size={14} className="text-amber-600 dark:text-amber-400" />
        };
      case 'safe':
      default:
        return {
          container: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
          dot: 'bg-emerald-500',
          text: `${evt.daysRemaining}d left (Safe)`,
          subtext: `Ample maturity runway`,
          icon: <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
        };
    }
  };

  const getCategoryBadge = (type: CalendarTimelineEvent['eventType']) => {
    switch (type) {
      case 'CSP':
        return <span className="text-xs px-2 py-0.5 rounded font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">Cash-Secured Put</span>;
      case 'CoveredCall':
        return <span className="text-xs px-2 py-0.5 rounded font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Covered Call</span>;
      case 'CD':
        return <span className="text-xs px-2 py-0.5 rounded font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Brokered CD</span>;
      case 'Treasury':
        return <span className="text-xs px-2 py-0.5 rounded font-semibold bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">Treasury Bill</span>;
    }
  };

  // Table sorting
  type TimelineSortKey = 'date' | 'eventType' | 'symbol' | 'institution' | 'strikeOrApy' | 'marketPrice' | 'moneyness' | 'collateralOrValue' | 'urgency';
  const {
    sortedItems: sortedCurrentEvents,
    sortState: timelineSortState,
    toggleSort: toggleTimelineSort,
    reset: resetTimelineSort,
    isDefault: isTimelineSortDefault,
    defaultState: timelineDefaultState,
  } = useTableSort<CalendarTimelineEvent, TimelineSortKey>(
    currentEvents,
    {
      date: (evt) => evt.date,
      eventType: (evt) => evt.eventType,
      symbol: (evt) => evt.symbol,
      institution: (evt) => evt.institution,
      strikeOrApy: (evt) => (evt.strike ?? evt.apy ?? 0),
      marketPrice: (evt) => evt.marketPrice ?? 0,
      moneyness: (evt) => evt.moneynessPct ?? 0,
      collateralOrValue: (evt) => (evt.collateralLocked ?? Math.abs(evt.marketValue)),
      urgency: (evt) => (activeTab === 'options' ? (evt.moneynessPct ?? evt.daysRemaining) : evt.daysRemaining),
    },
    null,
    null,
    {
      strikeOrApy: 'desc',
      marketPrice: 'desc',
      moneyness: 'asc',
      collateralOrValue: 'desc',
      urgency: 'asc',
      date: 'asc',
    }
  );

  // Table representation for Options Calendar
  const optionsTable = (
    <div className="p-4 max-h-[340px] overflow-y-auto overflow-x-auto scrollbar-thin">
      <TableSortBar
        tableId="options-calendar"
        title="Options Calendar"
        infoDescription="Active option contracts by expiration with moneyness (Gap / Cushion) and collateral locked."
        sortState={timelineSortState}
        defaultState={timelineDefaultState}
        isDefault={isTimelineSortDefault}
        reset={resetTimelineSort}
        columns={[['date', 'Expiry Date'], ['eventType', 'Type'], ['symbol', 'Option / Underlier'], ['strikeOrApy', 'Strike Price'], ['marketPrice', 'Market Quote'], ['moneyness', 'Gap / Cushion %'], ['urgency', 'Moneyness (GYR)'], ['collateralOrValue', 'Collateral Locked']]}
        className="mb-2"
      />
      <table className="w-full text-sm text-slate-900 dark:text-slate-200" data-testid="options-calendar-table">
        <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 shadow-sm border-b border-gray-200 dark:border-slate-700">
          <tr className="text-xs text-gray-500 uppercase">
            <SortableHeader
              label="Expiry Date"
              columnKey="date"
              currentKey={timelineSortState.key}
              currentDirection={timelineSortState.direction}
              onSort={(k) => toggleTimelineSort(k as TimelineSortKey)}
              align="left"
            />
            <SortableHeader
              label="Type"
              columnKey="eventType"
              currentKey={timelineSortState.key}
              currentDirection={timelineSortState.direction}
              onSort={(k) => toggleTimelineSort(k as TimelineSortKey)}
              align="left"
            />
            <SortableHeader
              label="Option / Underlier"
              columnKey="symbol"
              currentKey={timelineSortState.key}
              currentDirection={timelineSortState.direction}
              onSort={(k) => toggleTimelineSort(k as TimelineSortKey)}
              align="left"
            />
            <SortableHeader
              label="Strike Price"
              columnKey="strikeOrApy"
              currentKey={timelineSortState.key}
              currentDirection={timelineSortState.direction}
              onSort={(k) => toggleTimelineSort(k as TimelineSortKey)}
              align="right"
            />
            <SortableHeader
              label="Market Quote"
              columnKey="marketPrice"
              currentKey={timelineSortState.key}
              currentDirection={timelineSortState.direction}
              onSort={(k) => toggleTimelineSort(k as TimelineSortKey)}
              align="right"
            />
            <SortableHeader
              label="Gap / Cushion %"
              columnKey="moneyness"
              currentKey={timelineSortState.key}
              currentDirection={timelineSortState.direction}
              onSort={(k) => toggleTimelineSort(k as TimelineSortKey)}
              align="right"
            />
            <SortableHeader
              label="Moneyness (GYR)"
              columnKey="urgency"
              currentKey={timelineSortState.key}
              currentDirection={timelineSortState.direction}
              onSort={(k) => toggleTimelineSort(k as TimelineSortKey)}
              align="center"
            />
            <SortableHeader
              label="Collateral Locked"
              columnKey="collateralOrValue"
              currentKey={timelineSortState.key}
              currentDirection={timelineSortState.direction}
              onSort={(k) => toggleTimelineSort(k as TimelineSortKey)}
              align="right"
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {sortedCurrentEvents.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-8 text-center text-gray-500">
                No active Options contracts (CSPs or Covered Calls) found in imported holdings.
              </td>
            </tr>
          ) : (
            sortedCurrentEvents.map((evt) => {
              const badge = getUrgencyBadge(evt);
              const accInfo = resolveAccountInfo(evt, accounts);
              return (
                <tr key={evt.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-2 font-mono font-medium text-xs">
                    {evt.date}
                    <div className="text-[11px] text-gray-400 font-normal">{evt.daysRemaining}d left</div>
                  </td>
                  <td className="py-3 px-2">{getCategoryBadge(evt.eventType)}</td>
                  <td className="py-3 px-2 font-semibold">
                    <div>{evt.symbol}</div>
                    <div className="text-xs text-gray-400 font-normal">
                      {evt.name} ({evt.institution}{accInfo ? ` • ${accInfo}` : ''})
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-bold">
                    {evt.strike ? `$${evt.strike.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 px-2 text-right font-mono">
                    {evt.marketPrice ? `$${evt.marketPrice.toFixed(2)}` : (
                      <span className="text-xs text-gray-400">Quote Pending</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-bold">
                    {evt.moneynessPct !== undefined ? (
                      <span className={
                        evt.urgency === 'urgent' ? 'text-rose-600 dark:text-rose-400' :
                        evt.urgency === 'soon' ? 'text-amber-600 dark:text-amber-400' :
                        'text-emerald-600 dark:text-emerald-400'
                      }>
                        {evt.isItm ? `ITM (${evt.moneynessPct}%)` : `+${evt.moneynessPct}%`}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.container}`}>
                      <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                      {badge.text}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-xs">
                    {evt.collateralLocked
                      ? `$${evt.collateralLocked.toLocaleString()}`
                      : `$${Math.abs(evt.marketValue).toLocaleString()}`}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  // Table representation for Fixed Income Calendar
  const fixedIncomeTable = (
    <div className="p-4 max-h-[340px] overflow-y-auto overflow-x-auto scrollbar-thin">
      <TableSortBar
        tableId="fixed-income-calendar"
        title="Fixed Income Calendar"
        infoDescription="Brokered CDs and Treasury holdings by maturity date with yield and principal."
        sortState={timelineSortState}
        defaultState={timelineDefaultState}
        isDefault={isTimelineSortDefault}
        reset={resetTimelineSort}
        columns={[['date', 'Maturity Date'], ['eventType', 'Category'], ['symbol', 'Instrument / CUSIP'], ['institution', 'Institution'], ['strikeOrApy', 'Yield / APY'], ['collateralOrValue', 'Principal Value'], ['urgency', 'Maturity Urgency']]}
        className="mb-2"
      />
      <table className="w-full text-sm text-slate-900 dark:text-slate-200" data-testid="fixed-income-calendar-table">
        <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 shadow-sm border-b border-gray-200 dark:border-slate-700">
          <tr className="text-xs text-gray-500 uppercase">
            <SortableHeader
              label="Maturity Date"
              columnKey="date"
              currentKey={timelineSortState.key}
              currentDirection={timelineSortState.direction}
              onSort={(k) => toggleTimelineSort(k as TimelineSortKey)}
              align="left"
            />
            <SortableHeader
              label="Category"
              columnKey="eventType"
              currentKey={timelineSortState.key}
              currentDirection={timelineSortState.direction}
              onSort={(k) => toggleTimelineSort(k as TimelineSortKey)}
              align="left"
            />
            <SortableHeader
              label="Instrument / CUSIP"
              columnKey="symbol"
              currentKey={timelineSortState.key}
              currentDirection={timelineSortState.direction}
              onSort={(k) => toggleTimelineSort(k as TimelineSortKey)}
              align="left"
            />
            <SortableHeader
              label="Institution / Account"
              columnKey="institution"
              currentKey={timelineSortState.key}
              currentDirection={timelineSortState.direction}
              onSort={(k) => toggleTimelineSort(k as TimelineSortKey)}
              align="left"
            />
            <SortableHeader
              label="Yield / APY"
              columnKey="strikeOrApy"
              currentKey={timelineSortState.key}
              currentDirection={timelineSortState.direction}
              onSort={(k) => toggleTimelineSort(k as TimelineSortKey)}
              align="right"
            />
            <SortableHeader
              label="Principal Value"
              columnKey="collateralOrValue"
              currentKey={timelineSortState.key}
              currentDirection={timelineSortState.direction}
              onSort={(k) => toggleTimelineSort(k as TimelineSortKey)}
              align="right"
            />
            <SortableHeader
              label="Maturity Urgency"
              columnKey="urgency"
              currentKey={timelineSortState.key}
              currentDirection={timelineSortState.direction}
              onSort={(k) => toggleTimelineSort(k as TimelineSortKey)}
              align="center"
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {sortedCurrentEvents.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-gray-500">
                No Fixed Income maturities (CDs or Treasuries) found in imported holdings.
              </td>
            </tr>
          ) : (
            sortedCurrentEvents.map((evt) => {
              const badge = getUrgencyBadge(evt);
              const accInfo = resolveAccountInfo(evt, accounts);
              return (
                <tr key={evt.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-2 font-mono font-medium text-xs">{evt.date}</td>
                  <td className="py-3 px-2">{getCategoryBadge(evt.eventType)}</td>
                  <td className="py-3 px-2 font-semibold">
                    <div>{evt.symbol}</div>
                    <div className="text-xs text-gray-400 font-normal">{evt.name}</div>
                  </td>
                  <td className="py-3 px-2 text-xs">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{evt.institution}</div>
                    {accInfo && (
                      <div className="text-[11px] text-gray-400 font-normal">{accInfo}</div>
                    )}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {evt.apy ? `${evt.apy}% APY` : '—'}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-xs">
                    ${Math.abs(evt.marketValue).toLocaleString()}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.container}`}>
                      <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                      {badge.text}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Top Segmented Pill Toggle for the Two Calendars */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1.5 bg-gray-100 dark:bg-slate-800 rounded-2xl w-fit" data-testid="calendar-tab-toggle">
          <button
            type="button"
            data-testid="tab-options-calendar"
            onClick={() => setActiveTab('options')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'options'
                ? 'bg-white dark:bg-slate-700 text-primary-violet shadow-sm'
                : 'text-gray-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>⚡ Options Expirations (CSPs & Covered Calls)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold">
              {optionsEvents.length}
            </span>
          </button>
          <button
            type="button"
            data-testid="tab-fixed-income-calendar"
            onClick={() => setActiveTab('fixed-income')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'fixed-income'
                ? 'bg-white dark:bg-slate-700 text-primary-violet shadow-sm'
                : 'text-gray-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>🏦 Fixed Income Maturities (CDs & Treasuries)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
              {fixedIncomeEvents.length}
            </span>
          </button>
        </div>

        {activeTab === 'options' && (
          <button
            onClick={fetchQuotes}
            disabled={loadingQuotes}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg transition"
            title="Refresh Delayed Quotes"
          >
            <RefreshCw size={13} className={loadingQuotes ? 'animate-spin' : ''} />
            <span>Delayed Quotes (Yahoo)</span>
          </button>
        )}
      </div>

      {/* Dynamic Urgent Alert Banner */}
      {currentUrgentCount > 0 && (
        <div 
          data-testid="urgent-alert-banner"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 rounded-2xl text-rose-900 dark:text-rose-200 shadow-sm animate-in fade-in"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/60 rounded-xl text-rose-600 dark:text-rose-300 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="font-bold text-sm">
                {activeTab === 'options'
                  ? `Action Required: ${optionsUrgentCount} option contract${optionsUrgentCount > 1 ? 's' : ''} at risk (In-The-Money, ≤ ${settings.optionsUrgentMoneynessPct ?? 2}% strike buffer, or DTE ≤ ${settings.optionsUrgentDays ?? 7}d)`
                  : `Action Required: ${fixedIncomeUrgentCount} asset${fixedIncomeUrgentCount > 1 ? 's' : ''} maturing within ${settings.urgentDays} days`}
              </p>
              <p className="text-xs text-rose-700/80 dark:text-rose-300/80">
                {activeTab === 'options'
                  ? 'Review assignment risk, buy-back or rollover strategies to defend collateral.'
                  : 'Review reinvestment options or transfer plans before certificate maturity.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {activeTab === 'options' && (
              <button
                type="button"
                data-testid="banner-sync-urgent-btn"
                onClick={() => {
                  setGoogleCalendarMode('urgent-options');
                  setShowGoogleCalendarModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition shadow-sm"
              >
                <Calendar size={13} /> ⚡ Sync Urgent to Calendar
              </button>
            )}
            {activeTab === 'fixed-income' && (
              <button
                type="button"
                data-testid="banner-sync-cd-btn"
                onClick={() => {
                  setGoogleCalendarMode('fixed-income');
                  setShowGoogleCalendarModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-sm"
              >
                <Calendar size={13} /> 🏦 Sync CD to Calendar
              </button>
            )}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-100 hover:bg-rose-200 dark:bg-rose-900 dark:hover:bg-rose-800 text-rose-900 dark:text-rose-100 rounded-lg transition"
            >
              <Settings2 size={14} /> Alert Rules
            </button>
          </div>
        </div>
      )}

      {/* Main Applet Container */}
      <AppletContainer
        title={activeTab === 'options' ? 'Options Expirations Calendar (CSPs & Covered Calls)' : 'Fixed Income Maturities Calendar (CDs & Treasuries)'}
        infoDescription={activeTab === 'options'
          ? 'Live tracking of Cash-Secured Put and Covered Call contracts. Urgency (Green/Yellow/Red) is based on Underlier Market Price vs Strike Price proximity (Yahoo Finance delayed quotes) to protect cash reserves and equity.'
          : 'Chronological timeline of Brokered CDs and Treasury Bill maturities with DTE urgency alerts to manage reinvestment.'}
        tableComponent={activeTab === 'options' ? optionsTable : fixedIncomeTable}
      >
        <div className="p-4 space-y-4">
          {/* Header controls inside Applet */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{currentEvents.length}</span> upcoming timeline events
            </div>
            <div className="flex items-center gap-2">
              {/* Conditional Google Calendar Sync Button */}
              {activeTab === 'fixed-income' && (
                <button
                  type="button"
                  data-testid="sync-cd-calendar-btn"
                  onClick={() => {
                    setGoogleCalendarMode('fixed-income');
                    setShowGoogleCalendarModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-lg transition shadow-sm"
                >
                  <Calendar size={14} /> 🏦 CD Maturity Calendar Sync {fixedIncomeEvents.length > 0 && `(${fixedIncomeEvents.length})`}
                </button>
              )}
              {activeTab === 'options' && (
                <button
                  type="button"
                  data-testid="sync-options-calendar-btn"
                  onClick={() => {
                    setGoogleCalendarMode('urgent-options');
                    setShowGoogleCalendarModal(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition shadow-sm border ${
                    optionsUrgentCount > 0
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50 border-rose-200 dark:border-rose-800'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200 border-gray-200 dark:border-slate-600'
                  }`}
                >
                  <Calendar size={14} /> ⚡ Urgent Options Calendar Sync {optionsUrgentCount > 0 && `(${optionsUrgentCount})`}
                </button>
              )}
              {/* Dynamic Timezone Badge */}
              <button
                type="button"
                onClick={() => {
                  setHomeTzInput(profile?.timezoneSettings?.homeTimezone || 'America/Los_Angeles');
                  setTravelAutoDetectInput(profile?.timezoneSettings?.travelAutoDetect !== false);
                  setShowSettingsModal(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition border ${
                  isTraveling
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-gray-100 hover:bg-gray-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 border-gray-200 dark:border-slate-600'
                }`}
                title={`Home Timezone: ${homeMeta.label}${isTraveling && deviceMeta ? ` • Currently traveling in ${deviceMeta.label}` : ''}`}
                data-testid="timezone-header-badge"
              >
                {isTraveling && deviceMeta ? (
                  <>
                    <Plane size={13} className="text-amber-500 animate-pulse" />
                    <span>Travel: {deviceMeta.shortCode} • Home: {homeMeta.shortCode}</span>
                  </>
                ) : (
                  <>
                    <Globe size={13} className="text-gray-400" />
                    <span>Timezone: {homeMeta.shortCode}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setUrgentDaysInput(settings.urgentDays);
                  setWarningDaysInput(settings.warningDays);
                  setOptionsUrgentDaysInput(settings.optionsUrgentDays ?? 7);
                  setOptionsWarningDaysInput(settings.optionsWarningDays ?? 14);
                  setOptionsUrgentMoneynessInput(settings.optionsUrgentMoneynessPct ?? 2.0);
                  setOptionsWarningMoneynessInput(settings.optionsWarningMoneynessPct ?? 5.0);
                  setNotifyCsp(settings.notifyCsp);
                  setNotifyCc(settings.notifyCc);
                  setNotifyCdTreasury(settings.notifyCdTreasury);
                  setHomeTzInput(profile?.timezoneSettings?.homeTimezone || 'America/Los_Angeles');
                  setTravelAutoDetectInput(profile?.timezoneSettings?.travelAutoDetect !== false);
                  setShowSettingsModal(true);
                }}
                data-testid="open-alert-settings-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition"
              >
                <Bell size={14} /> In-App Alert Settings
              </button>
            </div>
          </div>

          {currentEvents.length === 0 ? (
            activeTab === 'fixed-income' ? (
              <div
                className="p-12 text-center text-gray-500 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl"
                data-testid="no-fixed-income"
              >
                <Clock className="mx-auto mb-2 text-gray-400" size={32} />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No Fixed Income assets found</p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  When Brokered CDs or US Treasuries with maturity dates are imported, their maturity schedules and yield cashflows will appear here.
                </p>
              </div>
            ) : (
              <div
                className="p-12 text-center text-gray-500 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl"
                data-testid="no-maturities"
              >
                <Clock className="mx-auto mb-2 text-gray-400" size={32} />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No active options contracts found</p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  When Cash-Secured Puts or Covered Calls are imported, their strikes, market quotes, and moneyness alerts will appear here.
                </p>
              </div>
            )
          ) : (
            <div className="space-y-3 max-h-[340px] overflow-y-auto scrollbar-thin pr-1" data-testid="timeline-list">
              {currentEvents.map((evt) => {
                const badge = getUrgencyBadge(evt);
                return (
                  <div
                    key={evt.id}
                    className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border transition-all ${badge.container}`}
                  >
                    <div className="flex items-start md:items-center gap-3.5 mb-2 md:mb-0">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 md:mt-0 shrink-0 ${badge.dot}`} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 dark:text-white text-base">
                            {evt.symbol}
                          </h4>
                          {getCategoryBadge(evt.eventType)}
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {evt.institution}{resolveAccountInfo(evt, accounts) ? ` • ${resolveAccountInfo(evt, accounts)}` : ''}
                          </span>
                        </div>
                        <p className="text-xs opacity-90 mt-0.5">
                          {evt.name}
                        </p>
                        {evt.collateralLocked && (
                          <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mt-0.5 flex items-center gap-1">
                            <Lock size={12} /> Cash collateral locked: ${evt.collateralLocked.toLocaleString()} ({evt.contracts || 1} contract{(evt.contracts || 1) > 1 ? 's' : ''} @ ${evt.strike})
                          </p>
                        )}
                        {evt.eventType === 'CoveredCall' && (
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mt-0.5 flex items-center gap-1">
                            <Lock size={12} /> Equity collateral: {(evt.contracts || 1) * 100} shares of {evt.underlying} locked
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between md:justify-end gap-4 md:gap-8 pt-3 md:pt-0 border-t md:border-t-0 border-gray-200/50 dark:border-slate-700/50">
                      {activeTab === 'options' ? (
                        <div className="flex flex-wrap items-center gap-4 md:gap-6 text-left md:text-right">
                          <div>
                            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                              Strike Price
                            </div>
                            <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                              ${evt.strike?.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                              Market Quote
                            </div>
                            <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                              {evt.marketPrice ? `$${evt.marketPrice.toFixed(2)}` : (
                                <span className="text-xs text-gray-400 font-normal">Pending</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                              {evt.eventType === 'CoveredCall' ? 'Buffer Gap %' : 'Cushion Gap %'}
                            </div>
                            <div className={`font-mono font-bold text-sm ${
                              evt.urgency === 'urgent' ? 'text-rose-600 dark:text-rose-400' :
                              evt.urgency === 'soon' ? 'text-amber-600 dark:text-amber-400' :
                              'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {evt.moneynessPct !== undefined ? (
                                evt.isItm ? `ITM (${evt.moneynessPct}%)` : `+${evt.moneynessPct}%`
                              ) : '—'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-left md:text-right">
                          <div className="text-xs font-semibold text-gray-500 uppercase">
                            Yield / APY
                          </div>
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {evt.apy ? `${evt.apy}% APY` : '—'}
                          </div>
                        </div>
                      )}

                      <div className="text-left md:text-right shrink-0">
                        <div className="flex items-center md:justify-end gap-1.5 font-semibold text-xs mb-1">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${badge.container}`}>
                            {badge.icon}
                            <span>{badge.text}</span>
                          </span>
                        </div>
                        <div className="text-xs opacity-80 font-mono text-gray-500 dark:text-gray-400">
                          Expires: {new Date(evt.date).toLocaleDateString(undefined, {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })} ({evt.daysRemaining}d left)
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AppletContainer>

      {/* In-App Alert Settings Modal */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
          data-testid="alert-settings-modal"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-5 scrollbar-thin">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary-violet/10 text-primary-violet rounded-xl">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">In-App Alert Settings</h3>
                  <p className="text-xs text-gray-400">Configure expiration & maturity alert triggers</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Fixed Income Triggers */}
              <div className="space-y-3">
                <span className="block text-xs font-semibold uppercase text-gray-500 tracking-wider">
                  Fixed Income Maturities (CDs & Treasuries)
                </span>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Urgent Warning (Days to Maturity)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={urgentDaysInput}
                    onChange={(e) => setUrgentDaysInput(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-mono"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Highlighted in red for impending certificate maturities.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Approaching Warning (Days to Maturity)
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="90"
                    value={warningDaysInput}
                    onChange={(e) => setWarningDaysInput(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-mono"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Highlighted in amber for upcoming maturities.</p>
                </div>
              </div>

              {/* Options Risk Triggers */}
              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-3">
                <span className="block text-xs font-semibold uppercase text-gray-500 tracking-wider">
                  Options Risk Alerts (CSPs & Covered Calls)
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      Urgent DTE (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={optionsUrgentDaysInput}
                      onChange={(e) => setOptionsUrgentDaysInput(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs font-mono"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">Impending expiry alert</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      Warning DTE (Days)
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="60"
                      value={optionsWarningDaysInput}
                      onChange={(e) => setOptionsWarningDaysInput(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs font-mono"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">Approaching expiry</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      Urgent Buffer / Cushion %
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      max="15"
                      value={optionsUrgentMoneynessInput}
                      onChange={(e) => setOptionsUrgentMoneynessInput(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs font-mono"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">Red trigger (&le; % or ITM)</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      Warning Buffer / Cushion %
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="25"
                      value={optionsWarningMoneynessInput}
                      onChange={(e) => setOptionsWarningMoneynessInput(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs font-mono"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">Amber trigger (&le; %)</p>
                  </div>
                </div>
              </div>

              {/* Tracked Categories Checkboxes */}
              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2.5">
                <span className="block text-xs font-semibold uppercase text-gray-500 tracking-wider">Tracked Categories</span>
                
                <label className="flex items-center justify-between text-sm cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">
                  <span className="text-slate-800 dark:text-slate-200">Cash-Secured Puts (Moneyness GYR)</span>
                  <input
                    type="checkbox"
                    checked={notifyCsp}
                    onChange={(e) => setNotifyCsp(e.target.checked)}
                    className="w-4 h-4 accent-primary-violet rounded"
                  />
                </label>

                <label className="flex items-center justify-between text-sm cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">
                  <span className="text-slate-800 dark:text-slate-200">Covered Calls (Moneyness GYR)</span>
                  <input
                    type="checkbox"
                    checked={notifyCc}
                    onChange={(e) => setNotifyCc(e.target.checked)}
                    className="w-4 h-4 accent-primary-violet rounded"
                  />
                </label>

                <label className="flex items-center justify-between text-sm cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">
                  <span className="text-slate-800 dark:text-slate-200">Fixed Income (CDs & Treasuries)</span>
                  <input
                    type="checkbox"
                    checked={notifyCdTreasury}
                    onChange={(e) => setNotifyCdTreasury(e.target.checked)}
                    className="w-4 h-4 accent-primary-violet rounded"
                  />
                </label>
              </div>

              {/* Timezone & Travel Preferences */}
              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-semibold uppercase text-gray-500 tracking-wider">
                    Timezone & Travel Preferences
                  </span>
                  {isTraveling && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                      <Plane size={11} /> Traveling detected
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Home Base Timezone (Financial Anchor)
                  </label>
                  <select
                    value={homeTzInput}
                    onChange={(e) => setHomeTzInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
                  >
                    {MAJOR_FINANCIAL_TIMEZONES.map((group) => (
                      <optgroup key={group.region} label={group.region}>
                        {group.zones.map((tz) => (
                          <option key={tz.iana} value={tz.iana}>
                            {tz.label} ({tz.shortCode})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    All calendar alerts and Google Sync default to this anchor so market open/close times stay consistent.
                  </p>
                </div>

                <label className="flex items-center justify-between text-xs cursor-pointer p-2 rounded-lg bg-gray-50 dark:bg-slate-800/60 hover:bg-gray-100 dark:hover:bg-slate-800">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Auto-Detect Travel Abroad</span>
                    <p className="text-[10px] text-gray-400">
                      When traveling (e.g. Hong Kong, Singapore, Europe), dynamically offer local time switching in Calendar Sync.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={travelAutoDetectInput}
                    onChange={(e) => setTravelAutoDetectInput(e.target.checked)}
                    className="w-4 h-4 accent-primary-violet rounded"
                  />
                </label>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-blue-800 dark:text-blue-300 text-xs">
                ℹ️ Options alerts automatically use Moneyness proximity (&le; {optionsUrgentMoneynessInput}% Red, &le; {optionsWarningMoneynessInput}% Yellow) and DTE urgency with live Yahoo Finance delayed quotes.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 z-10">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-5 py-2 text-sm font-semibold bg-primary-violet hover:bg-violet-600 text-white rounded-xl shadow-md transition disabled:opacity-50"
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Calendar Interactive Sync Modal */}
      <GoogleCalendarSyncModal
        isOpen={showGoogleCalendarModal}
        onClose={() => setShowGoogleCalendarModal(false)}
        mode={googleCalendarMode}
        events={googleCalendarMode === 'urgent-options' ? optionsEvents.filter(e => e.urgency === 'urgent') : fixedIncomeEvents}
        accounts={accounts}
        userId={profile?.uid || 'default'}
        userTimezoneSettings={profile?.timezoneSettings}
      />

      {/* First-Run Home Base Timezone Setup Modal */}
      <HomeTimezoneSetupModal
        isOpen={showHomeTzModal}
        onClose={() => setShowHomeTzModal(false)}
        onSave={async (tzSettings) => {
          await updateProfileData({ timezoneSettings: tzSettings });
        }}
      />
    </div>
  );
}

// Backward compatible export for existing callers
export const MaturityCalendar = CalendarView;
