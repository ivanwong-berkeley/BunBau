# Antigravity Task: Implement BunBau Individual Tax Return Analysis, Multi-Year Trends & Shared RAG Co-Pilot (v2.8)

## Role & Goal
You are an expert full-stack engineer and financial UI/UX architect. Your objective is to build the "Individual Tax Return Analysis & Advice" module (v2.8) for BunBau (資本寶). 
This module reuses BunBau's staged ingestion lifecycle for multi-year tax PDF uploads, provides a standard in-app PDF document viewer with accessibility controls, renders a multi-year comparative analytical dashboard, builds a shared RAG retrieval architecture for token reduction, initiates proactive conversational tax advisory sessions, and maintains persistent user tax memory.

## Mandatory Deliverables Required for Initial Turn
BEFORE modifying or writing production code, you must produce and output a downloadable, versioned delivery plan document:
`docs/BunBau_v2.8_Tax_Analysis_Implementation_Plan.md`

This plan must contain:
1. Point-to-point Requirements-to-Implementation Traceability Matrix.
2. Complete Automated Test Plan (Vitest for math, parsing, and chunking).
3. Automated Playwright UX Test Plan (Testing multi-PDF upload, document viewer, chart toggles, static diff links, and proactive chat).
4. Automated Regression Plan to ensure existing Portfolio, Calendar, Ingestion, and Strategy modules remain unaffected.
5. Versioned Release Milestones (v2.8.0 through v2.8.4) with explicit stop-points for user review and approval.

---

## Architectural & Technical Constraints
- Framework: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Chart.js (`react-chartjs-2`).
- Storage & DB: Cloud Firestore and Firebase Storage using authenticated per-user paths (`users/{userId}/tax_returns/{taxYear}`).
- Vision/PDF Engine: Google Gemini Flash for structured multimodal PDF extraction.
- Embeddings & Vector Search: Vertex AI `text-embedding-005` (768-dim) with Cloud Firestore Vector Search.
- Strategic Reasoning & Chat: Configurable LLM Orchestrator supporting Claude Sonnet / Gemini Pro with BYOK fallback.
- Security: Automatic client/server-side masking of SSN/TINs to ensure no sensitive identity tokens are logged or stored raw.
- UI Consistency: Reuse BunBau's pastel theme tokens (`bunbau-mint`, `bunbau-amber`, `bunbau-coral`, `bunbau-slate`), `AppletContainer` wrapper, Chart/Table toggles, and AI Sparkle (`✨`) triggers.

---

## Phased Implementation Structure

### Phase 1: Reused Ingestion Pipeline & Standard PDF Viewer
- Route: `src/app/api/v1/tax/ingest/stage/route.ts` & `/confirm/route.ts`
  * Multi-file upload handler accepting multiple tax return PDFs.
  * SHA-256 hash checks and SSN masking pre-processing.
- Component: `src/components/tax/TaxMultiUploaderModal.tsx`
  * Multi-file drag-and-drop zone with badge status indicators.
- Component: `src/components/tax/TaxPreImportReviewModal.tsx`
  * Staged review table displaying detected tax years, AGI, liability, and Portfolio Impact Preview before final import.
- Component: `src/components/tax/BunBauDocumentViewer.tsx`
  * Standard document viewer: Zoom In/Out/Reset, Page navigation, Full Screen toggle, Print, Download, Info popover, and Accessibility controls.

### Phase 2: Multi-Year Trend Engine & Comparative Dashboard
- Route: `src/app/tax/page.tsx`
  * Executive summary cards: Effective vs. Marginal Rate, AGI & Liability, Portfolio Tax Drag, and Settlement status.
  * Critical Anomaly & Cliff Banner (Safe harbor underpayment penalties, IRMAA cliffs, capital loss caps).
- Components: `src/components/tax/MultiYearTrendCard.tsx` & `MultiYearDeductionsCard.tsx`
  * Wrapped in standard BunBau `AppletContainer` with Chart/Table toggle and AI Sparkle `✨` insight trigger.
- Component: `src/components/tax/TaxYearStaticDiffCard.tsx`
  * Side-by-side comparative table of line items across all ingested years.
  * 1-click "View Document" button opening the linked PDF in `BunBauDocumentViewer`.

### Phase 3: Shared RAG Architecture & Vector Indexing
- Services: `src/lib/rag/TaxPortfolioChunker.ts`, `VertexEmbedder.ts`, `HybridRetriever.ts`
  * Implements semantic chunking for Form 1040 summaries, Schedule B yield sources, Schedule D capital gains, Schedule A deductions, and active BunBau portfolio holdings.
  * Indexes chunks into `users/{userId}/semantic_knowledge_chunks` with 768-dimensional embeddings.
  * Builds hybrid retrieval pipeline injecting $<1,500$ tokens into reasoning prompts, reducing LLM token consumption by over 80%.

### Phase 4: Proactive Conversational Co-Pilot & Persistent Memory
- Components: `src/components/tax/ProactiveTaxChatDrawer.tsx`, `TaxMemoryInspectorModal.tsx`
- Route: `src/app/api/v1/tax/chat/route.ts`
  * Automatically generates 2–3 proactive, out-of-the-box introductory suggestion chips upon tax return import.
  * SSE streaming chat endpoint grounded in RAG context, live portfolio balances, and user profile settings.
  * Persists newly confirmed user facts (e.g., medical expenses, unharvested crypto losses) into `users/{userId}/tax_memory/profile_facts`.

### Phase 5: Automated Verification & Test Suite
- `tests/tax/tax-calculations.spec.ts`: Unit tests verifying multi-year math, safe harbor penalty detection, and IRMAA cliff evaluation.
- `tests/tax/tax-ux.spec.ts`: Playwright E2E tests verifying multi-file upload, document viewer controls, pre-import impact modal, chart toggles, 1-click PDF viewer links, and proactive chat memory.
- `tests/regression/suite.spec.ts`: Automated regression test verifying Portfolio Dashboard, CD Calendar, Strategy, and Brokerage Ingestion modules continue operating without errors.

Awaiting your review and approval of `BunBau_v2.8_Tax_Analysis_Implementation_Plan.md` before proceeding with code changes.