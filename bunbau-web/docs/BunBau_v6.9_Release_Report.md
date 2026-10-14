# BunBau v6.9 Release Report
## Advanced PDF Player, Spousal Entity Isolation & Staged Verification Ingestion Architecture

---

### Executive Release Metadata
- **Milestone Designation:** `v6.9`
- **Application Version:** `2.7.11`
- **Build Number:** `Build 126`
- **Architecture Version:** `v2.9.4 Advanced PDF Player, Spousal Entity Isolation & Staged Verification Ingestion Architecture`
- **Mandatory Version Tracking Enforcement:** *"You also need to update the application version/build/architecture version for every iteration build."*
- **Regression Verification:** **100% Green Unit Test Suites (17 / 17 Test Files, 100 / 100 Tests Passing)**
- **Next.js 15 Production Build:** **Compiled successfully — 16 / 16 Static & Dynamic Routes Verified**
- **Date:** October 12, 2026

---

## 1. Executive Summary

Milestone **v6.9** delivers a comprehensive UX and architectural upgrade across BunBau's Tax Return Ingestion and Multi-Year Audit systems. Addressing detailed production feedback, v6.9 introduces:
1. **Interactive Green Monospace Terminal Stream & Staged Verification Workflow:**
   A two-phase ingestion pipeline featuring pre-upload PDF previewing, a live green monospace extraction terminal, a parsed filings overview table with granular row and bulk checkboxes, dynamic button state reflecting verified count, and a final confirmation modal before database/storage persistence.
2. **Dual-Entity Name Parsing & Spousal Isolation:**
   Accurate joint return (MFJ) parsing isolating **Harmony** (Primary Filer) and **Ivan** (Spouse). Eradicates generic "Spouse" labels and removes compound "Harmony & Ivan" strings from individual taxpayer cards and lifecycle milestones.
3. **Multi-Year Audit Deep Link Precision:**
   California State Tax bookmarks now pinpoint **California Form 540 Line 48** (Page 37 for 2024 / Page 35 for 2025), replacing erroneous offsets to Schedule E Part II.
4. **Advanced PDF Viewer Player UX & Detach Option:**
   A full-featured PDF workstation featuring a contained 800px viewport with in-viewer scrolling, Table of Contents (TOC) sidebar open by default on the left, keyword search, jump-to-page input (`Page X of Y`), canonical accessibility zoom controls, Print, Download, Document Info metadata modal, and a dedicated **Detach / Re-attach** workstation capability.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                BUNBAU v6.9 ARCHITECTURE                                │
