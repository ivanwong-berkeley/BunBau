'use client';

import React, { useState } from 'react';
import { AppletContainer } from './AppletContainer';
import { usePortfolio } from '../contexts/PortfolioContext';
import { PortfolioSnapshot, ImportRecord, CanonicalPosition } from '../lib/portfolio/types';
import { Camera, History as HistoryIcon, UploadCloud, Eye, Trash2, Calendar, ShieldAlert, ArrowLeft, Image as ImageIcon, Layers } from 'lucide-react';
import { AssetAllocationChart, AssetAllocationTable, EquitiesChart, OptionsChart } from './DashboardCharts';
import { flattenPositions, netWorth, blendedApy } from '../lib/portfolio/selectors';
import { HistoryDeleteScope, expectedHistoryDeletePhrase, matchesHistoryDeletePhrase } from '../lib/portfolio/deletePhrase';
import { useTableSort } from '../lib/utils/tableSort';
import { SortableHeader, StaticTh } from './common/SortableHeader';
import { TableSortBar } from './common/SmartSortBar';
import { SmartTable } from './common/SmartTable';
import { SnapshotPositionsTable } from './SnapshotPositionsTable';
import { AccountVersionsRollback } from './history/AccountVersionsRollback';

interface HistoryViewProps {
  onCaptureSnapshot?: () => Promise<void>;
  isCapturingSnapshot?: boolean;
}

