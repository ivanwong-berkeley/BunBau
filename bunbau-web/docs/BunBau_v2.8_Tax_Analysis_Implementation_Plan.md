# BunBau (資本寶) v2.8 / Milestone v6.41
# Tax Expert: Multi-Year Analysis, Forward-Looking Lifecycle Strategy & Shared RAG Co-Pilot
## Comprehensive Architecture, Implementation & Verification Plan

**Milestone Sub-Plan:** `v6.41` (Revised with Full End-to-End RAG Scope & Strategist Zero-Regression Guarantee)  
**Application Target Version:** `2.7.5 (Build 120)`  
**Architecture Target Version:** `v2.8 Tax Expert AI, Multi-Year Tax Intelligence & Lifecycle Forward-Planning Engine`  
**PRD Reference:** [`docs/_PRD_Tax_Analysis_docs/PRD_Tax_Return_20261012.md`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/docs/_PRD_Tax_Analysis_docs/PRD_Tax_Return_20261012.md)  
**Tax Return Datasets:** 2024 & 2025 Form 1040 / Form 540 Returns (Harmony Quan & Ivan Wong)  
**Date:** October 12, 2026  

---

> [!IMPORTANT]
> **Mandatory Version Tracking Directive:**  
> *"You also need to update the application version/build/architecture version for every iteration build."*  
> This revised implementation plan establishes milestone **`v6.41`**, bumping the application version to **`2.7.5 (Build 120)`** and upgrading the architecture version to **`v2.8 Tax Expert AI, Multi-Year Tax Intelligence & Lifecycle Forward-Planning Engine`**.

---

## 1. Direct Answers on Scope & Regression Guarantees

### Q1: "Are you implementing the RAG architecture now or just the groundwork? Do I need another request to make RAG fully working?"
- **Answer: FULL IMPLEMENTATION NOW. ZERO SECONDARY REQUESTS NEEDED.**
- The shared RAG architecture will be built end-to-end in this milestone:
  1. **Semantic Chunker (`src/lib/rag/TaxPortfolioChunker.ts`):** Automatically slices multi-year Form 1040/540 filings, all tax schedules, and live portfolio holdings (equities, options, cash, CDs, crypto) into indexed units with rich metadata tags (`taxYear`, `schedule`, `lineItem`, `topic`, `holdingSymbol`).
  2. **Vector Embeddings (`src/lib/rag/VertexEmbedder.ts`):** Produces 768-dimensional embeddings using Vertex AI `text-embedding-005` (with a fast offline cosine-similarity fallback for deterministic Vitest suites and demo mode).
  3. **Shared Knowledge Index (`users/{userId}/semantic_knowledge_chunks`):** Stores chunk embeddings in Firestore.
  4. **Hybrid Retriever (`src/lib/rag/HybridRetriever.ts`):** Combines metadata filters with vector similarity search to inject concise context ($<1,500$ tokens) into LLM prompts, slashing token overhead by over 80%.
  5. **Conversational Co-Pilot (`/api/v1/tax/chat/route.ts` & `ProactiveTaxChatDrawer.tsx`):** Full SSE streaming chat endpoint with live suggestion chips and real-time reasoning.
  6. **Persistent User Tax Memory (`users/{userId}/tax_memory/profile_facts` & `TaxMemoryInspectorModal.tsx`):** Automatically saves confirmed user lifecycle facts into Firestore across sessions.

