# BunBau v7.1 Comprehensive Implementation Plan
## Airtight Live-vs-Demo Zero-Bleed Data Partitioning & Universal Canonical Container UX Standardization Architecture

---

### Executive Metadata & Mandatory Tracking
> *"You also need to update the application version/build/architecture version for every iteration build."*

- **Milestone Designation:** `v7.1`
- **Current App Version:** `2.7.12 (Build 127)`
- **Target App Version:** `2.7.13 (Build 128)`
- **Target Architecture Version:** `v2.9.6 Airtight Live-vs-Demo Zero-Bleed Data Partitioning & Universal Canonical Container UX Standardization Architecture`
- **Target Status:** **Pending User Approval**

---

## 1. Deep Forensic Codebase Audit: Demo Data Leaks in Live Mode

A comprehensive, code-level forensic audit was conducted across the entire BunBau codebase (`src/lib/tax/`, `src/lib/rag/`, `src/components/tax/`, `src/contexts/`, and `src/app/api/`). 

We identified **eight distinct architectural vectors** where synthetic demo data (Alex & Jordan Taylor, 742 Evergreen Terrace, Pacific Cloud Systems Inc., and mock tax facts) leaked, fell back, or bled into Live User Mode:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   FORENSIC AUDIT: 8 DEMO DATA INFILTRATION VECTORS                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. TaxProfileHelper.ts (Line 151 & 200)                                                │
│    • resolveLiveTaxpayerProfile() initialized using { ...DEMO_TAX_FILING_PROFILE }    │
│    • Inherited demo employer ('Pacific Cloud Systems Inc.'), demo address, & demo DOBs │
│                                                                                        │
│ 2. HybridRetriever.ts (Line 39) & TaxPortfolioChunker.ts (Line 22)                     │
│    • RAG knowledge retrieval defaulted to [TAX_RETURN_2024, TAX_RETURN_2025] (Taylor) │
│    • Tax Co-Pilot & Strategist prompt injections indexed synthetic demo returns in Live│
│                                                                                        │
│ 3. ProactiveTaxChatDrawer.tsx (Line 108) & /api/v1/tax/chat/route.ts                   │
│    • Called getSharedRagContext(promptText) without passing live user tax returns      │
│    • AI Copilot generated recommendations grounded in synthetic demo figures           │
│                                                                                        │
│ 4. TaxContext.tsx (Lines 98–101 & 109–111)                                             │
│    • activeReturn2024 & activeReturn2025 spread DEMO_TAX_RETURN_2024/2025 in Live Mode │
│    • Missing years in user uploads silently inherited synthetic demo numbers           │
│                                                                                        │
│ 5. PortfolioTaxStrategyCard.tsx (Lines 163 & 170)                                      │
│    • Hardcoded '742 Evergreen Terrace' directly into passive loss strategy cards       │
│                                                                                        │
│ 6. TaxMemoryInspectorModal.tsx (Line 17)                                               │
│    • Defaulted facts to INITIAL_USER_TAX_FACTS from seedData.ts                        │
│    • Displayed 'Jordan Taylor @ Pacific Cloud Systems' & 'Alex Taylor age 65' in Live  │
│                                                                                        │
│ 7. TaxPreImportReviewModal.tsx (Line 19)                                               │
│    • Defaulted taxReturns prop to [DEMO_TAX_RETURN_2024, DEMO_TAX_RETURN_2025]        │
│                                                                                        │
│ 8. LifecyclePlanningEngine.ts (Line 14 & 31)                                           │
│    • Default parameter defaulted to DEMO_TAX_RETURN_2025                               │
│    • earnerEmployer fell back to earnerSpouse.employerName ('Pacific Cloud Systems')   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### The Root-Cause Solution: Airtight Zero-Bleed Tenant Partitioning
In v7.1, we institute a strict architectural firewall between Demo Mode and Live User Mode:
1. **Isolated Profile Construction:** `resolveLiveTaxpayerProfile()` will **never** spread `DEMO_TAX_FILING_PROFILE_2024_2025`. In Live Mode, it starts from a clean `createEmptyTaxpayerProfile()`, extracting 100% of its data from authenticated user metadata and parsed tax documents.
2. **Accurate Employer Resolution:** For Ivan Wong, `employerName` strictly resolves to **`ViaPath Technologies inc.`** (corroborated by live W-2 files and Fidelity 401(k) accounts).
3. **Dynamic Schedule E Rental Resolution:** `PortfolioTaxStrategyCard` dynamically retrieves the real property address from `scheduleE.rentalProperties[0].address` or outputs `Schedule E rental real estate property`, completely eliminating `742 Evergreen Terrace`.
4. **Live RAG Context Injection:** `getSharedRagContext()` and `/api/v1/tax/chat/route.ts` will accept `liveTaxReturns`. When the user is in Live Mode, RAG strictly chunks and retrieves the authenticated user's actual returns, ensuring zero demo data leaks into AI prompt context.
5. **No Demo Fallback in Live Mode:** In `TaxContext.tsx`, missing return years in Live Mode will return `null` or empty models, never spreading synthetic demo data.

