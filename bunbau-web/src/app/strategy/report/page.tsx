'use client';

import React, { useEffect, useState } from 'react';
import { StrategyPackage, StrategyReportPanel } from '../../../components/strategy/StrategyReportPanel';
import { REPORT_CHANNEL, ToDetached, ToMain } from '../../../lib/strategist/useDetachedReport';

/** Detached report window: a live copy of the Strategy report. Close it to return to the app. */
export default function DetachedReportPage() {
  const [pkg, setPkg] = useState<StrategyPackage | null>(null);
  const [chan, setChan] = useState<BroadcastChannel | null>(null);

  useEffect(() => {
    const ch = new BroadcastChannel(REPORT_CHANNEL);
    setChan(ch);
    ch.onmessage = (e: MessageEvent<ToDetached>) => {
      if (e.data.type === 'package') setPkg(e.data.pkg);
    };
    const send = (m: ToMain) => ch.postMessage(m);
    send({ type: 'ready' });
    const onUnload = () => send({ type: 'closed' });
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      ch.close();
    };
  }, []);

  const close = () => {
    chan?.postMessage({ type: 'closed' } satisfies ToMain);
    window.close();
  };

  return (
    <main className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-5" data-testid="detached-report">
      <h1 className="text-lg font-bold mb-2">Yield Strategy Report</h1>
      {pkg ? (
        <StrategyReportPanel
          pkg={pkg}
          heightClass="h-[85vh]"
          onCloseDetached={close}
          onStatus={(actionId, status) => pkg.reportId && chan?.postMessage({ type: 'status', reportId: pkg.reportId, actionId, status } satisfies ToMain)}
        />
      ) : (
        <p className="text-sm text-slate-500">Waiting for the report from the BunBau window… If this stays empty, close this window and click Detach again.</p>
      )}
    </main>
  );
}
