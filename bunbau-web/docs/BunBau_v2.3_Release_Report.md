# BunBau v2.3 Implementation Status & Test Results Report

**Release Target:** BunBau v2.3 — Calendar and Strategy  
**Status:** Completed & Verified ✅  
**Date:** October 6, 2026  
**Environment:** Next.js 15.5.27, React 19, TypeScript, Docker Development & Production Environments  

---

## 1. Executive Summary

The **BunBau v2.3** release successfully addresses the requirements for **Calendar** and **Strategy** defined in the gap analysis and recovery plan:
1. **Unified Options Expirations & Maturities Calendar:** Expanded the Calendar applet beyond fixed income to a comprehensive, chronological timeline capturing **Cash-Secured Puts (CSPs)**, **Covered Calls (CCs)**, **Brokered CDs**, and **Treasury Bills/Bonds**. Added visual urgency distinction, collateral tracking, and configurable **In-App Alert Settings** (with external notification dispatches deferred to Phase 2 per user direction).
2. **Dynamic Yield Strategy Engine:** Upgraded the Strategy tab from dummy metrics to the live canonical data spine (`PortfolioContext`). Computes real value-weighted **Blended APY**, detects cash drag, highlights eligible Covered Call inventory (100+ unhedged shares), integrates **delayed market quotes** with graceful fallback, and incorporates an interactive **AI Yield Strategist** backed by `/api/chat`.
3. **Quality & Build Verification:** Passed all **69 unit tests** (including 6 new tests specific to v2.3) and achieved a clean production build (`next build`) without type errors or lint warnings.

---

## 2. Feature Implementation Details

### A. Calendar View (`src/components/CalendarView.tsx` & `src/lib/portfolio/selectors.ts`)
* **Unified Chronological Timeline:**
  * Tracks fixed income maturities (CDs, Treasuries) alongside option expirations (CSPs, Covered Calls).
  * Calculates exact days remaining relative to current date.
  * Identifies cash collateral locked for CSPs (`strike × 100 × contracts`) and equity shares locked for Covered Calls (`contracts × 100` shares).
* **Urgency Classification:**
  * `urgent`: Remaining days $\le$ configured `urgentDays` threshold (default 7 days). Rendered in high-visibility rose/red with pulsing indicator.
  * `soon`: Remaining days $\le$ configured `warningDays` threshold (default 21 days). Rendered in amber.
  * `safe`: Remaining days $>$ warning threshold. Rendered in emerald green.
  * `expired`: Past dates flagged with elapsed duration.
* **In-App Alert Banner & Settings Modal:**
  * Prominent in-app action banner rendered when urgent items exist.
  * Settings modal allows users to customize urgent/approaching day thresholds and toggle tracking for specific categories (`notifyCsp`, `notifyCc`, `notifyCdTreasury`).
  * Preferences persist to user's Firestore profile via `updateProfileData({ alertSettings })`.
* **Export & Table View Toggle:**
  * Powered by `AppletContainer` with a structured tabular layout, enabling 1-click **TSV clipboard copy** and **CSV spreadsheet download**.

### B. Strategy View (`src/components/StrategyView.tsx` & `src/lib/strategy.ts`)
* **Live Portfolio Integration:**
  * Wired to real `PortfolioContext` positions; reflects real Net Worth, free cash, CSP reserves, and owned asset APYs.
  * Computes value-weighted **Blended APY**:
    $$\text{Blended APY} = \frac{\sum (\text{Asset Value} \times \text{APY})}{\sum \text{Owned Asset Values}}$$
* **Market Delayed Quotes (`/api/quotes` & `src/lib/market/yahoo.ts`):**
  * Displays a 15-minute delayed quotes ticker for top held equity symbols.
  * Non-blocking HTTP request with fallback to resilient zero-quote placeholders when offline or rate-limited.
* **Covered Call Eligibility Scanner:**
  * Automatically scans held stocks/ETFs for blocks of 100+ unhedged shares and recommends low-delta Covered Call write opportunities.
* **AI Yield Advisor Consultation:**
  * "Consult AI Yield Strategist" trigger connects to `/api/chat` with dynamic portfolio context injection, evaluating cash drag, options overlays, and risk tolerance.

---

## 3. Test Verification & Results

### Vitest Unit Test Suite Results
Ran inside the Docker dev environment (`npm run verify`):

```
> bunbau@0.1.0 test
> vitest run

 RUN  v4.1.11 /app

 ✓ tests/unit/strike.test.ts (6 tests)
 ✓ tests/unit/fidelity_truth.test.ts (21 tests)
 ✓ tests/unit/v2_2_dashboard.test.ts (5 tests)
 ✓ tests/unit/selectors.test.ts (7 tests)
 ✓ tests/unit/import.test.ts (11 tests)
 ✓ tests/unit/extraction.test.ts (13 tests)
 ✓ tests/unit/v2_3_calendar_strategy.test.ts (6 tests)
     ✓ extractEventDate extracts dates accurately from maturityDate, expiry, or text
     ✓ computes chronological order and urgency levels based on alert settings
     ✓ honors category filter toggles in alert settings
     ✓ calculates weighted blended APY correctly across owned assets
     ✓ generates yield gap recommendations based on risk profile and cash drag
     ✓ returns delayed quote format or graceful fallback when ticker requested

 Test Files  7 passed (7)
      Tests  69 passed (69)
   Duration  350ms
```

### TypeScript & Production Build Verification
Ran inside Docker container with production settings:

```
> bunbau@0.1.0 build
> next build

   ▲ Next.js 15.5.27
   - Environments: .env.local

   Creating an optimized production build ...
 ✓ Compiled successfully in 5.2s
   Linting and checking validity of types ...
   Collecting page data ...
 ✓ Generating static pages (8/8)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                    92.9 kB         325 kB
├ ○ /_not-found                            992 B         104 kB
├ ƒ /api/chat                              133 B         103 kB
├ ƒ /api/extract                           133 B         103 kB
├ ƒ /api/llm/validate                      133 B         103 kB
└ ƒ /api/quotes                            133 B         103 kB
+ First Load JS shared by all             103 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

---

## 4. Deliverables Checklist

| Deliverable | Status | Notes |
| :--- | :---: | :--- |
| **Unified Calendar Timeline** | ✅ Complete | CSP expiries, CC expiries, CD maturities, T-bill maturities. |
| **Urgency Indicators & Alerts** | ✅ Complete | Color-coded badges (Red / Amber / Green) and urgent alert banner. |
| **In-App Alert Settings Modal** | ✅ Complete | Custom days & category filters saved to user profile in Firestore. |
| **External Email/SMS Dispatch** | ⏸️ Deferred | Deferred to Phase 2 per user approval. |
| **Live Strategy Data Spine** | ✅ Complete | Blended APY, Net Worth, cash drag calculated from `PortfolioContext`. |
| **Delayed Quotes Service** | ✅ Complete | 15m delayed quotes via `/api/quotes` with fallback. |
| **Covered Call Scanner** | ✅ Complete | Detects 100+ share lots eligible for covered call overlay. |
| **AI Yield Strategist** | ✅ Complete | Wired to `/api/chat` with rich portfolio context. |
| **Table & Export Support** | ✅ Complete | TSV copy and CSV download integrated on Calendar applet. |
| **Unit Tests & Type Safety** | ✅ Complete | 69 passed tests, zero TypeScript errors. |

---

## 5. Next Steps

With **v2.3** fully completed and validated, the foundation is ready for **v2.4** (or any subsequent polish item you approve).
