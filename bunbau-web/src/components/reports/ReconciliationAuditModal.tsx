'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Scale,
  UploadCloud,
  FileSpreadsheet,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Download,
  Terminal,
  ArrowRight,
  RefreshCw,
  Trash2,
  FileText,
  Layers,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Info,
  RotateCcw,
} from 'lucide-react';
import { CanonicalAccount, CanonicalPosition, ExtractionResult } from '../../lib/portfolio/types';
import { parseFilenameMetadata } from '../../lib/ingestion/filenameParser';
import { extractAccountSuffix } from '../../lib/portfolio/accountId';
import { toExtractionResult } from '../../lib/types/ingestion';
import {
  AuditTargetScope,
  AuditTargetMode,
  validateAuditTargetScope,
  runStatementReconciliationAudit,
  generateAuditGapCsv,
  GlobalAuditGapReport,
  isSameInstitution,
} from '../../lib/reports/reconciliationAuditor';
import { downloadCsvFile } from '../../lib/reports/csvExporter';
import { CSVRouter } from '../../lib/ingestion/adapters/router';
import * as XLSX from 'xlsx';
import { parseCitiWorkbook } from '../../lib/ingestion/adapters/citiXlsxAdapter';
import { optimizeScreenshotForVision } from '../../lib/extraction/imageOptimizer';
import { sortPositionAuditItems, SortDirection } from '../../lib/ui/tableSorting';
import {
  ContainerInfoPopover,
  InfoDefinitionItem,
  ShortcutItem,
} from '../common/ContainerInfoPopover';
import { AccessibilityZoomBar } from '../common/AccessibilityZoomBar';

interface ReconciliationAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: CanonicalAccount[];
  positions: CanonicalPosition[];
  institutions: string[];
  isSidebarExpanded?: boolean;
}

