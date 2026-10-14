# BunBau v7.0 Release Report
## Chronological Dynamic Tax KPI Engine, Portal Detach Workstation & Streamlined PDF Player UX Architecture

---

### Executive Release Metadata
- **Milestone Designation:** `v7.0`
- **Application Version:** `2.7.12`
- **Build Number:** `Build 127`
- **Architecture Version:** `v2.9.5 Chronological Dynamic Tax KPI, Portal Detach & Streamlined PDF Viewer UX Architecture`
- **Mandatory Version Tracking Enforcement:** *"You also need to update the application version/build/architecture version for every iteration build."*
- **Regression Verification:** **106 / 106 Test Suites Passing (612 / 612 Unit Tests 100% Green)**
- **Next.js 15 Production Build:** **Compiled successfully — 16 / 16 Static & Dynamic Routes Verified**
- **Date:** October 12, 2026

---

## 1. Executive Summary

Milestone **v7.0** delivers a major precision upgrade to BunBau's multi-year tax analytics, executive KPI presentation, and PDF document workstation. Addressing production audits and user feedback across 5 UI screenshots, v7.0 resolves:
1. **Overview KPI Year Focus & Chronological Processing:**
   Previously, the executive summary cards displayed headline values without stating the tax filing year (`2025`), showing only `2024: $230,000` in the subtext. In v7.0, all tax filings are processed chronologically (`2016..2025` or `..2026`). The KPI cards explicitly spotlight the latest filing year (e.g. `2025 ADJUSTED GROSS INCOME`, `2025 TOTAL TAX`, `2025 EFFECTIVE TAX RATE`, `2026 LOSS SHIELDS`) with a prominent `Latest Filing (2025)` badge and clear `vs 2024` comparison trend deltas.
2. **React Portal-Based Detach Workstation (Zero Sidebar Overlap & Full Screen Real Estate):**
   Previously, activating the Detached viewer rendered inside the app's inner stacking context (`relative z-10`), allowing the left navigation sidebar (`relative z-20`) to paint on top of the viewer. This concealed the Table of Contents (TOC) and left unused margins. In v7.0, the detached view uses React's `createPortal(..., document.body)` with `z-[100]`. It spans 100% of the display viewport (100vw $\times$ 100vh), eliminates any left menu overlap, grants the TOC sidebar full breathing room, and includes a uniform top window header matching the Ingestion workflow with `Attach / Dock`, `Open in New Window` (`ExternalLink`), and `Close` controls.
3. **Streamlined PDF Player Toolbar & Uncrushed Keyword Search Box:**
   Previously, 9 consecutive multi-year buttons were rendered horizontally inside the 64px viewer toolbar, colliding with and crushing the keyword search box. In v7.0, the wide button row is replaced with an elegant, compact **Tax Year Dropdown** (`[ 2025 Return ▾ ]`), freeing up over $350\text{px}$ of toolbar width. The keyword search bar now occupies a dedicated, uncrushed flex container (`min-w-[200px] max-w-sm flex-1`) with centered controls and an instant clear button (`X`).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                BUNBAU v7.0 ARCHITECTURE                                │
│                                                                                        │
│   CHRONOLOGICAL KPI ENGINE (2025 FOCUS)       PORTAL DETACH WORKSTATION & PDF PLAYER   │
│  ┌─────────────────────────────────────┐     ┌───────────────────────────────────────┐ │
│  │ 1. Chronological Tax Years Sorting  │     │ • React Portal to document.body       │ │
│  │ 2. Latest Year Resolution: 2025     │     │ • z-index z-[100] (0 Sidebar Overlap) │ │
│  │ 3. Prior Year Delta: 2024           │     │ • Full 100% Display Real Estate       │ │
│  │ 4. Clear "2025" Card Titles & Badge │     │ • Compact Year Dropdown (No Overlap)  │ │
│  │ 5. Future 2026 Upload Extensibility │     │ • Uncrushed Search (min-w-[200px])    │ │
│  │ 6. Forward Loss Shields: 2026/2027  │     │ • Re-attach & Pop-Out External Window │ │
│  └──────────────────┬──────────────────┘     └──────────────────┬────────────────────┘ │
│                     │                                           │                      │
│                     └───────────────────────┬───────────────────┘                      │
│                                             ▼                                          │
│                     ┌───────────────────────────────────────────┐                      │
│                     │  Next.js 15 Production Core               │                      │
│                     │  v2.7.12 (Build 127) • v2.9.5 Arch        │                      │
│                     │  106/106 Suites • 612/612 Tests Green     │                      │
│                     └───────────────────────────────────────────┘                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Comprehensive Remediation Matrix

### 2.1 Overview KPI Year Focus & Chronological Processing
- **The Problem:** 
  In the Overview KPI cards, the headline numbers (`$243,200`, `$65,160`, `26.8%`) did not indicate which year was being shown. The only year visible on the card was `2024: $230,000` in the subtext, leading users to believe the cards were displaying 2024 data rather than the latest 2025 return.
