'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePortfolio } from '../contexts/PortfolioContext';
import { cashSummary, netWorth, blendedApyBreakdown, equitiesBySymbol, optionsList, cryptoBySymbol } from '../lib/portfolio/selectors';
import { AssetAllocationChart, AssetAllocationTable, PnLAttributionChart, CashManagerChart, EquitiesChart, OptionsChart, CryptoChart } from '../components/DashboardCharts';
import { EquitiesTable } from '../components/EquitiesTable';
import { CryptoTable } from '../components/CryptoTable';
import { ActiveOptionsTable } from '../components/ActiveOptionsTable';
import { MaturityCalendar } from '../components/CalendarView';
import { UploadValidationModal } from '../components/UploadValidationModal';
import { StrategyView } from '../components/StrategyView';
import { HistoryView } from '../components/HistoryView';
import { ReportsView } from '../components/reports/ReportsView';
import { AppletContainer } from '../components/AppletContainer';
import { StatCard } from '../components/StatCard';
import { AIChatbot } from '../components/AIChatbot';
import { LLMSettingsDrawer } from '../components/LLMSettingsDrawer';
import { ProfileModal } from '../components/ProfileModal';
import { AboutModal } from '../components/AboutModal';
import { DashboardDrillDownModal } from '../components/dashboard/DashboardDrillDownModal';
import {
  DrillDownConfig,
  buildNetWorthDrillDown,
  buildFreeCashDrillDown,
  buildApyDrillDown,
  buildPortfolioApyDrillDown,
  buildOptionCollateralDrillDown,
  buildEquityDrillDown,
  buildAssetAllocationDrillDown,
  buildCryptoDrillDown,
} from '../lib/portfolio/drilldownFormatters';
import { 
  LogIn, LogOut, UploadCloud, Sparkles, Camera, CheckCircle2,
  ChevronLeft, ChevronRight, LayoutDashboard, 
  Calendar, LineChart, History, FileSpreadsheet, Sun, Moon,
  User, Settings as SettingsIcon, Info as InfoIcon, Target, TriangleAlert, ArrowRight, Lock
} from 'lucide-react';
import { 
  getStoredTheme, 
  setStoredTheme, 
  resolveActiveTheme, 
  applyThemeToDom, 
  toggleThemeMode, 
  ActiveTheme 
} from '../lib/utils/themeManager';