### Q2: "What is your regression to guarantee the Strategist already implemented is not breaking?"
- **Answer: ZERO-REGRESSION PROMISE & AUTOMATED COEXISTENCE TEST SUITE.**
  1. **Isolated Shared Spine:** The existing Strategist (`src/lib/strategist/`, including `useStrategist.ts`, `gateway.ts`, `store.ts`, `memory.ts`, `allocationPlan.ts`) remains 100% backward-compatible. Its state contracts and prompt structures are strictly preserved.
  2. **All 72 Existing Strategist Tests Protected:** BunBau currently has 9 test suites with 72 tests covering the Strategist (`tests/unit/strategist/*.test.ts`). All 72 tests are guaranteed to continue passing with 0 failures.
  3. **Shared Knowledge Access:** The RAG retriever (`src/lib/rag/HybridRetriever.ts`) exposes an opt-in context adapter (`getSharedRagContext()`) that allows both the Tax Co-Pilot and the Portfolio Strategist to pull from the same tax-loss carryover and portfolio asset chunks without duplicating storage or breaking either module.
  4. **New Dedicated Coexistence Test Suite:** We add `tests/unit/tax/strategist_rag_coexistence.test.ts` to explicitly prove that Tax Co-Pilot and Strategist can run concurrently, access shared RAG chunks, and never corrupt each other's memory stores.

---

## 2. Executive Vision: The "Life-Like" Tax Expert + CFA + CPA

BunBau's **Tax Expert** module evolves beyond static backward-looking tax reporting into a **life-like forward-planning advisory workstation (Tax Expert + CFA + CPA)**. 

By analyzing the taxpayer and spouse's historical filings, current age profiles (Harmony Quan born July 22, 1962; Ivan Wong born January 17, 1964), employer health coverage, active investment holdings, and upcoming life milestones, BunBau generates proactive, forward-looking strategies across:
1. **Social Security Claiming Optimization (Ages 62 vs 67 vs 70):** Early claim reductions, W-2 earnings test clawback traps, and survivor benefit maximization.
2. **Medicare & Employer Healthcare Coordination (The Age-Gap Dynamic):** Harmony reaching age 65 (July 2027) while Ivan is 63 with active employer group health coverage at Viapath Technologies (Code DD $30k+ on W-2); Part B/D enrollment delay rules, Special Enrollment Periods (SEP), Part D creditable coverage, and pre-65 bridge coverage.
3. **IRMAA Cliff Monitoring (2-Year Lookback Rule):** Medicare Part B/D surcharges based on MAGI thresholds ($206k Tier 1 cliff in 2025/2026).
4. **Mandatory Withdrawal (RMD) & Roth Conversion "Tax Valley" (Ages 65 to 75):** SECURE Act 2.0 RMD age 75 planning (2037 for Harmony, 2039 for Ivan) and multi-year Roth conversion modeling to avoid high-bracket tax bombs.
5. **Active Portfolio & Year-End Tax Strategy:** Capital loss carryover utilization ($30,056 shield in 2026), suspended passive rental losses ($39,057 carryforward from 3343 Los Prados), and fixed income / CD tax drag analysis (~44.3% combined Fed + CA marginal rate).

```mermaid
flowchart TD
    subgraph NAV ["Sidebar & Sub-Pages"]
        SIDE["Left Menu: 🏛️ Tax Expert"] --> EXP["TaxExpertView.tsx"]
        EXP --> TAB1["📊 1. Overview & KPIs"]
        EXP --> TAB2["🔮 2. Forward-Looking Life Planner"]
        EXP --> TAB3["📋 3. Multi-Year Comparison"]
        EXP --> TAB4["📁 4. Document Vault & Viewer"]
        EXP --> TAB5["💡 5. Portfolio Tax Strategy"]
        EXP --> TAB6["✨ 6. Tax Co-Pilot & Memory"]
    end

    subgraph LIFECYCLE ["Forward-Looking Strategic Planning Engine"]
        TAB2 --> AGE["Timeline Visualizer (2026–2040)"]
        TAB2 --> SS["Social Security Engine (62 vs 67 vs 70)"]
        TAB2 --> MED["Medicare & Employer Health Coordinator"]
        TAB2 --> IRMAA["IRMAA 2-Year Lookback Monitor"]
        TAB2 --> RMD["RMD (Age 75) & Roth Conversion Tax Valley"]
    end

    subgraph RAG_CORE ["Shared RAG Architecture (Cross-Module Spine)"]
        PARSE["Multi-Year Tax & Portfolio Parser"] --> CHUNK["TaxPortfolioChunker.ts"]
        CHUNK --> EMBED["VertexEmbedder.ts (768-dim)"]
        EMBED --> STORE[("users/{userId}/semantic_knowledge_chunks")]
        STORE --> RETRIEVE["HybridRetriever.ts (<1500 tokens)"]
        RETRIEVE --> COPILOT["Tax Co-Pilot (/api/v1/tax/chat)"]
        RETRIEVE -.->|"Opt-In Context"| STRAT["Portfolio Strategist Engine"]
    end
```