- **The v7.0 Solution:**
  1. **Chronological Sorting in `TaxContext.tsx`:** Active tax returns are sorted chronologically by `taxYear` ascending (`sortedTaxReturns`), reliably resolving `latestTaxReturn` (2025) and `previousTaxReturn` (2024).
  2. **Dynamic Comparison Calculation:** `generateTaxComparison(currentPreviousReturn, currentLatestReturn)` dynamically parameterizes `latestYear` and `previousYear` with forward-looking loss shield projections for `latestYear + 1`.
  3. **Explicit Card Titles & Badges in `TaxExecutiveSummaryCards.tsx`:**
     - `2025 Adjusted Gross Income` with badge `Latest Filing (2025)`.
     - `2025 Total Tax (Fed + CA)` with badge `Latest Filing`.
     - `2025 Effective Tax Rate` with badge `Latest Filing`.
     - `2026 Loss Shields` with badge `Forward Shield`.
  4. **Clear Prior-Year Trend Comparisons:**
     - `▲ 5.7% vs 2024` with subtext `2024: $230,000 • Below $250k NIIT limit`.
     - `▼ 6.0% vs 2024` with subtext `2024: $61,500 • Saved $3,660 vs 2024`.
     - `▼ 0.1% pts vs 2024` with subtext `2024: 26.7% • Combined Fed + CA`.
  5. **Dynamic Trend & Deductions Cards:** [`MultiYearTrendCard.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/MultiYearTrendCard.tsx) and [`MultiYearDeductionsCard.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/MultiYearDeductionsCard.tsx) dynamically label columns `${previousYear} Filed` and `${latestYear} Filed (Latest)`.

---

### 2.2 React Portal-Based Workstation Detach (Zero Sidebar Overlap)
- **The Problem:** 
  The detached PDF viewer in Document Vault & Viewer rendered inside the app layout (`relative z-10`). The BunBau sidebar (`relative z-20`) was painted on top of it, obscuring the Table of Contents (TOC) and preventing the viewer from utilizing the full screen.
- **The v7.0 Solution:**
  1. **Direct React Portal Mounting (`createPortal`):** When detached, [`BunBauDocumentViewer.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/BunBauDocumentViewer.tsx) mounts directly onto `document.body` with `z-[100]`.
  2. **100% Real Estate Utilization:** Spans `fixed inset-0 z-[100] w-screen h-screen`, giving users an unconstrained workstation experience.
  3. **Zero Sidebar Overlap:** Because the portal resides at `document.body` root at `z-[100]`, the sidebar (`z-20`) is completely behind it. The Table of Contents (TOC) sidebar on the left starts cleanly at $x = 0$ with zero clipping or obstruction.
  4. **Workstation Top Banner:** Features document name, `Tax Year ${year}` badge, `Attach / Dock` (`viewer-reattach-btn`), `Open in New Window` (`viewer-open-window-btn`), and `Close` (`X`).
  5. **Workspace In-Place Placeholder:** The embedded view displays a clean dashed placeholder with a `Re-dock to Workspace` button.

---

### 2.3 Streamlined PDF Player Toolbar & Uncrushed Keyword Search Box
- **The Problem:** 
  Rendering 9 multi-year return buttons (`[2016] [2017]...[2025]`) in the 64px toolbar consumed over 400px of width, crushing the keyword search input and causing the `2025` button to overlap `Search Form 540...`.
- **The v7.0 Solution:**
  1. **Compact Year Selector:** Replaced the wide button row with an elegant, compact **Tax Year Dropdown** (`<select data-testid="viewer-year-select">`), freeing up $\ge 350\text{px}$ of horizontal space.
  2. **Dedicated Uncrushed Search Container:** Configured with `flex-1 min-w-[200px] max-w-sm relative mx-2` flanked by `shrink-0` side clusters. The search input has guaranteed breathing room and never collides with adjacent buttons.
  3. **Centered Clear Button:** A sleek `X` button appears when queries are entered, vertically centered for frictionless clearing.

---

## 3. Verification & Test Execution Results

### 3.1 Unit Test Coverage
```bash
$ npm test
✓ 106 passed (106 test files)
✓ 612 passed (612 tests)
Duration: 4.40s
```

All 19 Tax Expert test suites passed with 100% green status:
1. `tests/unit/tax/chronological_kpi_focus.test.ts` (5 tests) — **NEW (v7.0)**
2. `tests/unit/tax/portal_detach_and_search_ux.test.ts` (7 tests) — **NEW (v7.0)**
3. `tests/unit/tax/ingestion_verification_workflow.test.ts` (9 tests)
4. `tests/unit/tax/universal_upload_modal.test.ts` (16 tests)
5. `tests/unit/tax/pdf_viewer_player.test.ts` (9 tests)
6. `tests/unit/tax/spousal_entity_isolation.test.ts` (6 tests)
7. `tests/unit/tax/contextual_tab_partitioning.test.ts` (7 tests)
8. `tests/unit/tax/tax_data_partitioning_and_actions.test.ts` (12 tests)
9. `tests/unit/tax/longitudinal_scalability.test.ts` (4 tests)
10. `tests/unit/tax/tax_demo_mode.test.ts` (4 tests)
11. `tests/unit/tax/pdf_multi_year_ingestion.test.ts` (4 tests)
12. `tests/unit/tax/tax_calculations.test.ts` (4 tests)
13. `tests/unit/tax/strategist_rag_coexistence.test.ts` (3 tests)
14. `tests/unit/tax/tax_rag_retrieval.test.ts` (4 tests)
15. `tests/unit/tax/version_guard.test.ts` (4 tests)
16. `tests/unit/tax/lifecycle_planning.test.ts` (5 tests)
17. `tests/unit/tax/document_viewer_virtualization.test.ts` (3 tests)
18. `tests/unit/tax/tax_delete_phrase.test.ts` (4 tests)
19. `tests/unit/tax/tax_history_view_integration.test.ts` (2 tests)

---

## 4. Architectural Version Synchronization
- **Package.json:** `"version": "2.7.12"`
- **About Modal:** `2.7.12 (Build 127)`
- **Architecture Version:** `v2.9.5 Chronological Dynamic Tax KPI, Portal Detach & Streamlined PDF Viewer UX Architecture`
- **Application Page:** `v2.7.12 (Build 127)`