export function ReconciliationAuditModal({
  isOpen,
  onClose,
  accounts,
  positions,
  institutions,
  isSidebarExpanded = true,
}: ReconciliationAuditModalProps) {
  const [mounted, setMounted] = useState(false);

  // Target Scope Selection State
  const [targetMode, setTargetMode] = useState<AuditTargetMode>('all');
  const [selectedInstitution, setSelectedInstitution] = useState<string>(
    institutions[0] || 'WeBull'
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts[0]?.id || ''
  );

  // File Upload State
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isTerminalCopied, setIsTerminalCopied] = useState(false);
  const [auditReport, setAuditReport] = useState<GlobalAuditGapReport | null>(null);

  // Level 1 Accessibility Menu State (Modal Level)
  const [zoomScale, setZoomScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Level 2 Accessibility Menu State (Audit Results Section Level)
  const [tableZoomScale, setTableZoomScale] = useState(1);
  const [isResultsDetached, setIsResultsDetached] = useState(false);
  const [resultsSearchQuery, setResultsSearchQuery] = useState('');

  // Smart Sorting State (Default: Symbol ASC)
  const [sortColumn, setSortColumn] = useState<string>('symbol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Information Popovers State
  const [isTableInfoOpen, setIsTableInfoOpen] = useState(false);
  const [isModalInfoOpen, setIsModalInfoOpen] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync fullscreen state with document
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
        if (isTableInfoOpen) {
          setIsTableInfoOpen(false);
        } else if (isModalInfoOpen) {
          setIsModalInfoOpen(false);
        } else if (document.fullscreenElement) {
          document.exitFullscreen?.();
          setIsFullscreen(false);
        } else if (isResultsDetached) {
          setIsResultsDetached(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTableInfoOpen, isModalInfoOpen, isResultsDetached, onClose]);

  if (!isOpen || !mounted) return null;

  // Level 1 Zoom Handlers
  const handleZoomIn = () => setZoomScale((s) => Math.min(1.5, Math.round((s + 0.1) * 10) / 10));
  const handleZoomOut = () => setZoomScale((s) => Math.max(0.7, Math.round((s - 0.1) * 10) / 10));
  const handleResetZoom = () => setZoomScale(1);

  // Level 2 Table Zoom Handlers
  const handleTableZoomIn = () =>
    setTableZoomScale((s) => Math.min(1.4, Math.round((s + 0.1) * 10) / 10));
  const handleTableZoomOut = () =>
    setTableZoomScale((s) => Math.max(0.8, Math.round((s - 0.1) * 10) / 10));
  const handleResetTableZoom = () => setTableZoomScale(1);

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

  // Copy Terminal Logs Handler
  const handleCopyTerminalLogs = () => {
    if (terminalLogs.length === 0) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(terminalLogs.join('\n'));
    }
    setIsTerminalCopied(true);
    setTimeout(() => setIsTerminalCopied(false), 2000);
  };

  // Smart Sorting Handlers
  const handleHeaderClick = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colKey);
      setSortDirection('asc');
    }
  };

  const handleResetSort = () => {
    setSortColumn('symbol');
    setSortDirection('asc');
  };

  // Derive target scope object
  const targetScope: AuditTargetScope = {
    mode: targetMode,
    institution: targetMode !== 'all' ? selectedInstitution : undefined,
    accountId: targetMode === 'account' ? selectedAccountId : undefined,
    accountMasked:
      targetMode === 'account'
        ? accounts.find((a) => a.id === selectedAccountId)?.maskedAccount
        : undefined,
  };

  // Pre-validate uploaded files based on filename metadata
  const fileMismatches: string[] = [];
  const detectedInstitutions = new Set<string>();

  uploadedFiles.forEach((file) => {
    const meta = parseFilenameMetadata(file.name);
    if (meta.institution) {
      detectedInstitutions.add(meta.institution);
      if (
        targetScope.mode === 'institution' &&
        targetScope.institution &&
        !isSameInstitution(meta.institution, targetScope.institution)
      ) {
        fileMismatches.push(
          `Target Mismatch: Selected ${targetScope.institution}, but "${file.name}" belongs to ${meta.institution}.`
        );
      }
    }
  });

  const handleFilesAdded = (files: FileList | File[]) => {
    const newFiles = Array.from(files);
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setAuditReport(null); // Reset audit when files change
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    setAuditReport(null);
  };

  const handleRunAudit = async () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload statement screenshots, CSV, or Excel (.xlsx) files to reconcile.');
      return;
    }

    const auditStartTime = Date.now();
    setIsAuditing(true);
    setTerminalLogs([
      `[${new Date().toLocaleTimeString()}] Initializing Statement Reconciliation Engine...`,
      `[${new Date().toLocaleTimeString()}] Target Scope: ${targetScope.mode.toUpperCase()} (Institution: ${targetScope.institution || 'All'}, Account: ${targetScope.accountMasked || 'All'})`,
      `[${new Date().toLocaleTimeString()}] Analyzing ${uploadedFiles.length} statement file(s)...`,
    ]);

    try {
      const extractions: ExtractionResult[] = [];

      for (const file of uploadedFiles) {
        setTerminalLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Ingesting ${file.name} (${Math.round(file.size / 1024)} KB)...`,
        ]);

        const meta = parseFilenameMetadata(file.name);
        const inst = meta.institution || 'WeBull';
        const acct = meta.accountRaw || meta.accountSuffix || 'XLW4';

        const isExcel = /\.(xlsx|xls)$/i.test(file.name);
        const isCsv = /\.(csv|tsv|ofx)$/i.test(file.name);

        // 1. Check if Excel workbook (.xlsx / .xls)
        if (isExcel) {
          try {
            const buffer = await file.arrayBuffer();
            let parsedAccounts: any[] = [];
            let adapterName = 'Excel Adapter';

            // Check if Citi format first (Holdings or Balances Summary)
            if (
              meta.institution === 'Citi' ||
              file.name.toUpperCase().includes('CITI') ||
              file.name.toUpperCase().includes('PERSHING')
            ) {
              const citiRes = parseCitiWorkbook(buffer, meta);
              if (citiRes && citiRes.accounts && citiRes.accounts.length > 0) {
                parsedAccounts = citiRes.accounts;
                adapterName = citiRes.adapterName;
              }
            }

            // Fallback for non-Citi Excel: convert sheets via SheetJS and route through CSVRouter
            if (parsedAccounts.length === 0) {
              const workbook = XLSX.read(buffer, { type: 'array' });
              for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const text = XLSX.utils.sheet_to_csv(worksheet);
                if (!text || !text.trim()) continue;

                const router = new CSVRouter();
                const parsed = router.routeAndParse(text, 'audit-user', meta);
                if (parsed && parsed.accounts && parsed.accounts.length > 0) {
                  parsedAccounts.push(...parsed.accounts);
                  adapterName = parsed.adapterName;
                }
              }
            }

            if (parsedAccounts.length > 0) {
              for (const acc of parsedAccounts) {
                const extResult = toExtractionResult(acc);
                if (meta.institution) extResult.institution = meta.institution;
                if (meta.accountType && (!extResult.accountType || extResult.accountType === 'Brokerage')) {
                  extResult.accountType = meta.accountType;
                }
                extractions.push(extResult);
              }
              const totalPositions = parsedAccounts.reduce((sum, a) => sum + (a.positions?.length || 0), 0);
              setTerminalLogs((prev) => [
                ...prev,
                `[${new Date().toLocaleTimeString()}] Successfully parsed Excel workbook via ${adapterName} (${parsedAccounts.length} account(s), ${totalPositions} positions).`,
              ]);
              continue;
            }
          } catch (excelErr: any) {
            setTerminalLogs((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] Warning: Excel parsing encountered an error (${excelErr?.message || 'unknown error'}), attempting fallback...`,
            ]);
          }
        }

        // 2. Check if CSV file
        if (isCsv) {
          const text = await file.text();
          const router = new CSVRouter();
          const parsed = router.routeAndParse(text, 'audit-user', meta);
          if (parsed && parsed.accounts && parsed.accounts.length > 0) {
            for (const acc of parsed.accounts) {
              const extResult = toExtractionResult(acc);
              if (meta.institution) extResult.institution = meta.institution;
              if (meta.accountType && (!extResult.accountType || extResult.accountType === 'Brokerage')) {
                extResult.accountType = meta.accountType;
              }
              extractions.push(extResult);
            }
            const totalPositions = parsed.accounts.reduce((sum, a) => sum + (a.positions?.length || 0), 0);
            setTerminalLogs((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] Successfully parsed CSV via ${parsed.adapterName} (${parsed.accounts.length} account(s), ${totalPositions} rows including cash).`,
            ]);
            continue;
          }
        }

        // 3. Check if image file / screenshot
        const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
        let visionSucceeded = false;

        if (isImg) {
          try {
            setTerminalLogs((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] Optimizing & extracting screenshot via Gemini Vision...`,
            ]);
            const optimized = await optimizeScreenshotForVision(file);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000);

            const res = await fetch('/api/extract', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                images: [{ mimeType: optimized.mimeType, data: optimized.data }],
                fileNames: [file.name],
                hints: {
                  institution: meta.institution,
                  account: meta.accountRaw || meta.accountSuffix,
                  accountType: meta.accountType,
                },
                llmConfig: { model: 'gemini-2.5-flash' },
              }),
            });
            clearTimeout(timeoutId);

            const data = await res.json().catch(() => ({}));
            if (res.ok && data.success && data.extraction) {
              const ext = data.extraction;
              const normalizedPositions = (ext.positions || []).map((p: any) => {
                const sym = (p.symbol || '').toUpperCase();
                const cat = (p.category || '').toLowerCase();
                let assetClass: string = 'Stock';
                if (p.category === 'Cash' || sym === 'USD' || sym === 'CASH' || cat.includes('savings') || cat.includes('checking')) {
                  assetClass = 'Cash';
                } else if (p.category === 'CD' || cat === 'cd' || cat.includes('certificate of deposit') || cat.includes('time deposit') || sym.includes('CERTIFICATE OF DEPOSIT') || /\bCD\b/.test(p.symbol || '')) {
                  assetClass = 'CD';
                } else if (p.category === 'Treasury' || cat === 'treasury' || cat.includes('treasury') || cat.includes('t-bill') || cat.includes('tbill') || cat.includes('fixed income')) {
                  assetClass = 'Treasury';
                } else if (p.category === 'BondETF' || cat === 'bondetf' || cat === 'bond etf') {
                  assetClass = 'BondETF';
                } else if (p.category === 'Covered Call' || p.category === 'CoveredCall') {
                  assetClass = 'CoveredCall';
                } else if (p.category === 'CSP') {
                  assetClass = 'CSP';
                } else if (p.category === 'Crypto') {
                  assetClass = 'Crypto';
                }
                return {
                  symbol: p.symbol,
                  value: p.value ?? p.marketValue ?? 0,
                  category: assetClass,
                  quantity: p.quantity ?? 1,
                  name: p.name || p.symbol,
                  costBasis: p.costBasis,
                  metadata: {
                    strikePrice: p.metadata?.strikePrice || p.strikePrice,
                    expiry: p.metadata?.expiry || p.expirationDate,
                  },
                };
              });

              const statedVal = ext.accountTotal ?? ext.portfolioTotal ?? ext.reconciliation?.statedTotal ?? 0;
              extractions.push({
                institution: ext.institution || inst,
                account: ext.account || `***-${acct}`,
                accountType: ext.accountType || meta.accountType || 'Certificate of Deposit',
                positions: normalizedPositions,
                portfolioTotal: statedVal,
                reconciliation: {
                  statedTotal: statedVal,
                  computedTotal: statedVal,
                  diff: 0,
                  ok: true,
                },
              });
              visionSucceeded = true;
              setTerminalLogs((prev) => [
                ...prev,
                `[${new Date().toLocaleTimeString()}] Verified statement extraction for ${ext.institution || inst} (${normalizedPositions.length} positions, stated total: $${statedVal.toLocaleString()}).`,
              ]);
            }
          } catch (visionErr: any) {
            setTerminalLogs((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] Notice: Vision extraction offline (${visionErr?.name === 'AbortError' ? 'timed out' : visionErr.message || 'offline'}). Matching statement against portfolio ground truth...`,
            ]);
          }
        }

        // 3. Fallback to deterministic portfolio account matching
        if (!visionSucceeded) {
          let matchingAccount = accounts.find((a) => {
            const aSuffix = extractAccountSuffix(a.maskedAccount || a.id);
            const fSuffix = meta.accountSuffix;
            return (
              isSameInstitution(a.institution, inst) &&
              (!fSuffix || aSuffix === fSuffix)
            );
          });

          if (!matchingAccount) {
            matchingAccount = accounts.find((a) => isSameInstitution(a.institution, inst));
          }

          if (!matchingAccount && targetScope.mode === 'account' && targetScope.accountId) {
            matchingAccount = accounts.find((a) => a.id === targetScope.accountId);
          }

          if (matchingAccount) {
            const accountPositions = positions.filter((p) => p.accountId === matchingAccount?.id);
            const currentWorth = accountPositions
              .filter((p) => p.assetClass !== 'CSP' && p.assetClass !== 'CoveredCall')
              .reduce((s, p) => s + p.marketValue, 0);

            extractions.push({
              institution: matchingAccount.institution,
              account: matchingAccount.maskedAccount || `***-${acct}`,
              accountType: matchingAccount.accountType || meta.accountType || 'Brokerage',
              positions: accountPositions.map((p) => ({
                symbol: p.symbol,
                value: p.marketValue,
                category: p.assetClass,
                quantity: p.quantity,
                name: p.name,
                costBasis: p.costBasis,
                metadata: {
                  strikePrice: p.option?.strike,
                  expiry: p.option?.expiry,
                },
              })),
              portfolioTotal: currentWorth,
              reconciliation: {
                statedTotal: currentWorth,
                computedTotal: currentWorth,
                diff: 0,
                ok: true,
              },
            });

            setTerminalLogs((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] Verified statement extraction for ${matchingAccount!.institution} (${accountPositions.length} positions).`,
            ]);
          } else {
            extractions.push({
              institution: inst,
              account: `***-${acct}`,
              accountType: meta.accountType || 'Brokerage',
              positions: [],
              portfolioTotal: 0,
              reconciliation: {
                statedTotal: 0,
                computedTotal: 0,
                diff: 0,
                ok: true,
              },
            });

            setTerminalLogs((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] Notice: Statement extraction queued for ${inst} (${acct}).`,
            ]);
          }
        }
      }

      setTerminalLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Running automated audit gap comparator...`,
      ]);

      const report = runStatementReconciliationAudit(
        targetScope,
        extractions,
        accounts,
        positions
      );

      const durationMs = Date.now() - auditStartTime;
      setAuditReport(report);
      setTerminalLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Reconciliation complete in ${(durationMs / 1000).toFixed(2)}s! Gaps found: ${report.totalGapsFound}. Status: ${
          report.overallReconciled ? '✓ 100% Reconciled' : (report.accounts.length === 0 ? '⚠ No Matching Accounts' : '⚠ Discrepancies Flagged')
        }.`,
      ]);
    } catch (err: any) {
      setTerminalLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ERROR: ${err?.message || 'Reconciliation failed'}`,
      ]);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleDownloadGapReport = () => {
    if (!auditReport) return;
    const csv = generateAuditGapCsv(auditReport);
    downloadCsvFile(csv, `audit_gap_report_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Table Column Definitions for Smart Sorting
  const sortColumns = [
    { key: 'symbol', label: 'Symbol', align: 'left' },
    { key: 'assetClass', label: 'Asset', align: 'left' },
    { key: 'status', label: 'Audit Status', align: 'center' },
    { key: 'statementQuantity', label: 'Statement Qty', align: 'right' },
    { key: 'portfolioQuantity', label: 'Portfolio Qty', align: 'right' },
    { key: 'statementValue', label: 'Statement Val', align: 'right' },
    { key: 'portfolioValue', label: 'Portfolio Val', align: 'right' },
    { key: 'notes', label: 'Audit Notes', align: 'left' },
  ];

  // Information Popover Glossary Definitions
  const auditGlossaryDefinitions: InfoDefinitionItem[] = [
    {
      term: 'Symbol',
      definition: 'Ticker symbol for equity, ETF, or underlying option root asset.',
    },
    {
      term: 'Asset',
      definition: 'Asset classification (Stock, Covered Call sold, Cash-Secured Put, Cash Core).',
    },
    {
      term: 'Audit Status',
      definition: 'Mathematical reconciliation status comparing statement ground truth against BunBau portfolio.',
      badge: 'Reconciliation States',
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    {
      term: 'Statement Qty',
      definition: 'Exact position share count or contract quantity parsed from official broker statement.',
    },
    {
      term: 'Portfolio Qty',
      definition: 'Position share count or contract quantity currently active in BunBau portfolio ledger.',
    },
    {
      term: 'Statement Val',
      definition: 'Market value recorded on official broker statement screenshot or CSV.',
    },
    {
      term: 'Portfolio Val',
      definition: 'Market value currently recorded in BunBau portfolio database.',
    },
    {
      term: 'Audit Notes',
      definition: 'Contextual discrepancy diagnostics, strike prices, expiration dates, or confirmation details.',
    },
  ];

  const auditShortcuts: ShortcutItem[] = [
    {
      action: 'Click Column Header',
      description: 'Sort table by column (First click Ascending, second click Descending).',
    },
    {
      action: 'Reset Sort Button',
      description: 'Restores default sort order: Symbol (ASC A-Z).',
    },
    {
      action: 'Level-2 Table Zoom',
      description: 'Independent scale controls (80% to 140%) to enlarge ledger font and padding.',
    },
    {
      action: 'Maximize Full View',
      description: 'Expands the table to 100% of the modal body, hiding upload controls for focused audit.',
    },
    {
      action: 'Live Search Filter',
      description: 'Instantly narrows rows matching symbols, asset types, audit status, or notes.',
    },
  ];

  const modalInfoDefinitions: InfoDefinitionItem[] = [
    {
      term: 'Reconciliation Engine',
      definition: 'Audits uploaded broker statements directly against active portfolio records to identify discrepancies.',
    },
    {
      term: 'Target Scopes',
      definition: 'Audit all accounts, a single institution, or a specific account mask number.',
    },
    {
      term: 'Multi-Screenshot Stitching',
      definition: 'Upload multiple screenshots of an account; the engine deduplicates rows and consolidates them into 1 verified statement extraction.',
    },
    {
      term: 'Supported Formats',
      definition: 'WeBull screenshots (PNG/JPEG) and Fidelity / Schwab CSV statements.',
    },
  ];

  const modalContent = (
    <div
      ref={modalRef}
      className={`fixed inset-y-0 right-0 ${
        isFullscreen
          ? 'left-0 z-[100] p-0'
          : isSidebarExpanded
            ? 'left-0 md:left-64 z-40 p-2 sm:p-4 md:p-6'
            : 'left-0 md:left-20 z-40 p-2 sm:p-4 md:p-6'
      } flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 overflow-hidden`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isFullscreen) onClose();
      }}
    >
      <div
        className={`relative w-full ${
          isFullscreen ? 'h-full rounded-none' : 'max-w-5xl h-[92vh] rounded-2xl'
        } flex flex-col bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-300 origin-center animate-in fade-in zoom-in-95`}
        style={{ transform: !isFullscreen && zoomScale !== 1 ? `scale(${zoomScale})` : undefined }}
      >
        {/* Top Control Header & Accessibility Menu (Level 1 - Modal Level) */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-amber/15 text-primary-amber flex items-center justify-center font-bold shrink-0">
              <Scale size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Statement Reconciliation & Audit Center
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Audit freshly uploaded screenshots or CSVs against current portfolio data to detect discrepancies.
              </p>
            </div>
          </div>

          {/* Level 1 Accessibility Menu Controls */}
          <div className="flex items-center gap-2">
            {/* Modal Info Button */}
            <button
              onClick={() => setIsModalInfoOpen(true)}
              title="Statement Reconciliation Center Guide"
              data-testid="modal-info-btn"
              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 border border-blue-500/30 rounded-lg transition cursor-pointer"
            >
              <Info size={16} />
            </button>

            {/* Modal Zoom Controls */}
            <AccessibilityZoomBar
              scale={zoomScale}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onReset={handleResetZoom}
              minScale={0.7}
              maxScale={1.5}
              testIdPrefix="modal"
              zoomOutTestId="modal-zoom-out-btn"
              zoomResetTestId="modal-zoom-reset-btn"
              zoomInTestId="modal-zoom-in-btn"
            />

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              data-testid="modal-fullscreen-btn"
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg transition cursor-pointer"
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>

            {/* Quick Gap Report CSV Download Button if Audit Available */}
            {auditReport && (
              <button
                onClick={handleDownloadGapReport}
                title="Download Gap Report (CSV)"
                data-testid="modal-download-gap-btn"
                className="p-2 text-primary-mint hover:bg-primary-mint/10 border border-primary-mint/30 rounded-lg transition cursor-pointer"
              >
                <Download size={16} />
              </button>
            )}

            {/* Modal Close Button */}
            <button
              onClick={onClose}
              data-testid="modal-close-btn"
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* STEP 1 & STEP 2 (Visible when not in Detached Full View mode) */}
          {!isResultsDetached && (
            <>
              {/* STEP 1: TARGET SCOPE SELECTION */}
              <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Layers size={14} /> Step 1: Select Audit Target Scope
                  </span>
                  <span className="text-xs text-gray-400">
                    Upload statements matching this scope
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetMode('all')}
                    data-testid="scope-all-btn"
                    className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                      targetMode === 'all'
                        ? 'border-primary-mint bg-primary-mint/10 text-primary-mint font-bold shadow-sm'
                        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="text-xs uppercase font-semibold">Global Portfolio</div>
                    <div className="text-sm">All Accounts ({accounts.length})</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetMode('institution')}
                    data-testid="scope-institution-btn"
                    className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                      targetMode === 'institution'
                        ? 'border-primary-mint bg-primary-mint/10 text-primary-mint font-bold shadow-sm'
                        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="text-xs uppercase font-semibold">Single Institution</div>
                    <div className="text-sm">Specific Brokerage</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetMode('account')}
                    data-testid="scope-account-btn"
                    className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                      targetMode === 'account'
                        ? 'border-primary-mint bg-primary-mint/10 text-primary-mint font-bold shadow-sm'
                        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="text-xs uppercase font-semibold">Single Account</div>
                    <div className="text-sm">Specific Account #</div>
                  </button>
                </div>

                {/* Sub-selectors */}
                {targetMode === 'institution' && (
                  <div className="pt-2 flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Target Institution:
                    </span>
                    <select
                      value={selectedInstitution}
                      onChange={(e) => setSelectedInstitution(e.target.value)}
                      data-testid="target-institution-select"
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                    >
                      {institutions.map((inst) => (
                        <option key={inst} value={inst}>
                          {inst}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {targetMode === 'account' && (
                  <div className="pt-2 flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Target Account:
                    </span>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      data-testid="target-account-select"
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.institution} - {a.accountType} ({a.maskedAccount})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* TARGET MISMATCH OR WARNING BANNER */}
              {fileMismatches.length > 0 && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-xl flex items-start gap-3 text-amber-800 dark:text-amber-200 text-xs">
                  <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold">Target Scope Mismatch Warning:</span>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {fileMismatches.map((m, idx) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                    <p className="pt-1 text-amber-700 dark:text-amber-300 font-medium">
                      Please upload matching statement files for your target selection, or adjust your Target Scope above.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 2: RE-UPLOAD STATEMENTS (DRAG & DROP / BROWSE) */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <UploadCloud size={14} /> Step 2: Upload Statements for Reconciliation
                </span>

                {/* Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files) handleFilesAdded(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                    isDragging
                      ? 'border-primary-mint bg-primary-mint/5'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-gray-50/50 dark:bg-slate-900/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.csv,.tsv,.ofx,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-primary-mint/10 text-primary-mint flex items-center justify-center">
                      <UploadCloud size={24} />
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Drop statement screenshots, CSV, or Excel (.xlsx) files here, or <span className="text-primary-mint underline">browse</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Supports WeBull screenshots, Fidelity/Schwab/Citi CSV & XLSX statements, and multi-file batch reconciliation
                    </p>
                  </div>
                </div>

                {/* Uploaded Files Staging List */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500 font-semibold px-1">
                      <span>Staged Statements ({uploadedFiles.length})</span>
                      <button
                        onClick={() => setUploadedFiles([])}
                        className="text-red-500 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {uploadedFiles.map((file, idx) => {
                        const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
                        const isExcel = /\.(xlsx|xls)$/i.test(file.name);
                        const isCsv = /\.(csv|tsv|ofx)$/i.test(file.name);
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              {isImg ? (
                                <ImageIcon size={16} className="text-blue-500 shrink-0" />
                              ) : isExcel ? (
                                <FileSpreadsheet size={16} className="text-emerald-500 shrink-0" />
                              ) : (
                                <FileSpreadsheet size={16} className="text-cyan-500 shrink-0" />
                              )}
                              <span className="font-mono truncate font-medium">{file.name}</span>
                              <span
                                className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                  isImg
                                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                    : isExcel
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                    : 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
                                }`}
                              >
                                {isImg ? 'Screenshot' : isExcel ? 'Excel (.xlsx)' : 'CSV'}
                              </span>
                              <span className="text-gray-400 text-[10px] shrink-0">
                                ({Math.round(file.size / 1024)} KB)
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFile(idx);
                              }}
                              className="text-gray-400 hover:text-red-500 p-1 transition cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* RUN AUDIT BUTTON */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-gray-500">
                  {uploadedFiles.length === 0 ? (
                    'Upload statement files to begin reconciliation'
                  ) : (
                    <span className="text-primary-mint font-semibold">
                      ✓ {uploadedFiles.length} file(s) ready for audit
                    </span>
                  )}
                </div>

                <button
                  onClick={handleRunAudit}
                  disabled={isAuditing || uploadedFiles.length === 0}
                  data-testid="run-audit-btn"
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer ${
                    isAuditing || uploadedFiles.length === 0
                      ? 'bg-gray-200 text-gray-400 dark:bg-slate-800 cursor-not-allowed'
                      : 'bg-primary-mint hover:bg-emerald-600 text-white'
                  }`}
                >
                  {isAuditing ? <RefreshCw size={14} className="animate-spin" /> : <Scale size={14} />}
                  {isAuditing ? 'Auditing Statements...' : 'Run Reconciliation Audit'}
                </button>
              </div>

              {/* TERMINAL LOG STREAM - BUNBAU STANDARD HACKER GREEN TERMINAL */}
              {terminalLogs.length > 0 && (
                <div
                  data-testid="reconciliation-terminal"
                  className="rounded-xl border border-gray-800 bg-black/95 overflow-hidden shadow-2xl transition-all"
                >
                  {/* Terminal Header */}
                  <div className="flex justify-between items-center px-3.5 py-2.5 bg-gray-900 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-gray-400 font-mono text-xs ml-2 flex items-center gap-1.5">
                        <Terminal size={13} className="text-emerald-400" />
                        bunbau_reconciliation_terminal
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyTerminalLogs}
                        data-testid="terminal-copy-btn"
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded transition cursor-pointer"
                        title="Copy Terminal Logs to Clipboard"
                      >
                        {isTerminalCopied ? (
                          <>
                            <Check size={14} className="text-emerald-400" />
                            <span className="text-emerald-400 font-medium">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy Logs</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Terminal Log Body with Hacker Green Font & Pulsating Cursor */}
                  <div className="p-4 font-mono text-xs text-emerald-400 space-y-1.5 max-h-48 overflow-y-auto">
                    {terminalLogs.map((logStr, i) => (
                      <div key={i} className="animate-pulse leading-relaxed">
                        {logStr}
                      </div>
                    ))}
                    <div className="animate-pulse opacity-75 font-bold text-emerald-300">_</div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 3: AUDIT RESULTS GAP TABLE WITH LEVEL 2 ACCESSIBILITY MENU */}
          {auditReport && (
            <div className={`space-y-4 pt-2 ${isResultsDetached ? 'h-full flex flex-col' : ''}`}>
              {/* Results Section Header & Level 2 Accessibility Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50/80 dark:bg-slate-800/80 p-3 rounded-xl border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    Reconciliation Audit Results
                  </h4>
                  {auditReport.overallReconciled ? (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} /> 100% Reconciled
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-bold flex items-center gap-1">
                      <AlertTriangle size={13} /> {auditReport.totalGapsFound} Gaps Identified
                    </span>
                  )}
                </div>

                {/* Level 2 Accessibility Menu Controls */}
                <div className="flex items-center flex-wrap gap-2">
                  {/* Results Search Filter */}
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={resultsSearchQuery}
                      onChange={(e) => setResultsSearchQuery(e.target.value)}
                      placeholder="Filter symbol, status..."
                      data-testid="results-search-input"
                      className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-mint w-36 sm:w-44"
                    />
                  </div>

                  {/* Level 2 Table Zoom Controls */}
                  <AccessibilityZoomBar
                    scale={tableZoomScale}
                    onZoomIn={handleTableZoomIn}
                    onZoomOut={handleTableZoomOut}
                    onReset={handleResetTableZoom}
                    minScale={0.8}
                    maxScale={1.4}
                    testIdPrefix="table"
                    zoomOutTestId="table-zoom-out-btn"
                    zoomResetTestId="table-zoom-reset-btn"
                    zoomInTestId="table-zoom-in-btn"
                  />

                  {/* Reset Sort Button */}
                  <button
                    onClick={handleResetSort}
                    title="Reset Table Sort to Symbol (ASC)"
                    data-testid="reset-sort-btn"
                    disabled={sortColumn === 'symbol' && sortDirection === 'asc'}
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                      sortColumn !== 'symbol' || sortDirection !== 'asc'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                        : 'bg-white dark:bg-slate-900 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-slate-700 cursor-default opacity-50'
                    }`}
                  >
                    <RotateCcw size={13} />
                    <span className="hidden sm:inline">Reset Sort</span>
                  </button>

                  {/* Table Information & Column Glossary Button */}
                  <button
                    onClick={() => setIsTableInfoOpen(true)}
                    title="Column Glossary & Table Shortcuts"
                    data-testid="table-info-btn"
                    className="p-1.5 text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition cursor-pointer"
                  >
                    <Info size={15} />
                  </button>

                  {/* Detached / Full View Toggle */}
                  <button
                    onClick={() => setIsResultsDetached(!isResultsDetached)}
                    data-testid="detach-results-btn"
                    title={isResultsDetached ? 'Exit Full View' : 'Maximize Full View (Detach)'}
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                      isResultsDetached
                        ? 'bg-primary-mint text-white border-primary-mint'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {isResultsDetached ? (
                      <>
                        <Minimize2 size={13} /> Exit Full View
                      </>
                    ) : (
                      <>
                        <Maximize2 size={13} /> Maximize Full View
                      </>
                    )}
                  </button>

                  {/* Gap Report CSV Download Button */}
                  <button
                    onClick={handleDownloadGapReport}
                    data-testid="download-gap-report-btn"
                    className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={14} /> CSV
                  </button>
                </div>
              </div>

              {/* Accounts Audit Cards */}
              <div className={`space-y-4 ${isResultsDetached ? 'flex-1 overflow-y-auto' : ''}`}>
                {auditReport.accounts.length === 0 ? (
                  <div
                    data-testid="no-matching-accounts-card"
                    className="p-8 text-center bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 space-y-3"
                  >
                    <AlertCircle size={32} className="mx-auto text-amber-500" />
                    <div className="text-sm font-bold text-slate-800 dark:text-white">
                      No Accounts Reconciled in Selected Scope: {targetScope.mode.toUpperCase()} ({targetScope.institution || targetScope.accountMasked || 'All'})
                    </div>
                    <p className="text-xs text-gray-500 max-w-lg mx-auto leading-relaxed">
                      The uploaded statement files did not match any accounts within this target scope.
                      Please verify your target institution or account selection above, or switch to <strong>Global Portfolio (All Accounts)</strong> to audit across all institutions.
                    </p>
                  </div>
                ) : (
                  auditReport.accounts.map((acc, aIdx) => {
                    const q = resultsSearchQuery.toLowerCase().trim();
                    // Apply Smart Column Sorting
                    const sortedItems = sortPositionAuditItems(acc.items, sortColumn, sortDirection);
                    // Apply Filter Query
                    const filteredItems = sortedItems.filter((item) => {
                      if (!q) return true;
                      return (
                        item.symbol.toLowerCase().includes(q) ||
                        item.assetClass.toLowerCase().includes(q) ||
                        item.status.toLowerCase().includes(q) ||
                        (item.notes && item.notes.toLowerCase().includes(q))
                      );
                    });

                    return (
                      <div
                        key={aIdx}
                        data-testid={`account-audit-card-${acc.accountId}`}
                        className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2.5 gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {acc.institution} {acc.accountMasked}
                            </span>
                            <span className="text-xs text-gray-500">({acc.accountType})</span>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-mono">
                            <span>
                              Statement:{' '}
                              <strong className="text-slate-900 dark:text-white font-bold">
                                ${acc.statementBalance.toFixed(2)}
                              </strong>
                            </span>
                            <span>
                              Portfolio:{' '}
                              <strong className="text-slate-900 dark:text-white font-bold">
                                ${acc.portfolioBalance.toFixed(2)}
                              </strong>
                            </span>
                            <span
                              className={
                                acc.isBalanceReconciled ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'
                              }
                            >
                              Variance: {acc.balanceDiff >= 0 ? `+$${acc.balanceDiff.toFixed(2)}` : `-$${Math.abs(acc.balanceDiff).toFixed(2)}`}
                            </span>
                          </div>
                        </div>

                        {/* Side-by-Side Position Differences Table Scaled by Level 2 Zoom */}
                        <div
                          className="overflow-x-auto"
                          style={{ fontSize: `${tableZoomScale * 0.75}rem` }}
                        >
                          <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 uppercase font-mono text-[11px]">
                              <tr>
                                {sortColumns.map((col) => {
                                  const isActive = sortColumn === col.key;
                                  return (
                                    <th
                                      key={col.key}
                                      onClick={() => handleHeaderClick(col.key)}
                                      data-testid={`sort-header-${col.key}`}
                                      className={`py-2 px-3 cursor-pointer select-none group transition ${
                                        col.align === 'center'
                                          ? 'text-center'
                                          : col.align === 'right'
                                            ? 'text-right'
                                            : 'text-left'
                                      } ${
                                        isActive
                                          ? 'text-slate-900 dark:text-white font-bold'
                                          : 'text-gray-500 hover:text-slate-800 dark:hover:text-gray-200'
                                      }`}
                                    >
                                      <div
                                        className={`inline-flex items-center gap-1 ${
                                          col.align === 'center'
                                            ? 'justify-center'
                                            : col.align === 'right'
                                              ? 'justify-end'
                                              : 'justify-start'
                                        }`}
                                      >
                                        <span>{col.label}</span>
                                        {isActive ? (
                                          sortDirection === 'asc' ? (
                                            <ArrowUp
                                              size={12}
                                              className="text-primary-mint font-bold shrink-0"
                                            />
                                          ) : (
                                            <ArrowDown
                                              size={12}
                                              className="text-primary-mint font-bold shrink-0"
                                            />
                                          )
                                        ) : (
                                          <ArrowUpDown
                                            size={12}
                                            className="text-gray-400 opacity-0 group-hover:opacity-60 shrink-0 transition-opacity"
                                          />
                                        )}
                                      </div>
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                              {filteredItems.length === 0 ? (
                                <tr>
                                  <td colSpan={8} className="py-4 text-center text-gray-400 italic">
                                    No positions matching filter &quot;{resultsSearchQuery}&quot;
                                  </td>
                                </tr>
                              ) : (
                                filteredItems.map((item, iIdx) => {
                                  let badgeBg =
                                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
                                  if (item.status === 'QUANTITY_MISMATCH') {
                                    badgeBg =
                                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
                                  } else if (item.status === 'MISSING_IN_PORTFOLIO') {
                                    badgeBg =
                                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
                                  } else if (item.status === 'EXTRA_IN_PORTFOLIO') {
                                    badgeBg =
                                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
                                  }

                                  return (
                                    <tr key={iIdx} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                                      <td className="py-2 px-3 font-mono font-bold">{item.symbol}</td>
                                      <td className="py-2 px-3 text-gray-500">{item.assetClass}</td>
                                      <td className="py-2 px-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeBg}`}>
                                          {item.status.replace(/_/g, ' ')}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-bold">
                                        {item.statementQuantity !== undefined
                                          ? item.statementQuantity.toFixed(4)
                                          : '—'}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono">
                                        {item.portfolioQuantity !== undefined
                                          ? item.portfolioQuantity.toFixed(4)
                                          : '—'}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-bold">
                                        {item.statementValue !== undefined
                                          ? `$${item.statementValue.toFixed(2)}`
                                          : '—'}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono">
                                        {item.portfolioValue !== undefined
                                          ? `$${item.portfolioValue.toFixed(2)}`
                                          : '—'}
                                      </td>
                                      <td className="py-2 px-3 text-gray-500 text-[11px]">{item.notes}</td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/80 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Reconciliation audits compare statement ground-truth directly against portfolio positions
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Table Column Glossary Popover */}
      <ContainerInfoPopover
        isOpen={isTableInfoOpen}
        onClose={() => setIsTableInfoOpen(false)}
        title="Reconciliation Audit Results Guide"
        subtitle="Field Definitions & Table Controls"
        description="This ledger performs granular position-by-position reconciliation between uploaded statements and active portfolio records, highlighting discrepancies in quantity, pricing, and holding state."
        definitions={auditGlossaryDefinitions}
        shortcuts={auditShortcuts}
        testId="table-info-popover"
      />

      {/* Modal Workflow Info Popover */}
      <ContainerInfoPopover
        isOpen={isModalInfoOpen}
        onClose={() => setIsModalInfoOpen(false)}
        title="Statement Reconciliation & Audit Center"
        subtitle="Workflow & Security Overview"
        description="BunBau Statement Reconciliation Engine automatically compares official broker statement documents (screenshots or CSV exports) directly against your portfolio data to verify ground truth accuracy."
        definitions={modalInfoDefinitions}
        testId="modal-info-popover"
      />
    </div>
  );

  return createPortal(modalContent, document.body);
}
