# BunBau v7.2 Implementation & Engineering Plan
## Dedicated Single-Form Item Inspector, Pure Dynamic Schedule E Real Property Extraction & Original Uploaded PDF Workstation Architecture

---

### Mandatory Version Tracking Enforcement
> *"You also need to update the application version/build/architecture version for every iteration build."*

- **Milestone Designation:** `v7.2`
- **Application Version:** `2.7.14`
- **Build Number:** `Build 129`
- **Architecture Version:** `v2.9.7 Dedicated Single-Form Item Inspector, Pure Dynamic Schedule E Real Property Extraction & Original Uploaded PDF Workstation Architecture`
- **Date:** October 12, 2026

---

## 1. Problem Statement & Root Cause Analysis

### 1.1 Multi-Year Audit Flow Routing & Scrolling Viewer Indexing Failure
- **User Finding:** 
  Clicking `[Inspect]` on multi-year audit items (such as *Ordinary Dividends*) routed incorrectly to *Schedule B*, and inside the viewer, the page displayed *Schedule E Rental Real Estate* instead of the relevant schedule.
- **Root-Cause Analysis:**
  1. **Generic Page Indexing:** In [`longitudinalEngine.ts`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/lib/tax/longitudinalEngine.ts), almost every income and deduction line item (AGI, Ordinary Dividends, Qualified Dividends, Taxable Interest, Deductions, Wages) was mapped to `sourceDocPage2025: 6`.
  2. **Page 6 Content Mismatch in `BunBauDocumentViewer.tsx`:** 
     - In the Table of Contents, Page 6 was labeled `Schedule B - Interest & Ordinary Dividends`.
     - However, in the page body renderer (lines 627–655), any page where `pageNum <= 16` fell into a hardcoded `Schedule E / Rental Real Estate` template.
     - As a result, Page 6 rendered a Schedule E box titled `SCHEDULE B` in the header, while displaying `SCHEDULE E / RENTAL REAL ESTATE (742 EVERGREEN TERRACE...)` in the body.
  3. **Continuous 52-Page Scroll vs. Focused Single-Form View:**
     - Simulating a 52-page continuous document with virtualized synthetic DOM nodes caused severe indexing drift.
     - For an inspected item, the user requires a focused, high-fidelity **Single Form / Schedule View** (e.g. Schedule B for dividends, Form 1040 P1 for AGI, Schedule E for rental) highlighting the exact line item, rather than an endless 52-page scroll.

---

### 1.2 Data Pollution & The Zero-Hardcoding Mandate
- **User Question & Mandate:**
  *"Are you hardcoding the Real Property Binding to the 3343 los pradros or you going to fetch it from the tax return dynamically? I don't want any hardcoding."*
- **Root-Cause Analysis:**
  1. When the 9 PDF tax returns were uploaded in `UploadValidationModal.tsx`, the ingestion routine called `generateSyntheticTaxReturnForYear()` (in [`seedData.ts`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/lib/tax/seedData.ts)) as a staging placeholder. That function hardcoded `742 Evergreen Terrace, San Francisco, CA 94107`.
  2. When the user verified and ingested the returns, those synthetic placeholder objects were committed to Firestore and the local storage cache.
  3. When the inspector opened, it read `taxReturn.federal.rentalProperties[0]?.address` from the stored database record, resulting in the synthetic address being displayed.
- **Architectural Principle for v7.2:**
  - **ZERO HARDCODING.** Neither `742 Evergreen Terrace` nor `3343 Los Prados` will be hardcoded in UI components.
  - The property address, rents, and expenses must be **fetched dynamically from `taxReturn.federal.rentalProperties`** as extracted from the filed Schedule E.
  - If a tax return has no rental properties, the UI will dynamically display: `"No Schedule E rental properties reported for tax year {year}"`.

---

