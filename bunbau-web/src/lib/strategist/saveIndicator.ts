export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface SaveIndicatorDescriptor {
  label: string;
  className: string;
  isRetry: boolean;
}

export function getSaveIndicatorDescriptor(state: SaveState, savedAt: string, hasSavedItems?: boolean): SaveIndicatorDescriptor {
  if (state === 'idle') {
    if (hasSavedItems) {
      return { label: savedAt ? `Saved ✓ ${savedAt}` : 'Saved ✓ Cloud synced', className: 'text-[11px] text-emerald-500 font-medium', isRetry: false };
    }
    return { label: 'Auto-save on', className: 'text-[11px] text-slate-400', isRetry: false };
  }
  if (state === 'saving') return { label: 'Saving…', className: 'text-[11px] text-slate-400', isRetry: false };
  if (state === 'error') return { label: 'Not saved. Retry', className: 'text-[11px] text-amber-500 underline', isRetry: true };
  return { label: `Saved ✓ ${savedAt || 'Cloud synced'}`, className: 'text-[11px] text-emerald-500 font-medium', isRetry: false };
}