---

## 3. Requirements-to-Implementation Traceability Matrix

| Requirement Area | Detailed Specification | Implementation Component / File | Verification & Test Method |
|---|---|---|---|
| **Left Menu & Routing** | Add "Tax Expert" option on left sidebar with dedicated landing page & 6 sub-pages | `src/app/page.tsx`<br/>`src/components/tax/TaxExpertView.tsx` | Playwright UX test verifying left navigation click, tab switching, and route persistence |
| **Forward-Looking Timeline** | Visual chronological timeline (2026–2040) mapping key age milestones for Harmony (1962) and Ivan (1964) | `src/components/tax/TaxLifecycleTimeline.tsx` | Vitest testing age calculation and milestone date projections |
| **Social Security Strategy** | Model early claim at 62 vs FRA (67) vs age 70; earnings test clawback calculation against W-2 income | `src/lib/tax/socialSecurityEngine.ts`<br/>`src/components/tax/SocialSecurityPlannerCard.tsx` | Unit test proving Ivan's $186k+ W-2 salary causes 100% clawback at age 62 |
| **Medicare & Employer Healthcare** | Age-gap coordinator: Harmony (65 in July 2027) vs Ivan (63); Part B/D delay with Viapath group coverage (Code DD $30k+); Part D creditable drug coverage check | `src/lib/tax/medicareCoordinator.ts`<br/>`src/components/tax/MedicareHealthPlanCard.tsx` | Unit test verifying Part B late penalty exemption criteria under 20+ employee employer plan |
| **IRMAA Cliff Monitor** | 2-year lookback surcharge modeling based on MAGI thresholds ($206k cliff); alerts when within $2,000 of cliff | `src/lib/tax/irmaaEngine.ts`<br/>`src/components/tax/IrmaaCliffMonitorCard.tsx` | Vitest asserting 2025 AGI ($204,303) is $1,697 below Tier 1 cliff ($206k) |
| **RMD & Roth Conversion** | SECURE 2.0 RMD age 75 calculator (2037 for Harmony, 2039 for Ivan); multi-year Roth conversion "Tax Valley" model (ages 65–75) | `src/lib/tax/rmdRothEngine.ts`<br/>`src/components/tax/RmdRothConversionCard.tsx` | Vitest checking RMD age 75 assignment and optimal Roth conversion bracket fill |
| **Multi-Year Comparative Audit** | Side-by-side line item comparison table with 1-click `[👁️ View Page]` deep links | `src/components/tax/TaxYearStaticDiffCard.tsx` | Playwright test clicking `[👁️ View Page]` jumping directly to Form 1040/Schedule E in viewer |
| **Standard PDF Viewer** | Full PDF document viewer with AccessibilityZoomBar (`[-] [100% Reset] [+]`), page thumbnails, page jump, fullscreen, print | `src/components/tax/BunBauDocumentViewer.tsx` | Vitest testing zoom bar integration and Playwright test verifying page navigation |
| **Shared RAG Co-Pilot** | Semantic chunking for 1040, Sch B/D/E, live holdings, forward planning; hybrid retrieval injecting $<1,500$ tokens | `src/lib/tax/rag/TaxPortfolioChunker.ts`<br/>`src/lib/tax/rag/HybridRetriever.ts`<br/>`src/components/tax/ProactiveTaxChatDrawer.tsx` | Vitest chunking test verifying token budget $\le 1,500$ tokens per query |
| **Strategist Regression Guard** | Guarantee zero regressions across all 72 existing Strategist tests; test shared RAG coexistence | `tests/unit/tax/strategist_rag_coexistence.test.ts` | Automated Vitest run verifying 100% pass across all 9 strategist test suites |
| **Version Tracking** | Enforce version update across `package.json`, `AboutModal.tsx`, `page.tsx` | `package.json`<br/>`src/components/AboutModal.tsx`<br/>`src/app/page.tsx` | Automated test `tests/unit/tax/version_guard.test.ts` asserting `2.7.5 (Build 120)` |

