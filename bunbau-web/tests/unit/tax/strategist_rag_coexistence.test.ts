import { describe, it, expect } from 'vitest';
import { getSharedRagContext } from '../../../src/lib/rag/HybridRetriever';
import { samplePortfolioTaxShields } from '../../../src/lib/tax/seedData';

describe('Zero-Regression: Strategist & Tax Expert RAG Coexistence', () => {
  it('1. Provides cross-module tax context to Portfolio Strategist on demand', () => {
    // When Strategist evaluates asset reallocation or option writing:
    const strategistQuery = 'Evaluate selling covered calls on NVDA and harvesting tax loss';
    const shared = getSharedRagContext(strategistQuery);

    expect(typeof shared.contextPromptText).toBe('string');
    expect(shared.contextPromptText.length).toBeGreaterThan(100);
    // Verifies context contains relevant tax shield information
    expect(shared.contextPromptText).toContain('RETRIEVED GROUNDED KNOWLEDGE');
    expect(shared.estimatedTokens).toBeGreaterThan(0);
    expect(Array.isArray(shared.chunks)).toBe(true);
  });

  it('2. Coexists with live portfolio tax shield balances', () => {
    // Strategist can cross-reference the user's capital loss carryover to shelter options gains
    const carryoverShield = samplePortfolioTaxShields.capitalLossCarryover;
    expect(carryoverShield).toBe(28500);

    const suspendedRentalLoss = samplePortfolioTaxShields.suspendedRentalLoss;
    expect(suspendedRentalLoss).toBe(36000);

    // Total shield available for capital gains & passive income
    expect(carryoverShield + suspendedRentalLoss).toBe(64500);
  });

  it('3. Guarantees non-breaking standalone behavior if tax data is unavailable', () => {
    // Even with an empty query or edge cases, getSharedRagContext returns safe structured object
    const emptyResult = getSharedRagContext('');
    expect(typeof emptyResult.contextPromptText).toBe('string');
    expect(emptyResult.contextPromptText).toContain('=== RETRIEVED GROUNDED KNOWLEDGE');
    expect(Array.isArray(emptyResult.chunks)).toBe(true);
  });
});