---

## 2. Universal BunBau Canonical Container UX Standard

Every page, container, card, and modal in the application will strictly implement the canonical 4-pillar BunBau UX standard:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              BUNBAU CONTAINER UX STANDARD                              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [Icon] Container Title                                  [((i)) Info] [Chart|Table]   │
│  Subtitle / Contextual Taxpayer Labels                   [A- 100% A+] [Copy] [Expand] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  MODE 1: Visual Interactive Graphics (Chart Mode)                                      │
│  • Side-by-side comparative bar charts, timeline milestone scrubbers, or gauges        │
│                                                                                        │
│  MODE 2: Structured Tabular Data (Table Mode)                                          │
│  • Searchable, sortable SmartTable with line-item breakdowns and variance columns      │
│                                                                                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  ACTIONABLE GUIDANCE & STRATEGY CARDS:                                                 │
│  • Statutory IRC citations, execution deadlines, and fiduciary action plans           │
│  • Dedicated [Copy Action Plan] button with instant 2-second "Copied!" toast feedback  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### The 4 Canonical Container Controls:
1. **Information Explainer (`((i))`):**
   - Clickable icon opening a high-clarity popover/modal detailing:
     - The financial/tax metric definition.
     - Statutory IRC / Treasury Regulation citations (IRC §62, §469, §1212, §6654, §2210, SECURE 2.0 §107, Medicare rules).
     - CFA/CPA fiduciary methodology and planning rules.
2. **Visual Chart vs. Tabular Numbers Toggle:**
   - Seamless toggling between intuitive visual graphics (bar charts, milestone cards, threshold gauges) and structured numerical tables (SmartTable, line-item matrices).
3. **One-Click Action Item Copy (`Copy to Clipboard`):**
   - Integrated with `navigator.clipboard.writeText` and a 2-second visual confirmation (`Check` icon + "Copied!").
   - Copies clean, formatted Markdown text of fiduciary action plans, milestone dates, and strategy execution steps.
4. **Canonical Accessibility Zoom Bar:**
   - Powered by `AccessibilityZoomBar` (`[-] [100%] [+]` and reset) and responsive scale styling.

---

## 3. Container-by-Container Standardization Specification

