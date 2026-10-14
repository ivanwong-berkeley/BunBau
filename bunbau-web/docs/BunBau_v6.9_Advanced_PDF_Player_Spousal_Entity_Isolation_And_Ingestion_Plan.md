# BunBau v6.9 Implementation Plan
## Advanced PDF Player, Spousal Entity Isolation & Staged Verification Ingestion Architecture

---

### Executive Release Metadata
- **Milestone Designation:** `v6.9`
- **Application Version:** `2.7.11` *(bumped from `2.7.10`)*
- **Build Number:** `Build 126` *(bumped from `Build 125`)*
- **Architecture Version:** `v2.9.4 Advanced PDF Player, Spousal Entity Isolation & Staged Verification Ingestion Architecture`
- **Mandatory Version Tracking:** *"You also need to update the application version/build/architecture version for every iteration build."*
- **Regression Target:** **100% Pass Rate across all 101+ test suites (>576 unit tests) + Next.js 15 zero-error production build**
- **Date:** October 12, 2026

---

## 1. Executive Summary & Production Problem Analysis

Based on exhaustive user testing and production UI feedback on the BunBau Tax Expert workspace, four critical architectural and usability remediations have been identified:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              BUNBAU v6.9 ARCHITECTURE MATRIX                           │
├────────────────────────────────┬───────────────────────────────────────────────────────┤
│ 1. INGESTION & TERMINAL UX     │ • Pre-upload PDF preview on left panel before staging  │
│                                │ • Full-featured Green Monospace Terminal stream       │
│                                │ • Right panel: Verification Checkboxes + Verify All   │
│                                │ • Dynamic button: "Verify & Ingest Tax Filings (#)"   │
│                                │ • Mandatory Confirmation Modal prior to DB/Storage    │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ 2. DUAL-ENTITY NAME PARSING    │ • Primary Taxpayer (Filer): Harmony                   │
│                                │ • Spouse: Ivan (NEVER call Ivan generic "Spouse")     │
│                                │ • Harmony NEVER called "Harmony & Ivan" individually  │
│                                │ • Individual cards for Social Security, Medicare, etc.│
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ 3. MULTI-YEAR AUDIT ACCURACY   │ • California State Tax correctly links to CA Form 540 │
│                                │ • Eliminates false navigation to Schedule E Part II   │
│                                │ • Exact Form & Line page bookmarks for all 10+ years  │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ 4. ADVANCED PDF VIEWER PLAYER  │ • Contained height (800px) with in-viewer scrolling   │
│                                │ • Table of Contents (TOC) sidebar open by default     │
│                                │ • In-Viewer Keyword Search ("Form 540", "Line 48", etc)│
│                                │ • Jump-to-Page Input ("Page [ X ] of 52")             │
│                                │ • Detach to Full Page / Pop-Out View (detach button)  │
│                                │ • Print, Download, Zoom & Document Information modal  │
└────────────────────────────────┴───────────────────────────────────────────────────────┘
```

---

## 2. Detailed Technical Remediation Plan

### 2.1 Area 1: Ingestion Workflow Redesign, Green Terminal & Checkbox Verification
- **Current Defect:**
  In `UploadValidationModal.tsx` (`activeTab === 'pdf'`), selecting a file immediately populates the right panel as "Verified", bypassing pre-upload document inspection, lacking a terminal progress stream, and offering no selective verification checkboxes or confirmation dialog.
- **v6.9 Architecture Remediation:**
  1. **Left Panel: File Selection & Pre-Upload Document Preview:**
     - When files are selected or dragged, they are staged in a local pre-upload queue.
     - Each staged file displays file name, size, detected tax year, and an interactive **"Preview Document"** trigger.
     - Users can verify each document's contents and metadata directly on the left panel *before* committing to staging.
     - Primary button on left panel: `Confirm & Process Upload`.
  2. **Green Terminal Processing Stream:**
     - Clicking `Confirm & Process Upload` activates the standard BunBau Green Monospace Terminal (`terminalLogs`).
     - Streams realistic real-time telemetry:
       - `[INIT] Initializing BunBau v6.9 Secure Ingestion Pipeline...`
       - `[SECURITY] Client-side Zero-Plaintext SSN masking protocol engaged.`
       - `[OCR_AI] Extracting IRS Form 1040, Schedules A/B/D/E, and Form 8582...`
       - `[STATE_ENGINE] Reconciling California Form 540 & Schedule CA...`
       - `[ENTITY] Resolved joint filers: Harmony (Primary Filer), Ivan (Spouse)...`
       - `[COMPLETE] X tax filings processed. Populating Parsed Tax Filings Overview.`
  3. **Right Panel: "Parsed Tax Filings Overview" with Verification Checkboxes:**
     - Only displays data after the terminal completes processing.
     - Table features a **Status / Verify** column:
       - Header contains a **"Verify All"** master checkbox (`data-testid="verify-all-tax-checkbox"`).
       - Each filing row contains an individual verification checkbox (`data-testid="verify-tax-file-${idx}"`).
     - Checked rows display a vibrant green `Verified` badge; unchecked rows display `Pending Verification`.
  4. **Dynamic Ingestion Action Button:**
     - Button caption dynamically reflects count: `Verify & Ingest Tax Filings (${verifiedCount} Verified)`.
     - Disabled when `verifiedCount === 0`.
     - When `verifiedCount >= 1`, enabled and turns vibrant green (`bg-primary-mint text-slate-900 font-bold`).
  5. **Pre-Commit Confirmation Modal:**
     - Clicking the green button triggers a confirmation modal:
       *"Are you sure you want to ingest ${verifiedCount} verified tax return(s) into your vault and update your active tax strategy database?"*
     - User confirms -> files committed to `taxStore`, stored in local storage, and application transitions to Live Mode.

---

### 2.2 Area 2: Dual-Entity Name Parsing & Spousal Entity Isolation (Harmony & Ivan)
- **Current Defect:**
  In MFJ joint returns, `taxProfileHelper.ts` defaulted `spouseTaxpayer.name` to generic `'Spouse'` or lumped names together as `'Harmony & Ivan'`, causing the app to call Ivan "Spouse" and label Harmony as "Harmony & Ivan" on individual milestone cards.
- **v6.9 Architecture Remediation:**
  1. **Dual-Entity Detection in `taxProfileHelper.ts`:**
     - Create `extractTaxpayersFromFilename(fileName, user)`:
       - Detects joint filers: `Harmony` and `Ivan` (or `Harmony Wong` and `Ivan Wong`).
       - Formally establishes:
         - **Primary Taxpayer (Tax Filer):** `Harmony` (or `Harmony Wong`)
         - **Spouse:** `Ivan` (or `Ivan Wong`)
     - Enforce identity integrity:
       - Ivan is **NEVER** called "Spouse" in UI labels or cards. He is always identified as **Ivan**.
       - Harmony is **NEVER** called "Harmony & Ivan" when referring to her individual milestones or benefits. She is **Harmony**.
       - Joint household references (e.g. 2029 combined milestone) use **"Harmony & Ivan"**.
  2. **Strategy & Lifecycle Card Updates:**
     - `SocialSecurityPlannerCard.tsx`:
       - Disentangle hardcoded assumptions. The primary earner is Harmony, spouse is Ivan.
       - Render their actual names dynamically: `Harmony` (Filer) and `Ivan` (Spouse).
     - `MedicareHealthPlanCard.tsx`:
       - Re-label columns to use their real names: `Older Filer ({older.name})` and `Working Spouse ({younger.name})`.
       - Textual guidance clearly references Harmony and Ivan.
     - `RmdRothConversionCard.tsx`:
       - Display Harmony and Ivan individually with their SECURE 2.0 RMD age 75 milestones.
     - `TaxLifecycleTimeline.tsx`:
       - Scrub through individual milestones showing `Harmony` or `Ivan` on their respective milestone cards, never "Spouse" or truncated compound strings.

---

### 2.3 Area 3: Multi-Year Audit Line Item Accuracy & CA Form 540 Deep Link Fix
- **Current Defect:**
  Clicking "Inspect" on California State Tax in `LongitudinalComparisonCard.tsx` opens page 16 or 25, which corresponds to federal Schedule E Part II (an irrelevant schedule), rather than California Form 540.
- **v6.9 Architecture Remediation:**
  1. **Accurate Page Bookmark Mappings in `longitudinalEngine.ts`:**
     - Fix `california_tax`:
       - Set `sourceDocPage2025: 32` (California Form 540 Line 48)
       - Set `sourceDocPage2024: 38` (California Form 540 Line 48)
     - Audit and verify all line item entries in `lineItemMatrix`:
       - `w2_wages`: Form 1040, Line 1z -> Page 1
       - `taxable_interest`: Schedule B, Line 4 -> Page 1 / Page 12
       - `ordinary_dividends`: Schedule B, Line 6 -> Page 1 / Page 12
       - `capital_loss_carryover`: Schedule D, Line 21 -> Page 13 / 22
       - `schedule_e_rental`: Schedule E, Line 26 -> Page 15 / 24
       - `federal_tax`: Form 1040, Line 24 -> Page 2 / 7
       - `california_tax`: CA Form 540, Line 48 -> Page 32 / 38
  2. **Page Bookmarks Synchronization in `seedData.ts`:**
     - Ensure all simulated and generated tax return fixtures contain accurate `pageBookmarks`:
       - `form_1040_p1: 1`
       - `form_1040_p2: 2`
       - `schedule_d: 13`
       - `schedule_e_p1: 15`
       - `form_8582: 20`
       - `ca_form_540: 32`
       - `ca_schedule_ca: 34`

---

### 2.4 Area 4: Comprehensive PDF Viewer Player UX (`BunBauDocumentViewer.tsx`)
- **Current Defect:**
  The Document Vault & Viewer currently exhibits unbounded 52-page vertical scrolling, lacks an open Table of Contents (TOC) sidebar, lacks in-viewer keyword search, lacks a typed jump-to-page input, and is missing standard accessibility/document options (print, download, document info, and detach to full page).
- **v6.9 Architecture Remediation:**
  1. **Contained Viewport with In-Viewer Scrolling:**
     - Fix height to `h-[800px]` (or responsive `max-h-[85vh]`) with internal scrollbar, eliminating runaway page scrolling.
  2. **Table of Contents (TOC) Sidebar:**
     - Docked on the left side of the player, **open by default**.
     - Toggle button to collapse/expand (`data-testid="viewer-toc-toggle"`).
     - Structured index listing all federal forms, schedules, and California forms:
       - Form 1040 (Pages 1 & 2)
       - Schedule 1, Schedule 2, Schedule 3
       - Schedule A, Schedule B, Schedule D
       - Schedule E (Part I & Part II)
       - Form 8582 (Passive Loss)
       - Form 8949, Form 8960
       - California Form 540 (Resident Return)
       - California Schedule CA (540)
     - Clicking any TOC item immediately scrolls and jumps the viewer to that exact page.
  3. **In-Viewer Keyword Search:**
     - Accessible search input right in the player toolbar (`data-testid="viewer-keyword-search"`).
     - Allows searching for keywords like `"Form 540"`, `"Line 48"`, `"8582"`, `"W-2"`, `"Capital Loss"`.
     - Displays match count and provides previous/next match navigation.
  4. **Jump-to-Page Input:**
     - Interactive pagination input: `Page [ X ] of 52` (`data-testid="viewer-page-input"`).
     - User can type a page number (e.g. `10`) and press Enter or blur to jump directly to page 10.
     - Preserves existing Prev / Next buttons.
  5. **Standard Accessibility, Document Actions & Detach Option:**
     - **Detach Option (Full Page / Pop-Out View, `data-testid="viewer-detach-btn"`):**
       - Dedicated "Detach / Pop-out" action button in the player toolbar (using `ExternalLink` / `Maximize2` iconography).
       - Allows the user to detach the PDF viewer into a dedicated, unconstrained full-window / full-screen workstation view, or open a standalone detached preview tab (`window.open`).
       - In detached mode, expands the document canvas to utilize 100% of screen real estate with floating re-dock / attach controls, dedicated TOC sidebar, search, and synchronized page state.
     - **Canonical Accessibility Zoom Bar (`AccessibilityZoomBar`):** with `[-] [100%] [+]` and reset controls.
     - **Print Option (`data-testid="viewer-print-btn"`):** Triggers high-fidelity document printing via `window.print()`.
     - **Download Option (`data-testid="viewer-download-btn"`):** Triggers instant download of the selected tax return PDF.
     - **Document Information Modal (`(i)`, `data-testid="viewer-info-btn"`):** Displays file metadata:
       - File Name, Tax Year, File Size, Total Pages
       - Primary Taxpayer: Harmony
       - Spouse Taxpayer: Ivan
       - Filing Status: Married Filing Jointly (MFJ)
       - SHA-256 Checksum & Ingestion Timestamp

---

## 3. Step-by-Step Implementation Roadmap

| Phase | Description | Key Files Modified | Target Outcome |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Version Manifest Synchronization** | `package.json`, `AboutModal.tsx`, `page.tsx`, version tests | Bump to `2.7.11 (Build 126)`, `v2.9.4` Arch |
| **Phase 2** | **Dual-Entity Name Parsing & Spousal Isolation** | `taxProfileHelper.ts`, `lifecyclePlanningEngine.ts`, `seedData.ts`, `SocialSecurityPlannerCard.tsx`, `MedicareHealthPlanCard.tsx`, `RmdRothConversionCard.tsx`, `TaxLifecycleTimeline.tsx` | Harmony (Filer) & Ivan (Spouse) cleanly separated; "Spouse" eliminated |
| **Phase 3** | **Multi-Year Audit Line Item Accuracy & CA Form 540 Fix** | `longitudinalEngine.ts`, `seedData.ts`, `LongitudinalComparisonCard.tsx` | CA State Tax links to CA Form 540 (p. 32/38), NOT Schedule E Part II |
| **Phase 4** | **Advanced PDF Viewer Player UX with Detach Option** | `BunBauDocumentViewer.tsx` | Contained viewport, default open TOC, keyword search, jump-to-page, Detach option, print, download, info modal |
| **Phase 5** | **Ingestion Workflow: Staged Preview, Green Terminal & Checkbox Verification** | `UploadValidationModal.tsx`, `TaxMultiUploaderModal.tsx` | Pre-upload preview on left, green terminal telemetry, verify checkboxes + Verify All on right, pre-commit confirmation dialog |
| **Phase 6** | **Quality Assurance & Build Verification** | Unit test suites, Next.js 15 production build | 101+ suites green (100%), 0 build errors |

---

## 4. Verification & Testing Strategy

1. **New Dedicated Unit Test Suites:**
   - `tests/unit/tax/spousal_entity_isolation.test.ts`: Verifies Harmony is identified as primary filer, Ivan is identified as spouse, Ivan is never labeled "Spouse", and individual milestone cards render correct names.
   - `tests/unit/tax/pdf_viewer_player.test.ts`: Verifies TOC sidebar open by default, keyword search filtering, jump-to-page input parsing, Detach pop-out toggle, and document toolbar actions.
   - `tests/unit/tax/ingestion_verification_workflow.test.ts`: Verifies pre-upload preview on left, green terminal streaming, right panel verify checkboxes, verify all toggle, dynamic button state, and confirmation modal.
   - `tests/unit/tax/line_item_pdf_deep_link.test.ts`: Verifies California State Tax maps to CA Form 540 and not Schedule E Part II.
2. **Regression Verification:**
   - All 101 existing test suites must pass 100% green.
   - Production Next.js 15 build (`npm run build`) must compile cleanly with 0 TypeScript or lint errors.

---
*Prepared by Antigravity Engineering for User Approval.*