export function HistoryView({ onCaptureSnapshot, isCapturingSnapshot }: HistoryViewProps) {
  const { snapshots, imports, isDemo, removeSnapshots, removeUploads } = usePortfolio();
  const [subTab, setSubTab] = useState<'snapshots' | 'uploads' | 'versions'>('snapshots');

  // Viewing a specific snapshot or upload review
  const [viewingSnapshot, setViewingSnapshot] = useState<PortfolioSnapshot | null>(null);
  const [viewingImport, setViewingImport] = useState<ImportRecord | null>(null);

  // Institution filter for Uploads tab
  const [instFilter, setInstFilter] = useState('ALL');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'snapshots' | 'uploads'>('snapshots');
  const [deleteScope, setDeleteScope] = useState<HistoryDeleteScope>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Extract institutions present in imports
  const uploadInstitutions = [...new Set(imports.map(i => i.institution))].sort();
  const filteredImports = instFilter === 'ALL' ? imports : imports.filter(i => i.institution === instFilter);

  // Snapshots Table Sorting
  type SnapshotSortKey = 'createdAt' | 'institutions' | 'accountsCount' | 'positionsCount' | 'totalNetWorth';
  const {
    sortedItems: sortedSnapshots,
    sortState: snapSortState,
    toggleSort: toggleSnapSort,
    reset: resetSnapSort,
    isDefault: isSnapSortDefault,
    defaultState: snapDefaultState,
  } = useTableSort<PortfolioSnapshot, SnapshotSortKey>(
    snapshots,
    {
      createdAt: (s) => s.createdAt,
      institutions: (s) => s.institutions.join(', '),
      accountsCount: (s) => s.accountsCount,
      positionsCount: (s) => s.positionsCount,
      totalNetWorth: (s) => s.totalNetWorth,
    },
    null,
    null,
    {
      totalNetWorth: 'desc',
      createdAt: 'desc',
    }
  );

  // Uploads Table Sorting
  type UploadSortKey = 'createdAt' | 'institution' | 'maskedAccount' | 'positionCount' | 'storagePaths';
  const {
    sortedItems: sortedUploads,
    sortState: uploadSortState,
    toggleSort: toggleUploadSort,
    reset: resetUploadSort,
    isDefault: isUploadSortDefault,
    defaultState: uploadDefaultState,
  } = useTableSort<ImportRecord, UploadSortKey>(
    filteredImports,
    {
      createdAt: (i) => i.createdAt,
      institution: (i) => i.institution,
      maskedAccount: (i) => i.maskedAccount,
      positionCount: (i) => i.positionCount,
      storagePaths: (i) => i.storagePaths?.length || 0,
    },
    null,
    null,
    {
      createdAt: 'desc',
      positionCount: 'desc',
    }
  );

  // Available dates for range deletion
  const snapshotDates = [...new Set(snapshots.map(s => s.createdAt.slice(0, 10)))].sort();
  const importDates = [...new Set(imports.map(i => i.createdAt.slice(0, 10)))].sort();
  const availableDates = deleteTarget === 'snapshots' ? snapshotDates : importDates;

  const expectedPhrase = expectedHistoryDeletePhrase(deleteScope, fromDate, toDate);
  const isPhraseMatch = matchesHistoryDeletePhrase(confirmPhrase, deleteScope, fromDate, toDate) && (deleteScope === 'all' || (!!fromDate && !!toDate));

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      if (deleteTarget === 'snapshots') {
        await removeSnapshots(deleteScope, fromDate, toDate);
        if (viewingSnapshot) setViewingSnapshot(null);
      } else {
        await removeUploads(deleteScope, fromDate, toDate);
        if (viewingImport) setViewingImport(null);
      }
      setShowDeleteModal(false);
      setConfirmPhrase('');
    } catch (e: any) {
      setDeleteError(e?.message || 'Delete failed.');
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Snapshot Inspection Sub-View ---
  if (viewingSnapshot) {
    const snapPositions: CanonicalPosition[] = flattenPositions(viewingSnapshot.accounts);
    const snapNetWorth = viewingSnapshot.totalNetWorth;
    const snapApy = blendedApy(snapPositions);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewingSnapshot(null)}
              className="p-2 hover:bg-amber-500/20 rounded-xl transition text-amber-700 dark:text-amber-400"
              title="Return to Snapshot List"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
                Viewing Historical Snapshot (Read-Only)
              </p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {new Date(viewingSnapshot.createdAt).toLocaleString()} — {viewingSnapshot.id}
              </h3>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Captured Net Worth</div>
            <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
              ${snapNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AppletContainer
            title={`Asset Allocation — Snapshot ${viewingSnapshot.createdAt.slice(0, 10)}`}
            infoDescription="Point-in-time asset allocation reconstructed from the captured snapshot."
            tableComponent={<AssetAllocationTable positions={snapPositions} />}
          >
            <AssetAllocationChart positions={snapPositions} />
          </AppletContainer>

          <AppletContainer
            title={`Equities Portfolio — Snapshot ${viewingSnapshot.createdAt.slice(0, 10)}`}
            infoDescription="Stocks and ETFs recorded in this point-in-time snapshot."
          >
            <EquitiesChart positions={snapPositions} />
          </AppletContainer>
        </div>

        <AppletContainer
          title="Captured Account Details"
          infoDescription="Exact account balances and holdings frozen in this snapshot."
        >
          <div className="p-4 space-y-4">
            {viewingSnapshot.accounts.map((acc) => (
              <div key={acc.id} className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{acc.institution}</span>
                    <span className="ml-2 text-xs font-mono text-gray-400">({acc.maskedAccount})</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {acc.positions.length} holdings
                  </span>
                </div>
                <SnapshotPositionsTable positions={acc.positions} />
              </div>
            ))}
          </div>
        </AppletContainer>
      </div>
    );
  }

  // --- Upload Inspection Sub-View ---
  if (viewingImport) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewingImport(null)}
              className="p-2 hover:bg-blue-500/20 rounded-xl transition text-blue-700 dark:text-blue-400"
              title="Return to Uploads History"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">
                Upload Audit Record (Read-Only)
              </p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {viewingImport.institution} ({viewingImport.maskedAccount}) — {new Date(viewingImport.createdAt).toLocaleString()}
              </h3>
            </div>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {viewingImport.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Upload Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <h4 className="text-xs font-bold uppercase text-gray-400">Audit Information</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Import ID:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{viewingImport.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Institution:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{viewingImport.institution}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Masked Account:</span>
                <span className="font-mono text-slate-900 dark:text-white">{viewingImport.maskedAccount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Extracted Holdings:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewingImport.positionCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Stored Screenshots:</span>
                <span className="text-slate-900 dark:text-white">{viewingImport.storagePaths?.length || 0}</span>
              </div>
            </div>

            {viewingImport.storagePaths?.length > 0 && (
              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2">
                <p className="text-[11px] text-gray-400 font-semibold uppercase">Archived Screenshots:</p>
                <div className="space-y-1">
                  {viewingImport.storagePaths.map((p, idx) => (
                    <div key={idx} className="text-[11px] font-mono text-blue-600 dark:text-blue-400 truncate flex items-center gap-1.5">
                      <ImageIcon size={12} /> {p.split('/').pop()}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="col-span-2">
            <AppletContainer
              title="Approved Extracted Holdings"
              infoDescription="The exact rows reviewed and approved by the user during this import."
            >
              <div className="p-4 overflow-x-auto">
                <SmartTable<{ symbol: string; category?: string; value: number; metadata?: { expiry?: string }; maturityDate?: string }>
                  tableId="approved-holdings"
                  title="Approved Extracted Holdings"
                  infoDescription="The exact rows reviewed and approved by the user during this import."
                  density="compact"
                  rows={viewingImport.approvedExtraction.positions}
                  columns={[
                    { key: 'symbol', label: 'Symbol', render: (p) => <span className="font-medium">{p.symbol}</span> },
                    { key: 'category', label: 'Category' },
                    {
                      key: 'expiry',
                      label: 'Expiry / Maturity',
                      sortValue: (p) => p.metadata?.expiry || p.maturityDate,
                      render: (p) => <span className="font-mono text-gray-400">{p.metadata?.expiry || p.maturityDate || '—'}</span>,
                    },
                    {
                      key: 'value',
                      label: 'Value',
                      align: 'right',
                      preferredDir: 'desc',
                      render: (p) => <span className="font-semibold">${p.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
                    },
                  ]}
                />
              </div>
            </AppletContainer>
          </div>
        </div>
      </div>
    );
  }

  // --- Main History Views ---
  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation Ribbon */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setSubTab('snapshots')}
            data-testid="history-tab-snapshots"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              subTab === 'snapshots'
                ? 'bg-primary-violet text-white shadow-sm'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
          >
            <HistoryIcon size={16} /> Snapshots ({snapshots.length})
          </button>
          <button
            onClick={() => setSubTab('uploads')}
            data-testid="history-tab-uploads"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              subTab === 'uploads'
                ? 'bg-primary-violet text-white shadow-sm'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
          >
            <UploadCloud size={16} /> Uploads Audit ({imports.length})
          </button>
          <button
            onClick={() => setSubTab('versions')}
            data-testid="history-tab-versions"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              subTab === 'versions'
                ? 'bg-primary-violet text-white shadow-sm'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
          >
            <Layers size={16} /> Account Versions & Rollback
          </button>
        </div>

        <div className="flex items-center gap-3">
          {subTab === 'uploads' && uploadInstitutions.length > 0 && (
            <select
              value={instFilter}
              onChange={(e) => setInstFilter(e.target.value)}
              className="bg-gray-100 dark:bg-slate-800 text-xs px-3 py-2 rounded-xl border-none text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="ALL">All Brokerages</option>
              {uploadInstitutions.map((inst) => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          )}

          {((subTab === 'snapshots' && snapshots.length > 0) || (subTab === 'uploads' && imports.length > 0)) && (
            <button
              onClick={() => {
                setDeleteTarget(subTab);
                setDeleteScope('all');
                setFromDate(availableDates[0] || '');
                setToDate(availableDates[availableDates.length - 1] || '');
                setConfirmPhrase('');
                setDeleteError('');
                setShowDeleteModal(true);
              }}
              data-testid="open-history-delete-modal"
              className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-lg border border-rose-200 dark:border-rose-900/50 transition flex items-center gap-1.5"
            >
              <Trash2 size={14} /> Clear {subTab === 'snapshots' ? 'Snapshots' : 'Uploads'}
            </button>
          )}
        </div>
      </div>

      {/* Snapshots Tab */}
      {subTab === 'snapshots' && (
        <AppletContainer
          title="Snapshot History"
          infoDescription="An immutable chronological record of portfolio snapshots, capturing point-in-time net worth and account holdings."
        >
          <div className="p-4">
            {snapshots.length === 0 ? (
              <div className="p-12 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl m-2">
                <div className="text-center text-gray-400">
                  <HistoryIcon size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="font-semibold text-base text-slate-800 dark:text-slate-200">No Snapshots Captured Yet</p>
                  <p className="text-xs text-gray-500 mt-1 mb-4">Click "Capture Snapshot" in the header anytime to freeze your portfolio state.</p>
                  {onCaptureSnapshot && (
                    <button
                      onClick={onCaptureSnapshot}
                      disabled={isDemo || isCapturingSnapshot}
                      className="px-4 py-2 bg-primary-mint text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      <Camera size={14} /> Capture First Snapshot
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <TableSortBar
                  tableId="snapshots"
                  title="Portfolio Snapshots"
                  infoDescription="Point-in-time captures of your consolidated portfolio."
                  sortState={snapSortState}
                  defaultState={snapDefaultState}
                  isDefault={isSnapSortDefault}
                  reset={resetSnapSort}
                  columns={[['createdAt', 'Date & Time'], ['institutions', 'Institutions'], ['accountsCount', 'Accounts'], ['positionsCount', 'Positions'], ['totalNetWorth', 'Captured Net Worth']]}
                  className="mb-2"
                />
                <table className="w-full text-sm text-slate-900 dark:text-slate-200" data-testid="snapshots-table">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 text-xs text-gray-500 uppercase">
                      <SortableHeader
                        label="Date & Time"
                        columnKey="createdAt"
                        currentKey={snapSortState.key}
                        currentDirection={snapSortState.direction}
                        onSort={(k) => toggleSnapSort(k as SnapshotSortKey)}
                        align="left"
                      />
                      <SortableHeader
                        label="Institutions"
                        columnKey="institutions"
                        currentKey={snapSortState.key}
                        currentDirection={snapSortState.direction}
                        onSort={(k) => toggleSnapSort(k as SnapshotSortKey)}
                        align="left"
                      />
                      <SortableHeader
                        label="Accounts"
                        columnKey="accountsCount"
                        currentKey={snapSortState.key}
                        currentDirection={snapSortState.direction}
                        onSort={(k) => toggleSnapSort(k as SnapshotSortKey)}
                        align="right"
                      />
                      <SortableHeader
                        label="Positions"
                        columnKey="positionsCount"
                        currentKey={snapSortState.key}
                        currentDirection={snapSortState.direction}
                        onSort={(k) => toggleSnapSort(k as SnapshotSortKey)}
                        align="right"
                      />
                      <SortableHeader
                        label="Captured Net Worth"
                        columnKey="totalNetWorth"
                        currentKey={snapSortState.key}
                        currentDirection={snapSortState.direction}
                        onSort={(k) => toggleSnapSort(k as SnapshotSortKey)}
                        align="right"
                      />
                      <StaticTh align="center" className="py-2.5 px-3">Action</StaticTh>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {sortedSnapshots.map((snap) => (
                      <tr key={snap.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-medium">
                          {new Date(snap.createdAt).toLocaleString()}
                          <div className="text-[11px] font-mono text-gray-400">{snap.id}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {snap.institutions.join(', ') || 'Brokerage'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono">{snap.accountsCount}</td>
                        <td className="py-3 px-3 text-right font-mono">{snap.positionsCount}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ${snap.totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => setViewingSnapshot(snap)}
                            className="px-3 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition inline-flex items-center gap-1.5"
                          >
                            <Eye size={12} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </AppletContainer>
      )}

      {/* Uploads Tab */}
      {subTab === 'uploads' && (
        <AppletContainer
          title="Uploads & Extraction History"
          infoDescription="Audit trail of all processed brokerage statements, including extracted holdings and screenshot archives."
        >
          <div className="p-4">
            {filteredImports.length === 0 ? (
              <div className="p-12 text-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl">
                <UploadCloud size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-semibold text-base text-slate-800 dark:text-slate-200">No Uploads Recorded</p>
                <p className="text-xs text-gray-500 mt-1">Brokerage statement imports will appear here after approval.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <TableSortBar
                  tableId="uploads"
                  title="Uploads & Extraction History"
                  infoDescription="Audit trail of all processed brokerage statements."
                  sortState={uploadSortState}
                  defaultState={uploadDefaultState}
                  isDefault={isUploadSortDefault}
                  reset={resetUploadSort}
                  columns={[['createdAt', 'Date & Time'], ['institution', 'Institution'], ['maskedAccount', 'Masked Account'], ['positionCount', 'Holdings'], ['storagePaths', 'Screenshots']]}
                  className="mb-2"
                />
                <table className="w-full text-sm text-slate-900 dark:text-slate-200" data-testid="uploads-table">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 text-xs text-gray-500 uppercase">
                      <SortableHeader
                        label="Date & Time"
                        columnKey="createdAt"
                        currentKey={uploadSortState.key}
                        currentDirection={uploadSortState.direction}
                        onSort={(k) => toggleUploadSort(k as UploadSortKey)}
                        align="left"
                      />
                      <SortableHeader
                        label="Institution"
                        columnKey="institution"
                        currentKey={uploadSortState.key}
                        currentDirection={uploadSortState.direction}
                        onSort={(k) => toggleUploadSort(k as UploadSortKey)}
                        align="left"
                      />
                      <SortableHeader
                        label="Masked Account"
                        columnKey="maskedAccount"
                        currentKey={uploadSortState.key}
                        currentDirection={uploadSortState.direction}
                        onSort={(k) => toggleUploadSort(k as UploadSortKey)}
                        align="left"
                      />
                      <SortableHeader
                        label="Holdings"
                        columnKey="positionCount"
                        currentKey={uploadSortState.key}
                        currentDirection={uploadSortState.direction}
                        onSort={(k) => toggleUploadSort(k as UploadSortKey)}
                        align="right"
                      />
                      <SortableHeader
                        label="Screenshots"
                        columnKey="storagePaths"
                        currentKey={uploadSortState.key}
                        currentDirection={uploadSortState.direction}
                        onSort={(k) => toggleUploadSort(k as UploadSortKey)}
                        align="right"
                      />
                      <StaticTh align="center" className="py-2.5 px-3">Action</StaticTh>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {sortedUploads.map((imp) => (
                      <tr key={imp.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-medium">
                          {new Date(imp.createdAt).toLocaleString()}
                          <div className="text-[11px] font-mono text-gray-400">{imp.id}</div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {imp.institution}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs">{imp.maskedAccount}</td>
                        <td className="py-3 px-3 text-right font-mono">{imp.positionCount}</td>
                        <td className="py-3 px-3 text-right font-mono text-gray-500">
                          {imp.storagePaths?.length || 0}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => setViewingImport(imp)}
                            className="px-3 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition inline-flex items-center gap-1.5"
                          >
                            <Eye size={12} /> Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </AppletContainer>
      )}

      {subTab === 'versions' && (
        <AppletContainer
          title="Account Ingestion Versions & Rollback"
          infoDescription="Immutable version snapshots of brokerage ingestion events with 1-click atomic rollback."
        >
          <AccountVersionsRollback />
        </AppletContainer>
      )}

      {/* Delete History Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-500/30 space-y-5">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 pb-3 border-b border-gray-100 dark:border-slate-800">
              <ShieldAlert size={24} />
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Clear {deleteTarget === 'snapshots' ? 'Snapshot History' : 'Uploads Audit'}
                </h3>
                <p className="text-xs text-gray-400">Strict typed confirmation required</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer">
                <input
                  type="radio"
                  checked={deleteScope === 'all'}
                  onChange={() => { setDeleteScope('all'); setConfirmPhrase(''); }}
                  className="w-4 h-4 text-rose-600 accent-rose-600"
                />
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">Delete All {deleteTarget === 'snapshots' ? 'Snapshots' : 'Uploads'}</p>
                  <p className="text-xs text-gray-400">Wipes all stored records in this category.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-800 rounded-xl cursor-pointer">
                <input
                  type="radio"
                  checked={deleteScope === 'range'}
                  onChange={() => { setDeleteScope('range'); setConfirmPhrase(''); }}
                  className="w-4 h-4 text-rose-600 accent-rose-600"
                />
                <div className="w-full">
                  <p className="font-bold text-sm text-slate-900 dark:text-white">Date Range (Existing Dates)</p>
                  {deleteScope === 'range' && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">From:</span>
                        <select
                          value={fromDate}
                          onChange={(e) => { setFromDate(e.target.value); setConfirmPhrase(''); }}
                          className="w-full text-xs p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800"
                        >
                          {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">To:</span>
                        <select
                          value={toDate}
                          onChange={(e) => { setToDate(e.target.value); setConfirmPhrase(''); }}
                          className="w-full text-xs p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800"
                        >
                          {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Type <strong>{expectedPhrase}</strong> to confirm:
              </p>
              <input
                type="text"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder={expectedPhrase}
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 font-mono text-xs"
              />
              {deleteError && <p className="text-xs text-rose-600">{deleteError}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!isPhraseMatch || isDeleting}
                onClick={handleDeleteConfirm}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