## 2. Proposed Architecture & System Workflow

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       BUNBAU v7.2 ARCHITECTURE                                         │
│                                                                                                        │
│   MULTI-YEAR AUDIT INSPECTION FLOW                        DYNAMIC DATA EXTRACTION (0 HARDCODING)       │
│  ┌──────────────────────────────────────────────┐        ┌───────────────────────────────────────────┐ │
│  │ 1. Longitudinal Line Item [Inspect] Click    │        │ 1. Zero Hardcoded Addresses in UI         │ │
│  │ 2. LineItemCardModal Opens (Progression)     │        │ 2. Read dynamically from:                 │ │
│  │ 3. Deep-Link: "Inspect Tax Form Page"        │        │    taxReturn.federal.rentalProperties     │ │
│  │ 4. Opens Dedicated Single-Form Workstation   │        │ 3. Extract Schedule E directly from PDF   │ │
│  │    (NOT 52-page endless scroll)              │        │ 4. Dynamic empty state if no rental       │ │
│  └──────────────────────┬───────────────────────┘        └─────────────────────┬─────────────────────┘ │
│                         │                                                      │                       │
│                         └──────────────────────────┬───────────────────────────┘                       │
│                                                    ▼                                                   │
│   DEDICATED SINGLE-FORM PAGE VIEW                         ORIGINAL UPLOADED PDF WORKSTATION            │
│  ┌──────────────────────────────────────────────┐        ┌───────────────────────────────────────────┐ │
│  │ • Form 1040 P1 (Wages, Interest, Div, AGI)   │        │ • Button: "View Original Uploaded PDF"    │ │
│  │ • Form 1040 P2 (Deductions, Tax, Payments)   │        │ • Opens Authentic Multi-Page PDF Document │ │
│  │ • Schedule B (Interest & Dividends Part I/II)│───────▶│ • Pre-Upload Viewer Technique (Iframe)   │ │
│  │ • Schedule D (Capital Gains & Loss Carryover)│        │ • Tax Year Dropdown (2016 – 2025)         │ │
│  │ • Schedule E (Dynamic Rental Property Data)  │        │ • Detach Full-Screen Portal (100vw×100vh) │ │
│  │ • Form 8582 (Suspended Passive Loss Shield)  │        │ • Print & Download Controls               │ │
│  │ • California Form 540 (Resident State Tax)   │        │ • File Re-attachment Option               │ │
│  │ • Multi-Year Year Switcher [2016..2025]      │        │                                           │ │
│  │ • Canonical Zoom Bar [-] [100%] [+]          │        │                                           │ │
│  └──────────────────────────────────────────────┘        └───────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Engineering Implementation Details

### Phase 1: Pure Dynamic Rental Property Extraction & Zero Hardcoding Guarantee
1. **Dynamic Property Extraction in UI Components:**
   - In the **Dedicated Single-Form Schedule E View**, [`PortfolioTaxStrategyCard.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/PortfolioTaxStrategyCard.tsx), and [`TaxMemoryInspectorModal.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/TaxMemoryInspectorModal.tsx):
     - Bind property addresses dynamically via:
       ```ts
       const properties = taxReturn.federal?.rentalProperties || [];
       ```
     - Iterate through `properties.map((prop) => ...)` to display each physical property address, rents, and expenses.
     - If `properties.length === 0`: render a dynamic empty state: `"No Schedule E rental properties reported for tax year {year}"`.
     - Completely remove all hardcoded address fallback strings from component code.
2. **Purge Synthetic Placeholders in Staging Stubs:**
   - Purge `742 Evergreen Terrace` from [`seedData.ts`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/lib/tax/seedData.ts).
3. **Clean Ingestion & Re-Extraction Pipeline:**
   - Ensure the extraction routine parses the real property address from Schedule E Line 1a of the uploaded PDF returns.
   - Support a clean re-ingestion flow in [`UploadValidationModal.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/UploadValidationModal.tsx) so the user can easily re-extract the 9 uploaded returns without legacy mock residue.

---

### Phase 2: Form & Schedule Routing Engine Calibrations
1. **Explicit Target Form Indexing in [`longitudinalEngine.ts`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/lib/tax/longitudinalEngine.ts):**
   - Add explicit `targetSchedule` identifier to `LongitudinalLineItem`:
     - `w2_wages` $\rightarrow$ `1040_p1` (Line 1z)
     - `taxable_interest` $\rightarrow$ `schedule_b` (Line 4)
     - `ordinary_dividends` $\rightarrow$ `schedule_b` (Line 6)
     - `qualified_dividends` $\rightarrow$ `1040_p1` (Line 3a)
     - `capital_gains` $\rightarrow$ `schedule_d` (Line 16)
     - `rental_income` $\rightarrow$ `schedule_e` (Line 26)
     - `agi` $\rightarrow$ `1040_p1` (Line 11)
     - `deductions_claimed` $\rightarrow$ `1040_p2` (Line 12)
     - `taxable_income` $\rightarrow$ `1040_p2` (Line 15)
     - `federal_tax` $\rightarrow$ `1040_p2` (Line 24)
     - `california_tax` $\rightarrow$ `ca_540` (Line 48)
     - `total_combined_tax` $\rightarrow$ `1040_p2` (Combined Total)
     - `federal_withholding` $\rightarrow$ `1040_p2` (Line 25d)
     - `estimated_payments` $\rightarrow$ `1040_p2` (Line 26)
     - `overpayment_applied` $\rightarrow$ `1040_p2` (Line 36)
     - `capital_loss_carryover` $\rightarrow$ `schedule_d` (Line 21)
     - `passive_loss_carryover` $\rightarrow$ `form_8582` (Line 16)
2. **Deep-Link Button Labels in [`LongitudinalComparisonCard.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/LongitudinalComparisonCard.tsx):**
   - The inspector modal deep-link buttons will accurately reflect the destination form:
     - `[Eye View 2025 Schedule B (Line 6)]` (for Ordinary Dividends)
     - `[Eye View 2025 Form 1040 (Line 11)]` (for AGI)
     - `[Eye View 2025 Schedule E (Line 26)]` (for Rental Real Estate)
     - `[Eye View 2025 Schedule D (Line 16)]` (for Capital Gains)
     - `[Eye View 2025 California Form 540 (Line 48)]` (for CA Tax)