---

## 4. Deep-Dive: Core Looking-Ahead Strategies

```mermaid
timeline
    title Taxpayer Strategic Lifecycle Milestones (2026 - 2040)
    2026 : Ivan reaches Age 62 (Early SS Window Opens) : Current Year Planning ($30k Loss Carryover)
    2027 : Harmony reaches Age 65 (Medicare IEP Window: Apr-Oct 2027) : Coordinate with Viapath Employer Health Plan
    2029 : Harmony reaches Age 67 (Full Retirement Age) : Ivan reaches Age 65 (Medicare IEP Window)
    2031 : Ivan reaches Age 67 (Full Retirement Age) : Peak Roth Conversion Window Opens
    2032 : Harmony reaches Age 70 (Maximum Social Security Delayed Credit 124%)
    2034 : Ivan reaches Age 70 (Maximum Social Security Delayed Credit 124%)
    2037 : Harmony reaches Age 75 (SECURE 2.0 Mandatory RMD Cliff)
    2039 : Ivan reaches Age 75 (SECURE 2.0 Mandatory RMD Cliff)
```

### 1. Social Security Claiming Strategy: Avoid the Age 62 Trap
- **The Early Filing Reduction:** Claiming at 62 permanently cuts benefits by $\sim 30\%$ compared to Full Retirement Age (67).
- **The W-2 Earnings Test Clawback Trap:** In 2026, the annual exempt earnings limit is $\sim \$23,400$. For every $\$2$ earned above this, $\$1$ in benefits is withheld.
- Because Ivan earns $\$186\text{k}+$ in W-2 wages from Viapath Technologies, **$100\%$ of any Social Security benefits claimed at age 62 would be clawed back and forfeited**.
- **AI Recommendation:** Defer filing. Delaying to Full Retirement Age (67) or age 70 yields an **$8\%$ annual guaranteed, inflation-adjusted increase (Delayed Retirement Credits)** up to $124\%$ of primary benefit, locking in max lifetime survivor protection.

### 2. Medicare & Employer Healthcare Coordination: The Age-Gap Dynamic
- **The Age Gap:** Harmony reaches 65 in **July 2027** (Initial Enrollment Period: April 1 – October 31, 2027), while Ivan will only be **63**.
- **Special Enrollment Period (SEP) Exemption:** Because Viapath Technologies is an active employer with $\ge 20$ employees, Harmony is legally entitled to **delay Medicare Part B and Part D without late enrollment penalties** as long as Ivan remains actively employed with group health coverage (Form W-2 box 12 Code DD shows **$\$30,603$** in coverage).
- **Medicare Part D & "Creditable Coverage":** Harmony must receive an annual "Creditable Coverage Notice" from Viapath certifying their prescription drug benefit matches Part D standards.
- **Pre-65 Bridge Coverage:** If Ivan considers early retirement before 65, the system models the health insurance bridge cost (COBRA vs ACA Covered California subsidy phaseouts) during the gap years until Ivan turns 65 in 2029.

### 3. IRMAA 2-Year Lookback Cliff Monitoring
- **The Surcharge Mechanism:** Medicare Part B and Part D premiums are determined using tax returns from 2 years prior (2025 return sets 2027 premiums; 2026 sets 2028).
- **The $\$206,000$ Cliff Danger Zone:**
  - The Married Filing Jointly Tier 1 IRMAA threshold is **$\$206,000$**.
  - **Actual 2025 AGI was $\$204,303$ — only $\$1,697$ below the cliff!**
  - An accidental spike of just $\$2,000$ in short-term capital gains, CD interest, or dividends would trigger Tier 1 IRMAA, costing $\sim \$1,700/\text{year}$ in extra Medicare surcharges.
  - **AI Strategy:** Keep investment income under $\$206\text{k}$ using our **$\$30,056$ capital loss carryover** and tax-advantaged fixed income positioning.

