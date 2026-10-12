'use client';

import React, { useState, useEffect } from 'react';
import { Layers, RotateCcw, ShieldCheck, AlertCircle, Calendar, ArrowRight, History } from 'lucide-react';
import type { AccountVersionRecord } from '../../lib/types/ingestion';

interface AccountVersionsRollbackProps {
  userId?: string;
  onRollbackComplete?: () => void;
}

export function AccountVersionsRollback({
  userId = 'demo-user',
  onRollbackComplete,
}: AccountVersionsRollbackProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedAccountKey, setSelectedAccountKey] = useState<string>('');
  const [versions, setVersions] = useState<AccountVersionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [rollbackSuccess, setRollbackSuccess] = useState<string | null>(null);
  const [rollbackError, setRollbackError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/ingest/history?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        if (data.logs && data.logs.length > 0 && data.logs[0].accountKey) {
          setSelectedAccountKey(data.logs[0].accountKey);
          fetchVersionsForAccount(data.logs[0].accountKey);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch history logs:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchVersionsForAccount = async (accKey: string) => {
    try {
      const res = await fetch(`/api/v1/ingest/history?userId=${userId}&accountKey=${accKey}`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
      }
    } catch (e) {
      console.warn('Failed to fetch account versions:', e);
    }
  };

  const handleRollback = async (ver: AccountVersionRecord) => {
    if (!confirm(`Are you sure you want to rollback to Version ${ver.version}? This will restore its holdings atomically.`)) {
      return;
    }

    setRollbackSuccess(null);
    setRollbackError(null);

    try {
      const res = await fetch('/api/v1/ingest/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          accountKey: ver.accountKey,
          targetVersionRecord: ver,
          currentAccount: ver.payload,
        }),
      });

      if (!res.ok) {
        throw new Error('Rollback failed');
      }

      setRollbackSuccess(`Successfully rolled back to Version ${ver.version}!`);
      if (onRollbackComplete) {
        onRollbackComplete();
      }
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setRollbackError((err as Error).message || 'Failed to perform rollback');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="text-primary-violet" size={20} />
            Account Ingestion Versions & 1-Click Rollback
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Every ingestion event generates an immutable snapshot. Restore prior states without data loss.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 transition"
        >
          Refresh
        </button>
      </div>

      {rollbackSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
          <ShieldCheck size={16} />
          <span>{rollbackSuccess}</span>
        </div>
      )}

      {rollbackError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={16} />
          <span>{rollbackError}</span>
        </div>
      )}

      {logs.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-xs">
          <History size={32} className="mx-auto mb-2 opacity-50" />
          No ingestion version history records found yet. Ingest a CSV or screenshot to create Version 1.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="divide-y divide-gray-100 dark:divide-slate-800 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {logs.map((log, idx) => (
              <div
                key={log.ingestionId || idx}
                className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {log.accountKey || 'Brokerage Account'}
                    </span>
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                      {log.sourceType || 'MERGED'}
                    </span>
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      {log.status || 'COMMITTED'}
                    </span>
                  </div>
                  <div className="text-gray-400 mt-1 flex items-center gap-2">
                    <Calendar size={12} />
                    <span>{log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Recent'}</span>
                    <span>•</span>
                    <span>{log.positionCount || 0} holdings</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {log.totalValue && (
                    <span className="font-bold text-slate-900 dark:text-white">
                      ${Number(log.totalValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
