import { PortfolioContextInput } from './memory';

export interface TerminalLogStep {
  delay: number;
  prefix: string;
  text: string;
  color?: string;
}

export function buildTerminalScript(context?: PortfolioContextInput): TerminalLogStep[] {
  const totalNW = context?.totalValue
    ? `$${context.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '$2,034,759.91';
  const currentApy = context?.currentApy !== undefined ? `${context.currentApy.toFixed(2)}%` : '1.53%';
  const targetApy = context?.targetApy !== undefined ? `${context.targetApy.toFixed(2)}%` : '10.00%';
  const gap =
    context?.targetApy !== undefined && context?.currentApy !== undefined
      ? `-${(context.targetApy - context.currentApy).toFixed(2)}%`
      : '-8.47%';
  const risk = context?.risk || 'Moderate';
  const idleCash = context?.idleCash !== undefined
    ? `$${context.idleCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '$8,764.95';
  const ccCount = context?.topHoldings?.filter((h) => h.canSellCoveredCall).length || 4;

  return [
    { delay: 100, prefix: '[INIT]', text: 'Initializing BunBau Yield Strategy Engine v5.5...' },
    { delay: 500, prefix: '[INGEST]', text: `Loading active portfolio state: Net Worth ${totalNW}...` },
    { delay: 1100, prefix: '[ANALYZE]', text: `Evaluating Current Blended APY: ${currentApy} vs Target APY: ${targetApy} (Gap: ${gap})` },
    { delay: 1800, prefix: '[CASH]', text: `Analyzing idle cash drag: ${idleCash} available for redeployment...` },
    { delay: 2500, prefix: '[OPTIONS]', text: `Scanning equity inventory for Covered Call eligibility: ${ccCount} eligible candidate lots found.` },
    { delay: 3300, prefix: '[RISK]', text: `Applying ${risk} risk tolerance constraints and fixed income liquidity filters...` },
    { delay: 4200, prefix: '[GATEWAY]', text: 'Dispatching prompt to AI Strategist via Gateway Router (Tier-1 Pro model)...' },
    { delay: 5400, prefix: '[SYNTHESIS]', text: 'Synthesizing CFA-grade action waterfall & asset allocation rebalancing matrix...' },
    { delay: 6800, prefix: '[VALIDATE]', text: 'Verifying JSON schema integrity, APY attribution math, and execution steps...' },
    { delay: 8200, prefix: '[COMPILE]', text: 'Compiling executive summary, tactical trade actions, and interactive charts...' },
    { delay: 9600, prefix: '[STREAM]', text: 'Awaiting final token stream verification from AI gateway...' },
  ];
}

export function formatLogsForClipboard(logs: { timestamp: string; prefix: string; text: string }[]): string {
  return logs.map((l) => `${l.timestamp} ${l.prefix} ${l.text}`).join('\n');
}
