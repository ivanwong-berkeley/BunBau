import { describe, it, expect } from 'vitest';
import { chunkTaxReturnsAndPortfolio } from '../../../src/lib/rag/TaxPortfolioChunker';
import { generateDeterministicEmbedding, cosineSimilarity } from '../../../src/lib/rag/VertexEmbedder';
import { retrieveKnowledgeChunks, getSharedRagContext, MAX_RAG_TOKEN_BUDGET, MAX_RAG_CHARS } from '../../../src/lib/rag/HybridRetriever';
import { TAX_RETURN_2024, TAX_RETURN_2025 } from '../../../src/lib/tax/seedData';

describe('Tax Expert: Shared RAG Knowledge Chunking & Hybrid Retrieval Engine', () => {
  it('1. Chunks multi-year tax returns and validates metadata tags and zero-plaintext SSN', () => {
    const chunks = chunkTaxReturnsAndPortfolio([TAX_RETURN_2024, TAX_RETURN_2025]);

    expect(chunks.length).toBeGreaterThanOrEqual(14);

    // Verify categories present
    const categories = new Set(chunks.map((c) => c.category));
    expect(categories.has('1040_summary')).toBe(true);
    expect(categories.has('schedule_b_yield')).toBe(true);
    expect(categories.has('schedule_d_gains')).toBe(true);
    expect(categories.has('schedule_e_rental')).toBe(true);
    expect(categories.has('deductions_salt')).toBe(true);
    expect(categories.has('state_ca')).toBe(true);
    expect(categories.has('forward_lifecycle')).toBe(true);

    // Verify zero plaintext SSN (any xxx-xx-xxxx pattern masked)
    for (const chunk of chunks) {
      expect(chunk.text).not.toMatch(/\b\d{3}-\d{2}-\d{4}\b/);
    }
  });

  it('2. Generates 768-dimensional normalized embeddings and calculates cosine similarity', () => {
    const v1 = generateDeterministicEmbedding('Social Security earnings clawback age 62');
    const v2 = generateDeterministicEmbedding('Social Security early claiming reduction');
    const v3 = generateDeterministicEmbedding('Tesla electric vehicle charging station repair');

    expect(v1.length).toBe(768);
    expect(v2.length).toBe(768);
    expect(v3.length).toBe(768);

    // Norm is normalized to 1.0
    const norm = Math.sqrt(v1.reduce((sum, val) => sum + val * val, 0));
    expect(norm).toBeCloseTo(1.0, 3);

    // Cosine similarity between related queries is higher than unrelated
    const simRelated = cosineSimilarity(v1, v2);
    const simUnrelated = cosineSimilarity(v1, v3);

    expect(simRelated).toBeGreaterThan(simUnrelated);
  });

  it('3. Enforces strict token budget (<1,500 tokens / 6,000 chars) on retrieval', () => {
    const query = 'How does Ivan avoid the IRMAA Medicare cliff and what are the carryover losses?';
    const result = retrieveKnowledgeChunks(query, { maxChunks: 6 });

    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.totalChars).toBeLessThanOrEqual(MAX_RAG_CHARS);
    expect(result.estimatedTokens).toBeLessThanOrEqual(MAX_RAG_TOKEN_BUDGET);

    // Top retrieved chunk should be relevant to IRMAA or carryovers
    const topChunk = result.chunks[0];
    expect(
      topChunk.category === 'forward_lifecycle' ||
      topChunk.category === 'schedule_d_gains' ||
      topChunk.text.toLowerCase().includes('irmaa') ||
      topChunk.text.toLowerCase().includes('loss')
    ).toBe(true);
  });

  it('4. Provides unified getSharedRagContext() formatted prompt block', () => {
    const shared = getSharedRagContext('Medicare age 65 enrollment coordination');

    expect(shared.contextPromptText).toContain('=== RETRIEVED GROUNDED KNOWLEDGE');
    expect(shared.contextPromptText).toContain('Medicare');
    expect(shared.contextPromptText.length).toBeLessThanOrEqual(MAX_RAG_CHARS + 500);
    expect(shared.estimatedTokens).toBeGreaterThan(0);
  });
});
