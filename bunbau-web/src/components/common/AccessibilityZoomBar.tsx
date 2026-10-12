'use client';

import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export interface AccessibilityZoomBarProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  minScale?: number;
  maxScale?: number;
  step?: number;
  /**
   * 'modal': Standard modal toolbar with percentage display (e.g. 100%)
   * 'compact': Card / applet header with compact layout
   */
  variant?: 'modal' | 'compact';
  /**
   * Prefix for data-testid attributes (e.g. 'calendar-sync', 'applet', 'drilldown')
   */
  testIdPrefix?: string;
  zoomOutTestId?: string;
  zoomResetTestId?: string;
  zoomInTestId?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Universal Accessibility Zoom Bar for BunBau
 *
 * Implements the canonical UX standard:
 * [ Zoom Out (-) ]  [ Scale % / Click to Reset ]  [ Zoom In (+) ]
 *
 * Adheres to standard Left-to-Right (LTR) horizontal number line conventions:
 * - Left decreases zoom value ( - )
 * - Center shows current percentage & 1-click reset to 100%
 * - Right increases zoom value ( + )
 */
export function AccessibilityZoomBar({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
  minScale = 0.7,
  maxScale = 1.5,
  variant = 'modal',
  testIdPrefix,
  zoomOutTestId,
  zoomResetTestId,
  zoomInTestId,
  className = '',
  disabled = false,
}: AccessibilityZoomBarProps) {
  const isMin = scale <= minScale + 0.005;
  const isMax = scale >= maxScale - 0.005;
  const percentText = `${Math.round(scale * 100)}%`;

  const btnPrefix = testIdPrefix ? `${testIdPrefix}-zoom` : 'zoom';

  return (
    <div
      role="toolbar"
      aria-label="Zoom and accessibility scaling controls"
      className={`inline-flex items-center bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-0.5 select-none ${className}`}
      data-testid={testIdPrefix ? `${testIdPrefix}-zoom-bar` : 'accessibility-zoom-bar'}
    >
      {/* 1. Left Button: Zoom Out (-) */}
      <button
        type="button"
        onClick={onZoomOut}
        disabled={disabled || isMin}
        title="Zoom Out (-)"
        aria-label="Zoom out"
        data-testid={zoomOutTestId || `${btnPrefix}-out`}
        className={`p-1 text-gray-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition ${
          variant === 'compact' ? 'p-1' : 'p-1.5'
        } ${isMin || disabled ? 'opacity-35 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent' : 'cursor-pointer'}`}
      >
        <ZoomOut size={variant === 'compact' ? 13 : 14} />
      </button>

      {/* 2. Center Button: Scale % / 1-Click Reset to 100% */}
      <button
        type="button"
        onClick={onReset}
        disabled={disabled}
        title="Reset Zoom (100%)"
        aria-label={`Current scale is ${percentText}. Click to reset to 100%`}
        data-testid={zoomResetTestId || `${btnPrefix}-reset`}
        className={`px-1.5 py-0.5 text-xs font-mono font-bold text-gray-700 dark:text-gray-300 hover:text-primary-mint transition flex items-center justify-center gap-1 ${
          variant === 'compact' ? 'min-w-[36px] text-[11px]' : 'min-w-[44px]'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span>{percentText}</span>
      </button>

      {/* 3. Right Button: Zoom In (+) */}
      <button
        type="button"
        onClick={onZoomIn}
        disabled={disabled || isMax}
        title="Zoom In (+)"
        aria-label="Zoom in"
        data-testid={zoomInTestId || `${btnPrefix}-in`}
        className={`p-1 text-gray-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition ${
          variant === 'compact' ? 'p-1' : 'p-1.5'
        } ${isMax || disabled ? 'opacity-35 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent' : 'cursor-pointer'}`}
      >
        <ZoomIn size={variant === 'compact' ? 13 : 14} />
      </button>
    </div>
  );
}
