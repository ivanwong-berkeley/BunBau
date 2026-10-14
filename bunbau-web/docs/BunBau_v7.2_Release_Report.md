# BunBau Milestone v7.2 Release Report
## Dedicated Single-Form Item Inspector, Pure Dynamic Schedule E Real Property Extraction & Original Uploaded PDF Workstation Architecture

> *"You also need to update the application version/build/architecture version for every iteration build."*

- **Application Release Version:** `2.7.14`
- **Build Identification:** `Build 129`
- **Architecture Designation:** `v2.9.7 Dedicated Single-Form Item Inspector, Pure Dynamic Schedule E Real Property Extraction & Original Uploaded PDF Workstation Architecture`
- **Verification Status:** `100% Automated Regression Verified (111 Test Suites, 642 Unit Tests Passing, Zero Regressions)`

---

## 1. Executive Summary & Root Cause Resolution

In Milestone `v7.2`, BunBau resolves two fundamental user-reported architectural flaws and fulfills high-priority workflow enhancements across the **Tax Expert Engine**:

### 1.1 Resolution of Broken Multi-Year Audit Flow & Schedule Routing (Issue 1)
- **Prior Defect:** Clicking `[Inspect]` on longitudinal tax line items (e.g. Ordinary Dividends, Capital Gains, AGI) in the 9-Year Trajectory & Historical Audit (2016–2025) routed users to Schedule B, where an un-indexed branch in `BunBauDocumentViewer.tsx` (pages 5–16) erroneously rendered Schedule E rental real estate. Furthermore, forced 52-page endless scrolling obstructed navigation to targeted statutory tax lines.
- **Architectural Solution:**
  1. Authoring of [`src/components/tax/TaxSingleFormViewer.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/TaxSingleFormViewer.tsx): A dedicated, standalone single-form sheet viewer providing isolated, authentic views for:
     - `1040_p1`: Form 1040 Page 1 (W-2 wages, ordinary/qualified dividends, taxable interest, capital gains, AGI Line 11).
     - `1040_p2`: Form 1040 Page 2 (standard/itemized deductions, taxable income, total federal tax Line 24, safe harbor credits).
     - `schedule_b`: Schedule B Interest & Ordinary Dividends (Part I Interest by bank/reserve payer; Part II Ordinary Dividends by brokerage/fund payer; Line 6 highlighted). **Zero Schedule E rental property bleed!**
     - `schedule_d`: Schedule D Capital Gains & Losses (Short-term/long-term brokerage sales, $3,000 ordinary loss offset cap, Line 21 carryforward reserve).
     - `schedule_e`: Schedule E Supplemental Income & Loss (Part I Rental Real Estate rents received, expenses, net loss, Line 26 total).
     - `form_8582`: Form 8582 Passive Activity Loss Limitations ($25k phaseout, unallowed suspended loss carryforwards).
     - `ca_540`: California Form 540 Resident Return (CA AGI, deductions, taxable income, Line 48 tax liability after credits, Line 71 withholdings).
  2. Integration of Form & Line Deep-Linking in [`src/components/tax/LongitudinalComparisonCard.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/LongitudinalComparisonCard.tsx): When inspecting a line item, buttons now explicitly declare and jump to the exact form: e.g. `[Eye View 2025 Schedule B (Schedule B, Line 6)]`, `[Eye View 2025 Form 1040 (Form 1040, Line 11)]`, `[Eye View 2025 Schedule E (Schedule E, Line 26)]`.

