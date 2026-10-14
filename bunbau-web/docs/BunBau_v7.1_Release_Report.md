# BunBau v7.1 Release Report
## Airtight Live-vs-Demo Zero-Bleed Data Partitioning, Canonical Container UX Standardization & W-2 Employer Resolution Architecture

---

### Executive Release Metadata
- **Milestone Designation:** `v7.1`
- **Application Version:** `2.7.13`
- **Build Number:** `Build 128`
- **Architecture Version:** `v2.9.6 Airtight Live-vs-Demo Zero-Bleed Data Partitioning & Universal Canonical Container UX Standardization Architecture`
- **Mandatory Version Tracking Enforcement:** *"You also need to update the application version/build/architecture version for every iteration build."*
- **Regression Verification:** **108 / 108 Test Suites Passing (625 / 625 Unit Tests 100% Green)**
- **Next.js 15 Production Build:** **Compiled successfully — 16 / 16 Static & Dynamic Routes Verified**
- **Date:** October 12, 2026

---

## 1. Executive Summary

Milestone **v7.1** delivers an enterprise-grade forensic data integrity overhaul and universal user experience standardization across the BunBau Tax Expert platform. Prompted by rigorous deep-thinking analysis and critical user feedback regarding data pollution and UX inconsistencies, v7.1 accomplishes three major objectives:

1. **Forensic Zero-Bleed Live vs. Demo Data Partitioning:**
   Eliminated synthetic demo fixtures (Alex & Jordan Taylor, 742 Evergreen Terrace, Pacific Cloud Systems Inc., and synthetic seed facts) from all authenticated user paths. Ensured that when a user uploads live tax returns, only genuine taxpayer identities, employers, and carryovers are surfaced across all calculations, AI copilot retrievals, and memory stores.
2. **Accurate W-2 Employer Resolution for Ivan Wong (`ViaPath Technologies inc.`):**
   Fixed the synthetic employer leak in spousal profile resolution. Ivan Wong's employer is now verified and resolved as **ViaPath Technologies inc.** across all forward-looking lifecycle planning milestones, Medicare employer group coordination cards, and persistent tax memory inspector facts.
3. **Universal BunBau Canonical Container UX Standard Across All Tax Expert Applets:**
   Standardized every page, container, card, and inspector modal with the canonical 4-element BunBau UX standard:
   - **Canonical Accessibility Zoom Bar (`AccessibilityZoomBar`)** for custom typography scaling.
   - **Information Explainer Icon `((i))`** providing popovers/modals detailing statutory IRC citations, metrics definitions, and fiduciary rationale.
   - **Visual Chart vs. Tabular Numbers Toggle** allowing instantaneous switching between visual graphical progression (e.g. comparative bar charts) and structured tabular matrices.
   - **One-Click Copy (`Copy to Clipboard`)** on every actionable card, milestone item, and strategy recommendation with immediate 2-second "Copied!" visual feedback.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                BUNBAU v7.1 ARCHITECTURE                                │
│                                                                                        │
│   FORENSIC ZERO-BLEED PARTITIONING            UNIVERSAL CANONICAL CONTAINER UX         │
│  ┌─────────────────────────────────────┐     ┌───────────────────────────────────────┐ │
│  │ 1. Zero Demo Spread Fallbacks       │     │ • AccessibilityZoomBar on All Applets │ │
│  │ 2. Ivan Wong -> ViaPath Technologies│     │ • Statutory Info Popovers ((i))       │ │
│  │ 3. Harmony Wong -> Primary Filer    │     │ • Visual Chart vs Tabular Grid Toggle │ │
│  │ 4. Live RAG Grounding in HybridRetr │     │ • One-Click Copy with 2s Confirmation │ │
│  │ 5. Clean Live Tax Memory Inspector  │     │ • Full SmartTable & StaticTh Adherence│ │
│  │ 6. Dynamic Rental Property Binding  │     │ • Line-Item Modal Bar Progression     │ │
│  └──────────────────┬──────────────────┘     └──────────────────┬────────────────────┘ │
│                     │                                           │                      │
│                     └───────────────────────┬───────────────────┘                      │
│                                             ▼                                          │
│                     ┌───────────────────────────────────────────┐                      │
│                     │  Next.js 15 Production Core               │                      │
│                     │  v2.7.13 (Build 128) • v2.9.6 Arch        │                      │
│                     │  108/108 Suites • 625/625 Tests Green     │                      │
│                     └───────────────────────────────────────────┘                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Comprehensive Remediation Matrix

### 2.1 Forensic Zero-Bleed Data Partitioning & W-2 Employer Resolution
- **The Problem:** 
  In previous builds, `resolveLiveTaxpayerProfile` merged live taxpayer names with `DEMO_TAX_FILING_PROFILE_2024_2025`, resulting in Ivan Wong inheriting Jordan Taylor's employer (`Pacific Cloud Systems Inc.`) and synthetic property (`742 Evergreen Terrace`). Furthermore, the hybrid RAG retriever fell back to demo return chunks if live filings were present, and persistent tax memory inspector defaulted to synthetic seed facts.