│                                                                                        │
│   STAGED VERIFICATION INGESTION PIPELINE        ADVANCED PDF VIEWER PLAYER & WORKSTATION│
│  ┌─────────────────────────────────────┐       ┌─────────────────────────────────────┐ │
│  │ 1. Browse / Select Multi-Year PDFs  │       │ • Contained 800px In-Viewer Scroll  │ │
│  │ 2. Pre-Upload Preview Modal         │       │ • Table of Contents (TOC) Left Open │ │
│  │ 3. Confirm & Process Upload         │       │ • Keyword Search & Jump-to-Page     │ │
│  │ 4. Green Monospace Stream Terminal  │       │ • Accessibility Zoom, Print, DL, (i)│ │
│  │ 5. Parsed Filings Verification Table│       │ • Full-Viewport Detach / Re-attach  │ │
│  │ 6. Ingest (# Verified) + Modal      │       └──────────────────┬──────────────────┘ │
│  └──────────────────┬──────────────────┘                          │                    │
│                     │                                             │                    │
│                     └───────────────────────┬─────────────────────┘                    │
│                                             ▼                                          │
│                     ┌───────────────────────────────────────────┐                      │
│                     │  Next.js 15 Production Core               │                      │
│                     │  v2.7.11 (Build 126) • v2.9.4 Arch        │                      │
│                     │  17/17 Tax Suites • 100/100 Tests Green   │                      │
│                     └───────────────────────────────────────────┘                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Comprehensive Remediation Matrix

### 2.1 Staged Ingestion & Green Monospace Terminal Workflow
- **The Problem:** 
  Previously, uploading a tax return immediately populated the parsed filings overview without giving the user a chance to inspect the document beforehand. Furthermore, there was no streaming terminal feedback to observe OCR / extraction progress, and files were automatically marked "verified" without user control.
- **The v6.9 Solution:**
  1. **Pre-Upload PDF Preview:** Users can click `data-testid="preview-staged-pdf-${idx}"` to inspect each staged document in a preview modal (`staged-pdf-preview-modal`) with detach/reattach options before committing.
  2. **Confirm & Process Upload:** An explicit action button (`data-testid="confirm-pdf-upload-btn"`) triggers the extraction stage.
  3. **Streaming Green Terminal:** During extraction, a dedicated Monospace terminal (`bunbau_tax_ingestion_term`) renders real-time parsing logs (e.g. `[OCR-EXTRACT]`, `[FORM-DETECT] Form 1040 (MFJ) identified`, `[SCHEDULE-PARSE] Line items indexed`).
  4. **Parsed Tax Filings Overview:** Only populates upon terminal extraction completion. Includes:
     - Master "Verify All" checkbox (`data-testid="verify-all-tax-checkbox"`)
     - Individual row checkboxes (`data-testid="verify-tax-checkbox-${idx}"`)
     - Live verification status badges (`Verified` / `Pending Verification`)
  5. **Dynamic Ingest Button:** `Verify & Ingest Tax Filings (${verifiedCount} Verified)` (`data-testid="ingest-tax-returns-btn"`), disabled when 0 verified, turning vibrant green (`bg-emerald-600`) when $\ge 1$ verified.
  6. **Ingestion Confirmation Modal:** Clicking ingest prompts `data-testid="tax-ingest-confirm-modal"` requiring explicit confirmation before committing to database and storage.

---

### 2.2 Dual-Entity Name Parsing & Spousal Isolation
- **The Problem:** 
  In joint returns (MFJ) for Harmony and Ivan, Ivan was generically labeled "Spouse", and Harmony was frequently conflated with the combined household name "Harmony & Ivan" on individual benefit cards and life cycle milestones.
- **The v6.9 Solution:**
  1. **Strict Name Parsing (`taxProfileHelper.ts`):** `extractTaxpayersFromFilename` identifies Primary Filer: **Harmony** and Spouse: **Ivan**.
  2. **Elimination of Generic "Spouse":** Ivan is never labeled simply as "Spouse"; his card headers, Medicare plans, and RMD schedules display his actual name: `Spouse (Ivan)`.
  3. **Elimination of Compound String Conflation:** Harmony's individual retirement milestones and healthcare cards no longer display "Harmony & Ivan", cleanly isolating her entity.
  4. **Universal Propagation:** Updated across `MedicareHealthPlanCard.tsx`, `TaxLifecycleTimeline.tsx`, `RmdRothConversionCard.tsx`, and `TaxExpertView.tsx`.

---

### 2.3 Multi-Year Audit Deep Link Precision
- **The Problem:** 
  Clicking California State Tax in the Multi-Year Audit deep linked to Schedule E Part II (Page 16/25) rather than the California Form 540 return line item.
- **The v6.9 Solution:**
  1. Updated `src/lib/tax/longitudinalEngine.ts` bookmark offsets:
     - **2024 California Tax:** Pinpoints **Page 37, Line 48** (Form 540 Line 48: Tax Before Credits / Total Tax).
     - **2025 California Tax:** Pinpoints **Page 35, Line 48** (Form 540 Line 48: Tax Before Credits / Total Tax).
  2. Rental Income links verified at Page 19 (2024) and Page 10 (2025).

---

### 2.4 Advanced PDF Viewer Player UX & Detach Option
- **The Problem:** 
  The previous PDF preview suffered from 52-page endless scrolling fatigue, lacked a Table of Contents, lacked in-viewer keyword search, had no direct jump-to-page input, and lacked standard accessibility and workstation options.
- **The v6.9 Solution:**
  1. **Contained 800px In-Viewer Scroll:** The viewer is constrained to a sleek `h-[800px]` viewport with internal scrolling.
  2. **Table of Contents (TOC) Sidebar:** Rendered open by default on the left (`data-testid="viewer-toc-sidebar"` with toggle `data-testid="viewer-toc-toggle"`), listing key schedules: Form 1040, Schedule 1, Schedule A, Schedule B, Schedule D, Schedule E, Form 8582, and California Form 540.
  3. **Keyword Search:** Instant text search input (`data-testid="viewer-keyword-search"`) allowing users to search for "Form 540", "Passive Loss", "Line 48", etc.
  4. **Jump-to-Page Input:** Direct numeric pagination input (`data-testid="viewer-page-input"`) with `Page X of Y` display.
  5. **Standard Accessibility & Actions:**
     - Zoom bar (`AccessibilityZoomBar`) with `[-] [100%] [+]`
     - Print option (`data-testid="viewer-print-btn"`)
     - Download option (`data-testid="viewer-download-btn"`)
     - Document Info metadata modal (`data-testid="viewer-info-btn"` / `data-testid="viewer-info-modal"`)
  6. **Workstation Detach Option:** A dedicated "Detach" button (`data-testid="viewer-detach-btn"`) expands the PDF viewer into an unconstrained full-viewport workstation window with re-dock / attach controls (`data-testid="viewer-reattach-btn"`).

---

## 3. Verification & Test Execution Results

### 3.1 Unit Test Coverage
```bash
$ npx vitest run tests/unit/tax/
✓ tests/unit/tax/ingestion_verification_workflow.test.ts (9 tests)
✓ tests/unit/tax/universal_upload_modal.test.ts (16 tests)
✓ tests/unit/tax/pdf_viewer_player.test.ts (9 tests)
✓ tests/unit/tax/longitudinal_scalability.test.ts (4 tests)
✓ tests/unit/tax/tax_demo_mode.test.ts (4 tests)
✓ tests/unit/tax/pdf_multi_year_ingestion.test.ts (4 tests)
✓ tests/unit/tax/tax_data_partitioning_and_actions.test.ts (12 tests)
✓ tests/unit/tax/tax_calculations.test.ts (4 tests)
✓ tests/unit/tax/spousal_entity_isolation.test.ts (6 tests)
✓ tests/unit/tax/strategist_rag_coexistence.test.ts (3 tests)
✓ tests/unit/tax/tax_rag_retrieval.test.ts (4 tests)
✓ tests/unit/tax/contextual_tab_partitioning.test.ts (7 tests)
✓ tests/unit/tax/version_guard.test.ts (4 tests)
✓ tests/unit/tax/lifecycle_planning.test.ts (5 tests)
✓ tests/unit/tax/document_viewer_virtualization.test.ts (3 tests)
✓ tests/unit/tax/tax_delete_phrase.test.ts (4 tests)
✓ tests/unit/tax/tax_history_view_integration.test.ts (2 tests)

Test Files: 17 passed (17)
Tests:      100 passed (100)
Duration:   986ms
```

### 3.2 Production Build Verification
The Next.js 15 production build compiled with zero errors across all 16 static and dynamic application routes.

---

## 4. Architectural Version Sync
- **Package.json:** `"version": "2.7.11"`
- **About Modal:** `2.7.11 (Build 126)`
- **Architecture Version:** `v2.9.4 Advanced PDF Player, Spousal Entity Isolation & Staged Verification Ingestion Architecture`
- **Application Page:** `v2.7.11 (Build 126)`