| Container / Module | Info Icon Explainer `((i))` | Chart vs. Tabular Toggle | One-Click Copy Option | Data Isolation Fix |
|---|---|---|---|---|
| **Overview KPI Cards** (`TaxExecutiveSummaryCards.tsx`) | Popover on AGI (IRC §62), Total Tax, Effective Rate, and Loss Shields | Toggle between numeric cards and comparative Bar Chart (2025 vs 2024) | Button to copy executive KPI summary | Zero demo fallback; strictly latest vs prior live returns |
| **Income & Tax Trends** (`MultiYearTrendCard.tsx`) | Popover on income progression & bracket thresholds | Progression Bar Chart vs. SmartTable | Copy table data / CSV export | Powered by `AppletContainer` with live returns |
| **Itemized Deductions** (`MultiYearDeductionsCard.tsx`) | Popover on Schedule A deductions & standard deduction | Deduction breakdown bars vs. SmartTable | Copy table data / CSV export | Powered by `AppletContainer` with live returns |
| **Strategic Lifecycle Roadmap** (`TaxLifecycleTimeline.tsx`) | Popover on CFA/CPA milestone sequencing (Ages 62–75) | Visual timeline scrubber vs. Chronological Roadmap Table | Container "Copy All Actions" + Per-card "Copy Action Item" | **ViaPath Technologies inc.** resolved for Ivan Wong; zero Pacific Cloud residue |
| **Social Security Planner** (`SocialSecurityPlannerCard.tsx`) | Popover on SSA earnings test ($23,400) & delayed credits | Payout Bar Graph (62 vs 67 vs 70) vs. Payout Table | "Copy Claiming Strategy" button | Earner W-2 wages from live return |
| **Medicare Health Plan** (`MedicareHealthPlanCard.tsx`) | Popover on IEP window, Part B delay, Part D creditable coverage | 3-Column scenario cards vs. Coordination Matrix Table | "Copy Coordination Plan" button | **ViaPath Technologies inc.** as group employer; zero Pacific Cloud |
| **IRMAA Cliff Monitor** (`IrmaaCliffMonitorCard.tsx`) | Popover on IRMAA 2-year lookback & MAGI tiers | Visual threshold gauge vs. Surcharge Tier Table | "Copy IRMAA Guidance" button | Actual MAGI from live return |
| **RMD & Roth Conversion** (`RmdRothConversionCard.tsx`) | Popover on SECURE 2.0 Age 75 RMD & 10-Yr Tax Valley | 3-Pillar visual cards vs. Depletion Schedule Table | "Copy Conversion Plan" button | Uses live taxpayer ages and pre-tax balances |
| **9-Year Longitudinal Audit** (`LongitudinalComparisonCard.tsx`) | Popover on 9-year audit methodology and CAGR math | Matrix Table view vs. Macro Trends Visual Charts | "Copy Audit Summary" button | Pure live returns; zero synthetic mock rows |
| **Line-Item Inspector Modal** (in `LongitudinalComparisonCard.tsx`) | Popover on line item & IRS Form reference | 9-Year numeric grid vs. 9-Year Historical Trend Chart | "Copy Line Item Analysis" button | Dynamic PDF deep links to exact page & line |
| **Portfolio Tax Strategy** (`PortfolioTaxStrategyCard.tsx`) | Popover on Schedule B/D/E cross-asset loss shielding | 4-Card strategy layout vs. Loss Shield Waterfall Chart | **Dedicated "Copy Action Plan" on all 4 cards** | Purged `742 Evergreen Terrace`; dynamically loads Schedule E property |
| **Persistent User Tax Memory** (`TaxMemoryInspectorModal.tsx`) | Popover on RAG persistent factual grounding | Card list vs. Category table | "Copy Taxpayer Facts" button | Purged `INITIAL_USER_TAX_FACTS`; displays live user facts only |
| **PDF Document Viewer** (`BunBauDocumentViewer.tsx`) | Document Info modal `((i))` with file metadata | React Portal Detached Window (`z-[100]`) vs. Embedded | Copy citation / page reference | Clean display of user's uploaded tax PDFs |

---