---

### Phase 3: Dedicated Single Form / Schedule Page View (`TaxSingleFormViewer.tsx`)
- Replaces the 52-page scroll for inspected items with an authentic, single-schedule workstation:
  - **Schedule B:** Displays Part I (Interest Income by payer) and Part II (Ordinary Dividends by payer: Fidelity Index Fund, Vanguard, Webull ETF; Line 6 highlighted). Does **not** render Schedule E rental real estate.
  - **Schedule E (Part I):** Displays dynamically extracted properties from `taxReturn.federal.rentalProperties`, showing real physical property address, Gross Rents, itemized expenses, and Net Rental Loss.
  - **Form 1040 Page 1 & Page 2:** Full official line structure with the inspected line item highlighted.
  - **California Form 540:** Line 17 CA AGI, Line 48 CA Tax after credits, Line 76 CA payments.
- **Workstation Controls:**
  - **Multi-Year Quick Switcher:** `[ 2016 | 2017 | ... | 2024 | 2025 ]` pills to jump across years on the same schedule with one click.
  - **Canonical Accessibility Zoom Bar:** `[-] [100%] [+]` scaling.
  - **Line-Item Highlighter:** Glowing emerald ring and badge on the specific line inspected.
  - **One-Click Copy & Print.**
  - **Prominent Action Button:** `"View Original Uploaded PDF (Full Report)"`.

---

### Phase 4: Original Uploaded Tax Return PDF Workstation (`OriginalTaxPdfViewerModal.tsx`)
- Referencing the Pre-Upload PDF Preview in `UploadValidationModal.tsx`:
  - Renders the full authentic multi-page PDF document via browser `iframe` / `object`.
  - **Tax Year Dropdown:** `[ 2025 Return ▾ ]` to switch between all 9 uploaded years.
  - **React Portal Detach:** Spans 100vw $\times$ 100vh with zero menu overlap (`z-[100]`).
  - **Canonical Controls:** Accessibility Zoom Bar, Download, and Print.
- Accessible directly from:
  1. The Line-Item Inspector Modal: `[FileText View Original 2025 PDF (Full Report)]`.
  2. The Single Form View top toolbar: `[FileText View Original Uploaded PDF]`.
  3. The Document Vault workspace: toggle between `Single Form Sheet View` and `Original Uploaded PDF`.

---

### Phase 5: Automated Testing & Version Guard
1. **Unit & Integration Tests:**
   - `single_form_inspector_routing.test.ts`: Verifies Ordinary Dividends routes to Schedule B, AGI to 1040 P1, Rental to Schedule E, and Schedule B contains no rental property.
   - `dynamic_property_extraction.test.ts`: Asserts zero hardcoded address strings in UI components and verifies dynamic extraction from `rentalProperties`.
   - `original_pdf_workstation.test.ts`: Verifies full report PDF player button, year switching, and modal behavior.
2. **Version Synchronization to `2.7.14 (Build 129)`:**
   - [`tests/unit/tax/version_guard.test.ts`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/tests/unit/tax/version_guard.test.ts)
   - [`package.json`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/package.json)
   - [`src/components/AboutModal.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/AboutModal.tsx)
   - [`src/app/page.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/app/page.tsx)
3. **Full Regression Execution:**
   - Run `npm test` (ensuring 100% green across all 108+ suites).
   - Run `npm run build` (Next.js 15 production build verification).

---

## 4. Verification Checkpoints

| Checkpoint | Target State |
| :--- | :--- |
| **Zero Hardcoding Enforcement** | Zero occurrences of hardcoded property address strings in component rendering; all rental data reads dynamically from `rentalProperties`. |
| **Inspect Ordinary Dividends** | Opens Schedule B with Interest & Dividends breakdown (Part I & II). Does NOT show Schedule E rental property. |
| **Inspect AGI / Wages** | Opens Form 1040 Page 1 with highlighted Line 11 / Line 1z. |
| **Inspect Schedule E Rental** | Opens Schedule E Part I with dynamic property address extracted from the return. |
| **Original Uploaded PDF Button** | Button opens authentic full-report PDF player with year dropdown and detach portal. |
| **Version Alignment** | `2.7.14 (Build 129)`, Arch `v2.9.7`. All 108+ test suites pass. |