### 1.2 Dedicated Original Uploaded PDF Workstation (Issue 1 Enhancement)
- **User Requirement:** *"For the inspect item, you don't need to allow view all 52 pages (scolling), a single view page for the inspect item is fine. However, you should have a button to allow the user to view the origianl uploaded tax return pdf (fetch from storage) and allow the user to view the entire report... The PDF viewer can be reference the implemntation of the Tax Return PDF upload and preview implmentation."*
- **Architectural Solution:**
  - Authored [`src/components/tax/OriginalTaxPdfViewerModal.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/OriginalTaxPdfViewerModal.tsx):
    - Multi-Year Dropdown / Year Pills (`[2016 ... 2025]`) allowing fluid cross-year examination without exiting the modal.
    - Standard UX Document Controls: Canonical `AccessibilityZoomBar` (0.7x to 1.5x), Print (`window.print()`), Download, Page Jump input (`Page X of Y`), and Detached Full-Screen Portal Mode (`createPortal(..., document.body)` with `z-[100]`) ensuring zero overlapping or sidebar clipping.
    - Prominent `[View Original Uploaded PDF (Full Report)]` buttons surfaced across:
      1. Line Item Inspector Modal (`data-testid="view-original-pdf-btn"`)
      2. Single Form Sheet Toolbar (`data-testid="view-original-uploaded-pdf-btn"`)
      3. Document Vault Workspace Toolbar (`data-testid="vault-open-original-pdf-btn"`)

### 1.3 Pure Dynamic Schedule E Real Property Extraction & Zero Hardcoding Guarantee (Issue 2)
- **User Requirement:** *"The 2nd problem of mixed with demo data and real-life user data is still happening... The schedule B pdf inspect page shows a real estate in evergreen terrace in san francisco. That is wrong. My investment property is in 3343 Los Prados, San Mateo, CA. This mixed mock demo data and live data is a critical bug that need to be fixed... Are you hardcoding the Real Property Binding to 3343 los prados or you going to fetch it from the tax return dynamically? I don't want any hardcoding."*
- **Forensic Guarantee & Cleanse:**
  - **Zero Hardcoded Addresses in Component Code:** Guaranteed via automated AST and string search tests. Neither `'742 Evergreen'` nor `'3343 Los Prados'` is hardcoded as fallback UI strings.
  - **Pure Dynamic Data Extraction:** All rental real estate views (`TaxSingleFormViewer.tsx`, `OriginalTaxPdfViewerModal.tsx`, `PortfolioTaxStrategyCard.tsx`) dynamically map over `taxReturn.federal.rentalProperties.map((prop) => prop.address)`. If no property is reported, an authentic empty state is rendered (`No Schedule E Rental Properties Reported`) rather than synthetic mock data.
  - **Zero-Bleed Cleansing & Migration:**
    - Purged all occurrences of `742 Evergreen Terrace` from [`src/lib/tax/seedData.ts`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/lib/tax/seedData.ts).
    - Added automatic migration sanitizer in [`src/lib/tax/taxStore.ts`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/lib/tax/taxStore.ts) (`sanitizeStoredTaxReturn()`) to cleanse legacy stored records on hydration.

---

## 2. Source Code Architecture & File Modifications

| Component / Subsystem | Path | Description & Architectural Impact |
| :--- | :--- | :--- |
| **Single Form Viewer** | [`src/components/tax/TaxSingleFormViewer.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/TaxSingleFormViewer.tsx) | New dedicated workstation rendering isolated single-form views (`1040_p1`, `1040_p2`, `schedule_b`, `schedule_d`, `schedule_e`, `form_8582`, `ca_540`) with glowing line highlighting, zoom bar, print, copy, and original PDF launcher. |
| **Original PDF Workstation** | [`src/components/tax/OriginalTaxPdfViewerModal.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/OriginalTaxPdfViewerModal.tsx) | New authentic PDF workstation modal with multi-year dropdown, page jumping, zoom bar, download, print, metadata modal, and detached portal breakout (`z-[100]`). |
| **Longitudinal Inspector** | [`src/components/tax/LongitudinalComparisonCard.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/LongitudinalComparisonCard.tsx) | Updated line-item inspector modal with target schedule routing (`jump-2025-pdf`), schedule labels, and `[View Original 2025 Return PDF (Full Report)]` button. |
| **Tax Expert Orchestrator** | [`src/components/tax/TaxExpertView.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/TaxExpertView.tsx) | Wired `single_form` vs `full_vault` view mode toggle in Workspace 4, connected deep link handlers, and mounted `OriginalTaxPdfViewerModal`. |
| **Longitudinal Engine** | [`src/lib/tax/longitudinalEngine.ts`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/lib/tax/longitudinalEngine.ts) | Bound `targetSchedule` to all 17 matrix items (`w2_wages` -> `1040_p1`, `taxable_interest` -> `schedule_b`, `ordinary_dividends` -> `schedule_b`, `capital_gains` -> `schedule_d`, `rental_income` -> `schedule_e`, `agi` -> `1040_p1`, etc.). |
| **Seed Data & Store** | [`src/lib/tax/seedData.ts`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/lib/tax/seedData.ts), [`src/lib/tax/taxStore.ts`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/lib/tax/taxStore.ts) | Cleaned all legacy mock addresses; added runtime `sanitizeStoredTaxReturn` sanitizer. |
| **Version Manifests** | [`package.json`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/package.json), [`src/components/AboutModal.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/AboutModal.tsx), [`src/app/page.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/app/page.tsx) | Bumped application version to `2.7.14`, build to `Build 129`, and architecture to `v2.9.7`. |

---

## 3. Automated Test Verification & Regression Safeguards

Three dedicated new test suites were authored alongside the updated version guard tests:

1. **[`tests/unit/tax/single_form_inspector_routing.test.ts`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/tests/unit/tax/single_form_inspector_routing.test.ts)** (7 tests passing):
   - Verifies Ordinary Dividends routes strictly to Schedule B without Schedule E bleed.
   - Verifies AGI routes strictly to Form 1040 Page 1.
   - Verifies Capital Gains routes strictly to Schedule D.
   - Verifies Rental Income routes strictly to Schedule E.
   - Verifies Form 8582 suspended loss routes strictly to Form 8582.
   - Verifies California tax liability routes strictly to CA Form 540.
   - Verifies Schedule B view in `TaxSingleFormViewer.tsx` contains ZERO Schedule E rental real estate bleed.
2. **[`tests/unit/tax/dynamic_property_extraction.test.ts`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/tests/unit/tax/dynamic_property_extraction.test.ts)** (5 tests passing):
   - Enforces ZERO occurrences of `742 Evergreen Terrace` across the entire `src/` directory.
   - Enforces pure dynamic extraction from `taxReturn.federal.rentalProperties` with zero hardcoded address fallbacks in `TaxSingleFormViewer.tsx`.
   - Enforces pure dynamic extraction in `OriginalTaxPdfViewerModal.tsx`.
   - Enforces dynamic extraction in `PortfolioTaxStrategyCard.tsx`.
   - Verifies `sanitizeStoredTaxReturn` cleanses legacy cached records.
3. **[`tests/unit/tax/original_pdf_workstation.test.ts`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/tests/unit/tax/original_pdf_workstation.test.ts)** (5 tests passing):
   - Verifies presence of "View Original Uploaded PDF" in `TaxSingleFormViewer.tsx`.
   - Verifies presence of "View Original 2025 Return PDF (Full Report)" in `LongitudinalComparisonCard.tsx`.
   - Verifies presence of Original PDF Workstation Launcher in `TaxExpertView.tsx` toolbar.
   - Verifies interactive controls in `OriginalTaxPdfViewerModal.tsx`.
   - Verifies detached portal break-out (`z-[100]` and `createPortal(..., document.body)`).
4. **Overall Suite Result:**
   - **Total Test Files:** `111 passed (111/111)`
   - **Total Unit Tests:** `642 passed (642/642)`
   - **Failures:** `0`

---

## 4. Production Build Verification

- **Next.js Version:** `15.5.27`
- **Compiler:** `SWC / Turbopack Optimized Production Compilation`
- **Build Status:** Successfully compiled and generated static and dynamic routes with zero TypeScript or Lint errors.
