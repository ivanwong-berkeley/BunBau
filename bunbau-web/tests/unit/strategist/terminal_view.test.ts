import { describe, it, expect } from 'vitest';
import { buildTerminalScript, formatLogsForClipboard } from '../../../src/lib/strategist/terminalScript';
import { PortfolioContextInput } from '../../../src/lib/strategist/memory';

describe('v5.5 Strategist Hacker-Green Animated Terminal View', () => {
  const mockContext: PortfolioContextInput = {
    totalValue: 2034759.91,
    currentApy: 1.53,
    targetApy: 10.0,
    risk: 'Moderate',
    idleCash: 8764.95,
    topHoldings: [
      { symbol: 'AAPL', value: 23000, canSellCoveredCall: true },
      { symbol: 'NVDA', value: 24000, canSellCoveredCall: true },
      { symbol: 'USDC', value: 50000, canSellCoveredCall: false },
    ],
  };

  it('buildTerminalScript formats live portfolio metrics accurately', () => {
    const steps = buildTerminalScript(mockContext);
    expect(steps.length).toBeGreaterThan(5);

    const logTexts = steps.map((s) => s.text).join('\n');
    expect(logTexts).toContain('Initializing BunBau Yield Strategy Engine v5.5');
    expect(logTexts).toContain('Net Worth $2,034,759.91');
    expect(logTexts).toContain('Current Blended APY: 1.53%');
    expect(logTexts).toContain('Target APY: 10.00%');
    expect(logTexts).toContain('Gap: -8.47%');
    expect(logTexts).toContain('$8,764.95 available for redeployment');
    expect(logTexts).toContain('2 eligible candidate lots found');
    expect(logTexts).toContain('Moderate risk tolerance constraints');
  });

  it('buildTerminalScript uses safe defaults when context is omitted', () => {
    const steps = buildTerminalScript(undefined);
    const logTexts = steps.map((s) => s.text).join('\n');
    expect(logTexts).toContain('$2,034,759.91');
    expect(logTexts).toContain('1.53%');
    expect(logTexts).toContain('10.00%');
    expect(logTexts).toContain('-8.47%');
  });

  it('formatLogsForClipboard formats timestamp, prefix, and text for copy buffer', () => {
    const logs = [
      { timestamp: '[+0.1s]', prefix: '[INIT]', text: 'Engine initialized.' },
      { timestamp: '[+0.5s]', prefix: '[INGEST]', text: 'Loaded 12 assets.' },
    ];
    const formatted = formatLogsForClipboard(logs);
    expect(formatted).toBe('[+0.1s] [INIT] Engine initialized.\n[+0.5s] [INGEST] Loaded 12 assets.');
  });
});