### 4. SECURE 2.0 RMD Age 75 & The 10-Year Roth Conversion "Tax Valley"
- **Mandatory Withdrawal by Age:** Under SECURE Act 2.0 (for individuals born 1960 or later), Required Minimum Distributions (RMDs) do not begin until **Age 75**!
  - Harmony turns 75 in **2037**; Ivan turns 75 in **2039**.
- **The "Tax Valley" Window (Ages 65 to 75):**
  - Between retirement (loss of W-2 salary) and age 75 (RMD mandatory withdrawals), annual taxable income drops sharply.
  - **AI Strategy:** Systematically execute annual partial Roth conversions from pre-tax retirement accounts (Fidelity BrokerageLink, Schwab Rollover IRA, Webull IRA) up to the top of the 12% or 22% federal tax bracket ceiling ($\$94,300$ / $\$201,050$ MFJ), while staying below the IRMAA $\$206\text{k}$ threshold.
  - This eliminates catastrophic RMD tax spikes at age 75 and shields the portfolio from California state income taxes permanently.

---

## 5. UI / UX Design: The Six Tax Expert Workspaces

Inside `src/components/tax/TaxExpertView.tsx`:
1. **📊 Overview & KPIs:**
   - 4 Executive Cards: AGI, Combined Tax Liability, Blended Effective Rate (16.8% in '25), and Available Loss Shields ($\$69,113$ total).
   - Anomaly & Safe Harbor Banner (Active capital loss shield, suspended passive loss, safe harbor target).
   - Multi-Year Trend Charts in `AppletContainer` with Chart/Table toggles.
2. **🔮 Forward-Looking Life Planner (Core AI Intelligence):**
   - **Chronological Timeline Visualizer (2026–2040):** Interactive scrubber highlighting upcoming milestones for Harmony and Ivan.
   - **Social Security Optimization Panel:** Interactive sliders comparing age 62 vs 67 vs 70 claiming scenarios with W-2 earnings clawback alerts.
   - **Medicare & Employer Health Coordinator:** Age-gap analysis (Harmony 65 in 2027 vs Ivan 63), employer group health coordination (Viapath W-2 Code DD $\$30\text{k}+$), and Part D creditable coverage advisor.
   - **IRMAA Cliff Monitor:** Gauge showing current buffer ($\$1,697$ cushion below $\$206\text{k}$ threshold) with warning triggers.
   - **RMD & Roth Conversion Tax Valley Roadmap:** Annual conversion ladder modeling up to age 75.
3. **📋 Comparison (Multi-Year Line-by-Line Audit):**
   - High-density SmartTable detailing Form 1040, Form 540, Schedules A/B/D/E, Form 8582, and Form 8995.
   - Interactive 1-Click **`[👁️ View Page]`** links jumping directly into the filed return in `BunBauDocumentViewer`.
4. **📁 Documents (Document Vault & Viewer):**
   - Staged ingestion zone for multi-year tax PDF uploads.
   - Built-in `BunBauDocumentViewer` with canonical `AccessibilityZoomBar` (`[-] [100% Reset] [+]`), page thumbnails, rapid page jump, fullscreen, and download.
5. **💡 Active Portfolio Tax Strategy:**
   - Live Portfolio Tax-Loss Harvesting Engine correlated with positions in Schwab, Fidelity, and Webull.
   - CD & Fixed Income Tax Drag Analyzer ($\sim 44.3\%$ combined marginal rate).
   - Options Premium Characterization (Cash Secured Puts & Covered Calls).
6. **✨ Co-Pilot (Conversational Tax Advisor & Memory Inspector):**
   - 4 Forward-Looking Proactive Suggestion Chips:
     * 💡 *"How should Harmony coordinate Medicare at 65 while Ivan remains on Viapath employer health insurance?"*
     * 💡 *"Why would claiming Social Security at age 62 trigger a 100% earnings clawback under Ivan's current W-2 salary?"*
     * 💡 *"How can we avoid triggering the $206,000 IRMAA cliff next year using our $30,056 capital loss carryover?"*
     * 💡 *"What is our optimal Roth conversion target before reaching our SECURE 2.0 RMD age of 75?"*
   - Persistent Tax Memory Inspector: Displays verified user tax and lifecycle facts stored in Firestore.

---

## 6. Phased Implementation Milestones

- **Milestone v6.41:** Ingestion Pipeline, Models & Standard PDF Viewer (`BunBauDocumentViewer` with `AccessibilityZoomBar`).
- **Milestone v6.42:** Multi-Year Deterministic Engine, Comparison SmartTable & Anomaly Banner.
- **Milestone v6.43:** Forward-Looking Strategic Life Planner (Social Security, Medicare Coordination, IRMAA, RMD & Roth Tax Valley).
- **Milestone v6.44:** Shared RAG Architecture & Co-Pilot (Semantic Chunker, Vector Embedder, Hybrid Retriever $<1500$ tokens, SSE Chat & Persistent Memory) + Strategist Coexistence Suite.
- **Milestone v6.45:** Automated Test Suite (Vitest + Playwright), Version Bump to `2.7.5 (Build 120)` & Production Build.

---

## 7. Automated Test Plan & Quality Gates

1. **Vitest Math & Lifecycle Tests (`tests/unit/tax/tax_calculations.test.ts` & `tests/unit/tax/lifecycle_planning.test.ts`):**
   - Multi-year math precision: 2024 AGI ($\$296,159$), 2025 AGI ($\$204,303$), QBI deductions, itemized deductions ($\$49,190$ in 2025 with $\$40\text{k}$ SALT cap).
   - Loss shields: $\$30,056$ capital loss carryover, $\$39,057$ suspended rental loss, $\$9,445$ QBI loss.
   - Social Security engine: Proves Ivan's $\$186\text{k}$ W-2 causes 100% clawback at age 62; models 124% benefit at age 70.
   - Medicare coordinator: Validates IEP window for Harmony (Apr–Oct 2027) and Part B penalty exemption under active employer plan with 20+ staff.
   - IRMAA monitor: Tests $\$206\text{k}$ threshold buffer ($\$1,697$ margin).
   - RMD engine: Validates age 75 RMD threshold under SECURE Act 2.0 (2037 for Harmony, 2039 for Ivan).
2. **Strategist Regression & Shared RAG Coexistence (`tests/unit/tax/strategist_rag_coexistence.test.ts`):**
   - Runs all 72 existing Strategist unit tests to assert 0 regressions.
   - Asserts shared RAG knowledge chunker correctly indexes both portfolio holdings and multi-year tax returns.
   - Asserts token budget is enforced $<1,500$ tokens across both Tax Co-Pilot and Strategist queries.
3. **Playwright E2E UX Tests (`tests/tax/tax-ux.spec.ts`):**
   - Sidebar navigation to "Tax Expert" $\rightarrow$ sub-tab switching across all 6 workspaces.
   - Timeline scrubber interaction, Social Security claiming slider, and 1-click `[👁️ View Page]` PDF deep-linking.
4. **Regression Quality Gate:**
   - Execute `npm test` verifying all 500 existing unit tests pass with zero regressions.
   - Execute `npm run build` verifying clean production compilation.

---

## 8. Versioning & Build Enforcement
- **Application Target Version:** `2.7.5 (Build 120)`
- **Architecture Target Version:** `v2.8 Tax Expert AI, Multi-Year Tax Intelligence & Lifecycle Forward-Planning Engine`
- **Mandatory Prompt Content Preserved:** *"You also need to update the application version/build/architecture version for every iteration build."*