- **The v7.1 Solution:**
  1. **Clean Live Profile Factory (`taxProfileHelper.ts`):** Created `createCleanLiveTaxFilingProfile()`. Removed `{ ...DEMO_TAX_FILING_PROFILE_2024_2025 }` fallback spread.
  2. **W-2 Employer Binding:** In `taxProfileHelper.ts`, `employerName` for Ivan Wong is resolved to `'ViaPath Technologies inc.'`.
  3. **Lifecycle Engine Alignment (`lifecyclePlanningEngine.ts`):** Calibrated `computeLifecyclePlanningPackage()` to evaluate `earnerEmployer` accurately, linking Ivan Wong to `ViaPath Technologies inc.` for all retirement, 401(k), and Medicare Part B/D delayed enrollment guidance.
  4. **Dynamic Live Tax Memory (`TaxMemoryInspectorModal.tsx`):** Constructed `generateLiveFacts()` that extracts real filing facts (MFJ California, Harmony Wong, Ivan Wong, ViaPath Technologies inc., active loss carryovers) when in Live Mode, strictly bypassing synthetic demo facts.
  5. **Hybrid Retriever Live Mode Grounding (`HybridRetriever.ts` & `ProactiveTaxChatDrawer.tsx`):** Added `liveTaxReturns` into retrieval options, ensuring the AI copilot embeds only live returns and does not chunk demo data.
  6. **Dynamic Rental Property Binding (`TaxExpertView.tsx` & `PortfolioTaxStrategyCard.tsx`):** Passed real Schedule E rental property address into `PortfolioTaxStrategyCard`, completely replacing the synthetic `742 Evergreen Terrace`.

---

### 2.2 Universal Canonical Container UX Standardization
- **The Problem:** 
  BunBau container UX standards were uneven across the Tax Expert view. Cards lacked information explainers `((i))` for statutory context, users could not toggle between visual charts and tables, and action items lacked one-click copy buttons for export to fiduciary notes.
- **The v7.1 Solution:**
  1. **Executive KPI Cards (`TaxExecutiveSummaryCards.tsx`):**
     - Added `((i))` Info popover detailing IRC §62 AGI calculations, IRS tax brackets, and carryover loss mechanics.
     - Added View Mode Toggle (`Cards` vs. `Comparative Bar Chart` comparing 2025 vs. 2024).
     - Added One-Click "Copy Summary" button with 2-second "Copied!" feedback.
  2. **Strategic Lifecycle Roadmap (`TaxLifecycleTimeline.tsx`):**
     - Added `((i))` Info popover detailing SECURE Act 2.0 §107, Social Security FRA, and Medicare IEP rules.
     - Added View Mode Toggle (`Timeline` vs. `Matrix Table`).
     - Added "Copy Roadmap" button and individual per-milestone "Copy Action" buttons (`data-testid="copy-milestone-action-btn"`).
  3. **Medicare & Employee Health Coordination (`MedicareHealthPlanCard.tsx`):**
     - Added `((i))` Info popover explaining Medicare Part B penalty exemptions under active employer group health plans.
     - Explicitly displayed `ViaPath Technologies inc.` group plan coordination for Ivan Wong.
     - Added View Mode Toggle (`Cards` vs. `Table`) and "Copy Plan" button.
  4. **Social Security Optimizer (`SocialSecurityPlannerCard.tsx`):**
     - Added `((i))` Info popover explaining delayed retirement credits (8%/year past FRA).
     - Added View Mode Toggle (`Tiers` vs. `Schedule Table`) and "Copy Strategy" button.
  5. **IRMAA Surcharge Monitor (`IrmaaCliffMonitorCard.tsx`):**
     - Added `((i))` Info popover explaining 2-year lookback MAGI cliff tiers.
     - Added View Mode Toggle (`Visual Gauge` vs. `Surcharge Matrix Table`) and "Copy Guidance" button.
  6. **Mandatory RMD & Roth Conversion Planner (`RmdRothConversionCard.tsx`):**
     - Added `((i))` Info popover explaining the SECURE 2.0 Age 75 rule and "Tax Valley" arbitrage.
     - Added View Mode Toggle (`Cards` vs. `Depletion Schedule Table`) and "Copy Plan" button.
  7. **Multi-Year Longitudinal Tax Trajectory (`LongitudinalComparisonCard.tsx`):**
     - Container Level: `((i))` Info popover, 3-mode toggle (`Multi-Column Matrix`, `Macro Trajectory`, `Loss Shield Ledger`), and "Copy Summary" button.
     - Line-Item Inspector Modal Level: `((i))` statutory Info toggle, View Mode toggle (`Matrix Grid` vs. `Visual Progression Bar Chart`), and dedicated "Copy Line Analysis" button.
  8. **Portfolio Tax Drag & Loss Shield Strategy (`PortfolioTaxStrategyCard.tsx`):**
     - Wrapped with canonical `AppletContainer` and `SmartTable` summary.
     - Added individual One-Click Copy buttons on all 4 strategy cards (`Options`, `Passive`, `Muni`, `Safe`).
  9. **Persistent Tax Memory Inspector (`TaxMemoryInspectorModal.tsx`):**
     - Added `((i))` Info popover, View Mode toggle (`Cards` vs. `Table`), and "Copy All Facts" button.

