import { describe, it, expect } from 'vitest';
import { getSaveIndicatorDescriptor } from '../../../src/lib/strategist/saveIndicator';

describe('v5.5 Strategist SaveIndicator State Transitions', () => {
  it('renders "Auto-save on" when state is idle on initial load with no saved items', () => {
    const desc = getSaveIndicatorDescriptor('idle', '', false);
    expect(desc.label).toBe('Auto-save on');
    expect(desc.isRetry).toBe(false);
    expect(desc.className).toContain('text-slate-400');
  });

  it('renders "Saved ✓ Cloud synced" when state is idle but saved items exist', () => {
    const desc = getSaveIndicatorDescriptor('idle', '', true);
    expect(desc.label).toBe('Saved ✓ Cloud synced');
    expect(desc.isRetry).toBe(false);
    expect(desc.className).toContain('text-emerald-500');
  });

  it('renders "Saved ✓ <time>" when state is idle with explicit savedAt timestamp', () => {
    const desc = getSaveIndicatorDescriptor('idle', '09:08 PM', true);
    expect(desc.label).toBe('Saved ✓ 09:08 PM');
    expect(desc.isRetry).toBe(false);
    expect(desc.className).toContain('text-emerald-500');
  });

  it('renders "Saving…" when state is saving', () => {
    const desc = getSaveIndicatorDescriptor('saving', '');
    expect(desc.label).toBe('Saving…');
    expect(desc.isRetry).toBe(false);
    expect(desc.className).toContain('text-slate-400');
  });

  it('renders "Saved ✓ <time>" when state is saved', () => {
    const desc = getSaveIndicatorDescriptor('saved', '09:15 PM');
    expect(desc.label).toBe('Saved ✓ 09:15 PM');
    expect(desc.isRetry).toBe(false);
    expect(desc.className).toContain('text-emerald-500');
  });

  it('flags isRetry true and renders "Not saved. Retry" when state is error', () => {
    const desc = getSaveIndicatorDescriptor('error', '');
    expect(desc.label).toBe('Not saved. Retry');
    expect(desc.isRetry).toBe(true);
    expect(desc.className).toContain('text-amber-500');
  });
});