export default function Home() {
  const { user, signInWithGoogle, logout, profile, isAuthenticating, updateProfileData } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [drillDownModal, setDrillDownModal] = useState<DrillDownConfig | null>(null);
  
  // Theme & Dropdown State
  const [theme, setTheme] = useState<ActiveTheme>(() => {
    if (typeof window !== 'undefined') {
      const stored = getStoredTheme();
      return resolveActiveTheme(stored);
    }
    return 'dark';
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Modals
  const [isLLMDrawerOpen, setIsLLMDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const activeVendor: import('../lib/models').LlmVendor = profile?.llmVault?.activeVendor || (profile?.llmConfig?.tier1?.vendor as import('../lib/models').LlmVendor) || 'Gemini';
  const activeVaultConfig = profile?.llmVault?.vendors?.[activeVendor];
  const hasKey = !!activeVaultConfig?.validated || !!profile?.byokKey;
  const { positions, isDemo, loading, institutions, snapshots, importExtraction, removeAccounts, captureSnapshot, accounts } = usePortfolio();
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState(false);
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);

  const handleCaptureSnapshot = async () => {
    if (isDemo) {
      alert("Snapshot cannot be captured in Demo Mode. Please upload a real brokerage statement first.");
      return;
    }
    setIsCapturingSnapshot(true);
    try {
      const snap = await captureSnapshot();
      setSnapshotToast(`Snapshot saved! Net Worth: $${snap.totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })} across ${snap.accountsCount} account(s).`);
      setTimeout(() => setSnapshotToast(null), 6000);
    } catch (err: any) {
      alert(err?.message || 'Failed to capture snapshot.');
    } finally {
      setIsCapturingSnapshot(false);
    }
  };

  // Sync theme with user profile when profile loads from Firestore or cache
  useEffect(() => {
    if (profile?.theme) {
      const active = resolveActiveTheme(profile.theme);
      setTheme(active);
      applyThemeToDom(active);
      setStoredTheme(profile.theme);
    }
  }, [profile?.theme]);

  // Keep DOM .dark class synchronized with active theme
  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  const toggleTheme = async () => {
    const nextTheme: ActiveTheme = toggleThemeMode(theme);
    setTheme(nextTheme);
    applyThemeToDom(nextTheme);
    setStoredTheme(nextTheme);
    if (user && updateProfileData) {
      try {
        await updateProfileData({ theme: nextTheme });
      } catch (err) {
        console.warn('Could not persist theme to remote profile:', err);
      }
    }
  };

  const handleExtractionComplete = () => {
    alert('Portfolio Updated Successfully!');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={20} /> },
    { id: 'strategy', label: 'Strategy', icon: <LineChart size={20} /> },
    { id: 'reports', label: 'Reports', icon: <FileSpreadsheet size={20} /> },
    { id: 'history', label: 'History', icon: <History size={20} /> }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0b1021] transition-colors">
      
      {/* Sidebar */}
      <div className={`${isSidebarExpanded ? 'w-64' : 'w-20'} bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col transition-all duration-300 relative z-20`}>
        <div className={`flex items-center gap-2 mb-8 py-6 px-4 ${!isSidebarExpanded && 'justify-center'}`}>
          <div className="w-8 h-8 shrink-0 rounded-full bg-primary-amber flex items-center justify-center text-white font-bold">B</div>
          {isSidebarExpanded && <h1 className="text-xl font-bold text-primary-mint truncate">BunBau (資本寶)</h1>}
        </div>
        
        <nav className="w-full px-3 space-y-2 flex-1">
          {navItems.map((item) => (
             <button 
                key={item.id} 
                onClick={() => setActiveTab(item.id)} 
                title={!isSidebarExpanded ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition ${activeTab === item.id ? 'bg-primary-mint/10 text-primary-mint' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
             >
               <span className="shrink-0">{item.icon}</span>
               {isSidebarExpanded && <span>{item.label}</span>}
             </button>
          ))}
        </nav>

        {/* Sidebar Toggle */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 flex justify-end">
          <button onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition">
            {isSidebarExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        
        {/* Topbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0">
           <div className="flex items-center gap-3">
             <h2 className="text-lg font-semibold text-slate-900 dark:text-white capitalize">{activeTab}</h2>
             {isDemo ? (
               <span data-testid="mode-badge-demo" className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                 <Sparkles size={12} /> Demo Mode
               </span>
             ) : (
               <span data-testid="mode-badge-live" className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                 <CheckCircle2 size={12} /> Live Mode ({institutions.length} {institutions.length === 1 ? 'Brokerage' : 'Brokerages'})
               </span>
             )}
           </div>
           
           <div className="flex items-center gap-3">
             <button 
               onClick={handleCaptureSnapshot} 
               disabled={isCapturingSnapshot}
               data-testid="capture-snapshot-btn"
               className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-full text-sm font-medium shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 transition disabled:opacity-50"
               title={isDemo ? "Upload a real portfolio to capture snapshots" : "Capture immutable point-in-time snapshot"}
             >
               <Camera size={16} className={isCapturingSnapshot ? "animate-spin text-primary-mint" : "text-primary-mint"} />
               <span className="hidden sm:inline">{isCapturingSnapshot ? 'Capturing…' : 'Capture Snapshot'}</span>
             </button>

             <button onClick={() => setIsUploaderOpen(true)} className="bg-primary-amber text-white px-4 py-2 rounded-full text-sm font-medium shadow-sm hover:bg-amber-600 flex items-center gap-2 transition">
               <UploadCloud size={16} /> Upload
             </button>
             
             

             {user ? (
               <div className="relative flex items-center gap-3">
                 <button onClick={toggleTheme} data-testid="theme-toggle-btn" className="p-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition dark:text-yellow-400" title="Toggle Theme">
                   {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} className="text-slate-700" />}
                 </button>
                 <div className="relative">
                   <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="relative flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-primary-mint/50 transition">
                     <img src={user.photoURL || ''} alt="avatar" className="w-8 h-8 rounded-full" />
                     {!hasKey && <span data-testid="key-missing-dot" className="absolute top-0 right-0 w-3 h-3 rounded-full bg-red-500 border-2 border-white dark:border-slate-900" title="API key not set" />}
                   </button>
                   
                   {/* Avatar Dropdown */}
                   {isDropdownOpen && (
                     <>
                       <div className="fixed inset-0 z-30" onClick={() => setIsDropdownOpen(false)} />
                       <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-40 overflow-hidden">
                       <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                         <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
                         <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.email}</p>
                      </div>
                       
                       <div className="p-2 space-y-1">
                         <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">Account</p>
                         <button 
                           onClick={() => { setIsDropdownOpen(false); setIsProfileOpen(true); }}
                           className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2"
                         >
                           <User size={16} /> Profile Details
                         </button>
                      </div>
                       
                       <div className="p-2 border-t border-gray-100 dark:border-slate-700">
                         <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">Trading Preferences</p>
                         <div className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg group">
                           <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                             <Target size={16} /> Risk Tolerance
                          </div>
                           <select className="bg-transparent text-sm text-slate-900 dark:text-white font-medium focus:outline-none cursor-pointer">
                             <option>Conservative</option>
                             <option>Moderate</option>
                             <option>Aggressive</option>
                           </select>
                        </div>
                      </div>
                       
                       <div className="p-2 border-t border-gray-100 dark:border-slate-700">
                         <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">Brokerage</p>
                         <button className="w-full text-left px-3 py-2 text-sm text-primary-coral bg-primary-coral/5 hover:bg-primary-coral/10 rounded-lg flex items-center gap-2 mb-1">
                           <TriangleAlert size={16} /> Schwab Needs Auth
                         </button>
                         <button className="w-full text-left px-3 py-2 text-sm text-primary-violet hover:bg-primary-violet/10 rounded-lg flex items-center gap-2">
                           <ArrowRight size={16} /> Authenticate Schwab
                         </button>
                      </div>
                       
                       <div className="p-2 border-t border-gray-100 dark:border-slate-700">
                         <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">AI Configuration</p>
                         <button 
                           onClick={() => { setIsDropdownOpen(false); setIsLLMDrawerOpen(true); }}
                           data-testid="llm-settings-btn"
                            className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 ${hasKey ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700' : 'text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'}`}
                          >
                            <SettingsIcon size={16} /> LLM Settings{!hasKey && ' — API key required'}
                         </button>
                      </div>
                       
                       <div className="p-2 border-t border-gray-100 dark:border-slate-700">
                         <button onClick={logout} className="w-full text-left px-3 py-2 text-sm text-primary-coral hover:bg-primary-coral/10 rounded-lg flex items-center gap-2">
                           <LogOut size={16} /> Sign Out
                         </button>
                      </div>
                       
                       <button 
                         onClick={() => { setIsDropdownOpen(false); setIsAboutOpen(true); }}
                         className="w-full p-3 bg-gray-50 dark:bg-slate-900/50 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs text-gray-500 transition"
                       >
                         <span className="flex items-center gap-1"><InfoIcon size={12}/> About BunBau</span>
                         <span>v2.7.4 (Build 119)</span>
                       </button>
                    </div>
                   </>
                  )}
                </div>
              </div>
             ) : (
               <button 
                 onClick={signInWithGoogle} 
                 disabled={isAuthenticating}
                 className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition ${isAuthenticating ? 'bg-primary-mint/5 text-primary-mint/50 cursor-not-allowed' : 'bg-primary-mint/10 text-primary-mint hover:bg-primary-mint/20'}`}
               >
                 <LogIn size={16} /> {isAuthenticating ? 'Signing In...' : 'Sign In'}
               </button>
             )}
           </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-auto p-6">
           {loading && (
             <div data-testid="portfolio-loading" className="mb-6 p-3 text-sm text-gray-500 dark:text-gray-400 text-center">Loading your portfolio…</div>
           )}
           {user && profile && !hasKey && (
             <div data-testid="key-banner" className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-center justify-center font-medium gap-2 shadow-sm">
               <TriangleAlert size={16} /> No AI API key set. Screenshot import needs one.
               <button onClick={() => setIsLLMDrawerOpen(true)} className="underline font-bold">Set it up in LLM Settings</button>
             </div>
           )}
           {snapshotToast && (
             <div data-testid="snapshot-toast" className="mb-6 p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-lg text-sm flex items-center justify-between font-medium shadow-sm">
               <span className="flex items-center gap-2">
                 <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                 {snapshotToast}
               </span>
               <button onClick={() => setSnapshotToast(null)} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 ml-3">Dismiss</button>
             </div>
           )}
           {isDemo && (
             <div data-testid="demo-banner" className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-sm flex items-center justify-between font-medium gap-2 shadow-sm">
               <div className="flex items-center gap-2">
                 <InfoIcon size={16} className="shrink-0" />
                 <span><strong>Demo Mode:</strong> You are viewing sample portfolio data. Upload a real brokerage statement to switch to Live Mode.</span>
               </div>
               <button onClick={() => setIsUploaderOpen(true)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg transition shrink-0 ml-3">
                 Upload Statement
               </button>
             </div>
           )}

           {activeTab === 'dashboard' && !loading && (() => {
             const cash = cashSummary(positions);
             const totalCspReserve = cash.cspReserve;
             const netFreeCash = cash.netFreeCash;
             const worth = netWorth(positions);
             const apyBd = blendedApyBreakdown(positions);
             const equities = equitiesBySymbol(positions);
             const options = optionsList(positions);
             const cryptoHoldings = cryptoBySymbol(positions, worth);
             const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

             return (
               <>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                   <StatCard 
                     title="Total Net Worth" 
                     value={`$${fmt(worth)}`} 
                     info="Sum of all asset values across all connected institutions (excluding option premiums)." 
                     onDrillDown={() => setDrillDownModal(buildNetWorthDrillDown(accounts, positions))}
                    />
                   <StatCard 
                     title="Global Net Free Cash" 
                     value={`$${fmt(netFreeCash)}`}
                     info="Aggregated cash across all institutions minus locked CSP reserves." 
                     valueColorClass="text-emerald-500" 
                     onDrillDown={() => setDrillDownModal(buildFreeCashDrillDown(positions, accounts))}
                    />
                   <StatCard 
                     title="Blended APY%" 
                     valueLabel="Portfolio Blended APY"
                      value={`${apyBd.apyPortfolio.toFixed(2)}%`}
                      info={`Portfolio Blended APY (${apyBd.apyPortfolio.toFixed(2)}%): estimated annual income divided by ALL owned assets; assets with no APY count as 0%. Yield-bearing assets APY (${apyBd.apyYieldBearing.toFixed(2)}%): the same income divided only by assets that report a yield (CDs, Treasuries, SGOV, Cash), which are ${apyBd.yieldSharePct.toFixed(1)}% of the portfolio.`}
                      valueColorClass="text-secondary-violet"
                      onDrillDown={() => setDrillDownModal(buildPortfolioApyDrillDown(positions, accounts))}
                      secondary={{
                        label: 'Yield-bearing assets APY',
                        value: `${apyBd.apyYieldBearing.toFixed(2)}%`,
                        colorClass: 'text-teal-500',
                        onDrillDown: () => setDrillDownModal(buildApyDrillDown(positions, accounts)),
                      }}
                    />
                   <StatCard 
                     title="Total Option Collateral" 
                     value={`$${fmt(totalCspReserve)}`}
                     info="Total cash secured for active put contracts." 
                     valueColorClass="text-primary-amber" 
                     onDrillDown={() => setDrillDownModal(buildOptionCollateralDrillDown(positions, accounts))}
                    />
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                   
                   {/* Cash Manager Container */}
                   <div className="lg:col-span-1 flex flex-col gap-6">
                     <AppletContainer 
                       title="Cash Manager" 
                       infoDescription="Aggregated cash reserves and locked collateral across all brokerages."
                       onDrillDown={() => setDrillDownModal(buildFreeCashDrillDown(positions, accounts))}
                      >
                       <div className="p-4 space-y-4">
                          <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                            {cash.rows.map((row) => (
                               <div key={row.institution} className="flex justify-between text-sm">
                                 <span className="text-gray-500 dark:text-gray-400 font-medium">{row.institution} Raw Cash</span>
                                 <span className="font-mono dark:text-white">${fmt(row.value)}</span>
                               </div>
                            ))}
                            <div className="pt-2 border-t border-gray-200 dark:border-slate-800 flex justify-between text-sm">
                              <span className="text-amber-600 dark:text-amber-500 flex items-center gap-2">Global CSP Reserves</span>
                              <span className="font-mono text-amber-600 dark:text-amber-500">-${fmt(totalCspReserve)}</span>
                            </div>
                            <div className="pt-2 border-t border-gray-200 dark:border-slate-800 flex justify-between font-bold">
                              <span className="text-emerald-600 dark:text-emerald-500">Global Net Free Cash</span>
                              <span className="font-mono text-emerald-600 dark:text-emerald-500">${fmt(netFreeCash)}</span>
                            </div>
                          </div>
                       </div>
                     </AppletContainer>
                     
                     <AppletContainer 
                       title="Asset Allocation" 
                       infoDescription="Breakdown by asset class (option premiums excluded)"
                       onDrillDown={() => setDrillDownModal(buildAssetAllocationDrillDown(positions, accounts))}
                        tableComponent={<AssetAllocationTable positions={positions} />}
                     >
                       <AssetAllocationChart positions={positions} />
                     </AppletContainer>
                   </div>

                   {/* Equities Portfolio Container */}
                   <div className="lg:col-span-2 flex flex-col gap-6">
                     <AppletContainer 
                       title="Equities Portfolio (Stocks & ETFs)" 
                       infoDescription="Aggregated equity holdings (summed by symbol across institutions). Assets locked by active Covered Calls are flagged."
                       onDrillDown={() => setDrillDownModal(buildEquityDrillDown(positions, accounts))}
                        tableComponent={
                          <EquitiesTable 
                            equities={equities} 
                            onSelectSymbol={(sym) => setDrillDownModal(buildEquityDrillDown(positions, accounts, sym))} 
                          />
                        }
                     >
                       <EquitiesChart positions={positions} />
                     </AppletContainer>

                     <AppletContainer 
                       title="Active Options Monitor" 
                       infoDescription="Tracks all active Cash Secured Puts (locking cash) and Covered Calls (locking equities)."
                       onDrillDown={() => setDrillDownModal(buildOptionCollateralDrillDown(positions, accounts))}
                        tableComponent={<ActiveOptionsTable options={options} />}
                     >
                       <OptionsChart positions={positions} />
                     </AppletContainer>

                     {cryptoHoldings.length > 0 && (
                       <AppletContainer 
                         title="Digital Assets Portfolio (Crypto)" 
                         infoDescription="Direct cryptocurrency and digital currency holdings with token quantity, cost basis, and unrealized gain/loss."
                         onDrillDown={() => setDrillDownModal(buildCryptoDrillDown(positions, accounts))}
                         tableComponent={
                           <CryptoTable 
                             cryptoList={cryptoHoldings} 
                             onSelectSymbol={(sym) => setDrillDownModal(buildCryptoDrillDown(positions, accounts, sym))} 
                           />
                         }
                       >
                         <CryptoChart positions={positions} />
                       </AppletContainer>
                     )}
                   </div>
                 </div>
               </>
             );
           })()}
             
             {activeTab === 'calendar' && !loading && <MaturityCalendar positions={positions} accounts={accounts} />}
           {activeTab === 'strategy' && !loading && <StrategyView />}
           {activeTab === 'reports' && !loading && <ReportsView isSidebarExpanded={isSidebarExpanded} />}
            {activeTab === 'history' && (
              <HistoryView 
                onCaptureSnapshot={handleCaptureSnapshot} 
                isCapturingSnapshot={isCapturingSnapshot} 
              />
            )}
        </main>
      </div>

      {drillDownModal && (
        <DashboardDrillDownModal
          key={drillDownModal.title}
          isOpen={true}
          onClose={() => setDrillDownModal(null)}
          title={drillDownModal.title}
          subtitle={drillDownModal.subtitle}
          infoDescription={drillDownModal.infoDescription}
          columns={drillDownModal.columns}
          rows={drillDownModal.rows}
          summaryCards={drillDownModal.summaryCards}
          charts={drillDownModal.charts}
          defaultView={drillDownModal.defaultView}
          related={
            drillDownModal.related
              ? {
                  label: drillDownModal.related.label,
                  onOpen: () => setDrillDownModal(drillDownModal.related!.build()),
                }
              : undefined
          }
        />
      )}

      <UploadValidationModal 
        isOpen={isUploaderOpen} 
        onClose={() => setIsUploaderOpen(false)} 
        institutions={institutions}
        existingAccounts={accounts}
        onApprove={async (extraction, files) => {
          const result = await importExtraction(extraction, files);
          if (result.record.storageErrors?.length) {
            console.warn(`Optional screenshot storage notice: ${result.record.storageErrors.length} file(s) could not be saved to Storage.`);
          }
        }}
        onDeleteData={async (mode, institution) => {
          await removeAccounts(mode, institution);
        }}
      />
      <LLMSettingsDrawer
        isOpen={isLLMDrawerOpen}
        onClose={() => setIsLLMDrawerOpen(false)}
      />
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        onOpenLLMDrawer={() => setIsLLMDrawerOpen(true)}
      />
      <AIChatbot />
    </div>
  );
}