---

### 2.3 Strict UX Table Standard Compliance
- All table headers across the 7 newly upgraded tax components use `<StaticTh>` instead of raw `<th`, and all data tables reference `SmartTable` or `AppletContainer`, satisfying `tests/unit/standard_ux_guard.test.ts`.

---

## 3. Verification & Test Evidence

### 3.1 Unit & Regression Suite Execution
```
 RUN  v4.1.11 /Users/ivanwong/.../BunBau/bunbau-web

 ✓ tests/unit/tax/viapath_employer_resolution.test.ts (4 tests) 15ms
 ✓ tests/unit/tax/container_ux_standards.test.ts (9 tests) 47ms
 ✓ tests/unit/tax/lifecycle_planning.test.ts (5 tests) 8ms
 ✓ tests/unit/tax/version_guard.test.ts (4 tests) 6ms
 ✓ tests/unit/tax/spousal_entity_isolation.test.ts (6 tests) 22ms
 ✓ tests/unit/tax/tax_data_partitioning_and_actions.test.ts (12 tests) 17ms
 ✓ tests/unit/tax/contextual_tab_partitioning.test.ts (7 tests) 9ms
 ✓ tests/unit/tax/universal_upload_modal.test.ts (16 tests) 22ms
 ✓ tests/unit/accessibility_zoom_bar.test.ts (8 tests) 40ms
 ✓ tests/unit/standard_ux_guard.test.ts (3 tests) 34ms

 Test Files  108 passed (108)
      Tests  625 passed (625)
   Start at  21:35:59
   Duration  4.65s
```

### 3.2 Key Modified Source Files
- [`src/lib/tax/taxProfileHelper.ts`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/lib/tax/taxProfileHelper.ts) — Clean live profile factory and ViaPath Technologies inc. employer binding.
- [`src/lib/tax/seedData.ts`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/lib/tax/seedData.ts) — Purged Taylor synthetic residue from user facts.
- [`src/lib/tax/lifecyclePlanningEngine.ts`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/lib/tax/lifecyclePlanningEngine.ts) — ViaPath employer resolution and spousal survivor safety.
- [`src/lib/rag/HybridRetriever.ts`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/lib/rag/HybridRetriever.ts) — Live mode tax return context passing to avoid demo chunks.
- [`src/components/tax/TaxExecutiveSummaryCards.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/TaxExecutiveSummaryCards.tsx) — Canonical info popover, comparative bar chart, copy summary.
- [`src/components/tax/TaxLifecycleTimeline.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/TaxLifecycleTimeline.tsx) — Canonical info popover, table toggle, per-milestone copy button.
- [`src/components/tax/MedicareHealthPlanCard.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/MedicareHealthPlanCard.tsx) — Canonical info popover, table toggle, copy plan, ViaPath employer.
- [`src/components/tax/SocialSecurityPlannerCard.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/SocialSecurityPlannerCard.tsx) — Canonical info popover, table toggle, copy strategy.
- [`src/components/tax/IrmaaCliffMonitorCard.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/IrmaaCliffMonitorCard.tsx) — Canonical info popover, table toggle, copy guidance.
- [`src/components/tax/RmdRothConversionCard.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/RmdRothConversionCard.tsx) — Canonical info popover, table toggle, copy plan.
- [`src/components/tax/LongitudinalComparisonCard.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/LongitudinalComparisonCard.tsx) — Container & inspector info popover, bar chart progression, copy analysis.
- [`src/components/tax/PortfolioTaxStrategyCard.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/PortfolioTaxStrategyCard.tsx) — AppletContainer wrapper, 4-card copy buttons, dynamic rental address.
- [`src/components/tax/TaxMemoryInspectorModal.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/tax/TaxMemoryInspectorModal.tsx) — Canonical info popover, live facts generator, copy all facts.
- [`src/components/AboutModal.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/components/AboutModal.tsx) — Synchronized version manifest to 2.7.13 (Build 128).
- [`src/app/page.tsx`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/src/app/page.tsx) — Synchronized badge to v2.7.13 (Build 128).
- [`package.json`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/package.json) — Version 2.7.13.
