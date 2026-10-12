'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StrategyPackage } from '../../components/strategy/StrategyReportPanel';
import type { ActionStatus } from './reportSchema';

export const REPORT_CHANNEL = 'bunbau-strategy-report';
export const REPORT_WINDOW_NAME = 'bunbau-report-window';
export const REPORT_PATH = '/strategy/report';

export type ToDetached = { type: 'package'; pkg: StrategyPackage };
export type ToMain = { type: 'ready' } | { type: 'closed' } | { type: 'status'; reportId: string; actionId: string; status: ActionStatus };

/** Main-window side of the detached report. Closing the window returns the report to the page. */
export function useDetachedReport(pkg: StrategyPackage, onStatus: (reportId: string, actionId: string, s: ActionStatus) => void) {
  const [detached, setDetached] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const winRef = useRef<Window | null>(null);
  const chanRef = useRef<BroadcastChannel | null>(null);
  const pkgRef = useRef(pkg);
  pkgRef.current = pkg;
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  const post = useCallback(() => {
    chanRef.current?.postMessage({ type: 'package', pkg: pkgRef.current } satisfies ToDetached);
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(REPORT_CHANNEL);
    chanRef.current = ch;
    ch.onmessage = (e: MessageEvent<ToMain>) => {
      const m = e.data;
      if (m.type === 'ready') post();
      else if (m.type === 'closed') setDetached(false);
      else if (m.type === 'status') statusRef.current(m.reportId, m.actionId, m.status);
    };
    return () => ch.close();
  }, [post]);

  // keep the detached copy in sync
  useEffect(() => {
    if (detached) post();
  }, [pkg, detached, post]);

  // detect the window being closed by the browser (X button)
  useEffect(() => {
    if (!detached) return;
    const t = setInterval(() => {
      if (winRef.current && winRef.current.closed) {
        winRef.current = null;
        setDetached(false);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [detached]);

  const detach = useCallback(() => {
    const w = window.open(REPORT_PATH, REPORT_WINDOW_NAME, 'width=1200,height=900,menubar=no,toolbar=no');
    if (!w) {
      setBlocked(true);
      return false;
    }
    setBlocked(false);
    winRef.current = w;
    setDetached(true);
    return true;
  }, []);

  const bringBack = useCallback(() => {
    winRef.current?.close();
    winRef.current = null;
    setDetached(false);
  }, []);

  return { detached, blocked, detach, bringBack };
}