## 4. Multi-Phase Implementation Plan

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              BUNBAU v7.1 EXECUTION PHASES                              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  Phase 1: Airtight Zero-Bleed Data Partitioning & W-2 Employer Resolution              │
│           • Refactor resolveLiveTaxpayerProfile(): create clean profile without demo   │
│           • Set Ivan Wong employerName = 'ViaPath Technologies inc.'                   │
│           • Purge hardcoded 'Pacific Cloud Systems Inc.' & '742 Evergreen Terrace'     │
│           • Update TaxContext.tsx: eliminate demo spreads in Live Mode                 │
│           • Update HybridRetriever & chunkTaxReturnsAndPortfolio for live returns only │
│                                                                                        │
│  Phase 2: Overview KPI Cards Standard UX (Chart/Table Toggle, Info, Copy)              │
│           • Add Info popover ((i)) on AGI, Total Tax, Effective Rate, Loss Shields     │
│           • Add Visual Bar Chart toggle (2025 vs 2024 comparison)                      │
│           • Add Executive KPI Summary Copy button with 'Copied!' toast feedback        │
│                                                                                        │
│  Phase 3: Strategic Lifecycle Roadmap & Forward-Looking Cards UX Standardization      │
│           • TaxLifecycleTimeline: Info icon, Chart/Table toggle, Copy All Actions      │
│           • Dedicated 'Copy Fiduciary Action Item' button on each milestone card       │
│           • Standardize Social Security, Medicare, IRMAA, and RMD/Roth cards           │
│                                                                                        │
│  Phase 4: Multi-Year Longitudinal Audit & Line-Item Inspector Modal                    │
│           • LongitudinalComparisonCard: Info icon, Macro Chart toggle, Copy Summary    │
│           • Line-Item Inspector Modal: 9-year trend chart toggle & Copy Analysis button│
│                                                                                        │
│  Phase 5: Active Portfolio Tax Drag & Loss Shield Strategy                             │
│           • PortfolioTaxStrategyCard: Info popover & Loss Shield Waterfall chart toggle│
│           • Dedicated 'Copy Action Plan' button on all 4 strategy cards                │
│           • Dynamic Schedule E rental address (never hardcoded 742 Evergreen)          │
│                                                                                        │
│  Phase 6: Persistent Tax Memory & AI Copilot Grounding Fix                             │
│           • TaxMemoryInspectorModal: eliminate INITIAL_USER_TAX_FACTS in Live Mode     │
│           • Wire ProactiveTaxChatDrawer to pass live tax returns to RAG retriever      │
│                                                                                        │
│  Phase 7: Version Synchronization, Regression Testing & Production Build               │
│           • package.json: 2.7.13, AboutModal: 2.7.13 (Build 128), Arch: v2.9.6         │
│           • Authored comprehensive unit tests for data isolation & standard UX         │
│           • 100% green test execution (625+ tests) & verified Next.js 15 build         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Verification & Acceptance Criteria

1. **Zero Demo Data Leakage:**
   - In Live Mode, search across DOM, RAG prompt contexts, and state confirms **zero** occurrences of `Alex Taylor`, `Jordan Taylor`, `Pacific Cloud Systems Inc.`, `742 Evergreen Terrace`, or `San Francisco Wealth & Tax Advisory`.
2. **ViaPath Technologies inc. Verification:**
   - Milestone Year 2027 reads: *"Coordinate with Ivan Wong’s ViaPath Technologies inc. employer health insurance."*
   - Fiduciary Action Item reads: *"Delay Part B & Part D without penalty if ViaPath Technologies inc. group coverage remains active."*
   - Medicare coordination card lists `ViaPath Technologies inc.` as Ivan Wong's employer.
3. **Universal Container UX Consistency:**
   - Every single container features an Info explainer `((i))`.
   - All analytical containers feature a seamless toggle between Visual Chart and Tabular Numbers.
   - Every action recommendation card features a dedicated Copy button with immediate visual feedback.
   - All containers comply with accessibility scaling via `AccessibilityZoomBar`.
4. **Complete Test Suite & Production Build:**
   - 106+ test suites passing with 100% green status.
   - Next.js 15 production build compiles with zero errors across all 16 static and dynamic routes.

---

Please review this comprehensive plan. Once you click **Proceed** or reply with approval, I will execute all phases immediately.
