# Options Sub-line Expiration & Calendar Integration: Implementation & Test Status Report

**Release Component:** BunBau v2.3 Feature Patch — Multi-Line Option Expiries & Calendar Integration  
**Status:** Completed & 100% Verified ✅  
**Date:** October 6, 2026  
**Environment:** Next.js 15.5.27, Vitest, Docker Container  

---

## 1. Issue Overview & Diagnosis

### Observed Behavior
When importing the user's Fidelity brokerage account screenshot (`media_1791270726349.png`), the **Options Expirations & Maturities Calendar** appeared empty, and expiration dates were missing from the review and dashboard views.

### Root Cause
1. **Multi-line Cell Layout on Fidelity:**  
   In Fidelity's positions table, option rows display the contract symbol on line 1 and the expiration date directly below it on a sub-line:
   - Line 1: `AAPL 310 Put`, `MSFT 475 Put`, `NVDA 200 Put`, `SLV 68 Call`, `T 28 Call`
   - Line 2 (sub-line): `Oct-23-2026`, `Oct-23-2026`, `Nov-06-2026`, `Oct-16-2026`, `Nov-20-2026`
2. **Missing Sub-line Prompt Instructions:**  
   The vision extraction prompt did not explicitly guide the model to read the sub-line beneath the option symbol into the `expiry` property.
3. **Hyphenated Date Formatting:**  
   Fidelity uses hyphenated month names (`Oct-23-2026`, `Nov-06-2026`). Previous date parsing only recognized standard ISO (`2026-10-23`) or slashes (`10/23/2026`), causing date extraction to fail and skipping the items on the calendar timeline.

---

## 2. Implementation Summary

### A. Gemini Vision Extraction Enhancement (`src/lib/extraction/gemini.ts`)
* Updated `EXTRACTION_PROMPT` with explicit multi-line brokerage handling rules:
  ```text
  IMPORTANT FOR BROKERAGES LIKE FIDELITY: In the Symbol column, the option symbol is on line 1 
  (e.g. "AAPL 310 Put" or "SLV 68 Call") and the expiration date is printed directly below on line 2 
  (e.g. "Oct-23-2026", "Oct-16-2026", "Nov-06-2026", "Nov-20-2026"). 
  You MUST extract this sub-line into the "expiry" field converted to YYYY-MM-DD.
  ```

### B. Resilient Date Normalizer & Fallback Parser (`src/lib/extraction/normalize.ts`)
* Upgraded `isoDate` to parse hyphenated month formats:
  - `(Jan|Feb|...)-DD-YYYY` (e.g. `Oct-23-2026` $\rightarrow$ `2026-10-23`)
  - `DD-(Jan|Feb|...)-YYYY` (e.g. `23-Oct-2026` $\rightarrow$ `2026-10-23`)
  - Two-digit year formats (e.g. `Oct-23-26` $\rightarrow$ `2026-10-23`)
* Added `extractDateFromText()`: If the model omits the `expiry` field or places the date in the symbol/name text, `normalizeExtraction` automatically parses it via regex and assigns it to `metadata.expiry`.

### C. Calendar Event Date Selector (`src/lib/portfolio/selectors.ts`)
* Expanded `extractEventDate()` to support hyphenated month patterns directly from `CanonicalPosition.symbol` and `CanonicalPosition.name`.
* Ensures both options (CSPs, Covered Calls) and fixed income (CDs, Treasuries) are cleanly resolved to ISO `YYYY-MM-DD`.

### D. UI Enhancements Across Views

1. **Dashboard "Active Options Monitor" (`src/app/page.tsx`):**
   - Upgraded container table with new columns:
     - `Contract` (with Strike price tag)
     - `Type` (color-coded badge: purple for CSP, amber for Covered Call)
     - `Underlier` (with lock indicator for Covered Calls)
     - `Expiration` (ISO date + urgency badges: `e.g. 17d left`)
     - `Collateral Locked` (cash collateral for CSPs, share count for CCs)
     - `Ignored Premium` (strikethrough value)
2. **Upload Validation Modal (`src/components/UploadValidationModal.tsx`):**
   - Added an **Expiry / Maturity** column and Strike tag directly to the review table so users can visually verify detected dates prior to clicking **Approve & Import**.
3. **Portfolio Impact Preview Modal (`src/components/PortfolioPreviewModal.tsx`):**
   - Enriched the **Active Options Filter** section to display detected expiration date badges and locked collateral.

---

## 3. Automated Test Verification Results

A dedicated automated test suite was created in [`tests/unit/fidelity_options_dates.test.ts`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/tests/unit/fidelity_options_dates.test.ts) based on the exact Fidelity screenshot ground truth.

### Vitest Execution Output (`npm test`)

```
 RUN  v4.1.11 /app

 ✓ tests/unit/strike.test.ts (6 tests)
 ✓ tests/unit/fidelity_options_dates.test.ts (4 tests)
     ✓ normalizes Fidelity sub-line dates (e.g. Oct-23-2026, Nov-06-2026) to standard ISO dates
     ✓ recovers expiration dates even if model left expiry blank but placed it in text
     ✓ populates calendarTimelineEvents with all 5 option contracts in correct chronological order
     ✓ extractEventDate recognizes hyphenated dates directly on CanonicalPosition
 ✓ tests/unit/fidelity_truth.test.ts (21 tests)
 ✓ tests/unit/v2_2_dashboard.test.ts (5 tests)
 ✓ tests/unit/selectors.test.ts (7 tests)
 ✓ tests/unit/import.test.ts (11 tests)
 ✓ tests/unit/extraction.test.ts (13 tests)
 ✓ tests/unit/v2_3_calendar_strategy.test.ts (6 tests)

 Test Files  8 passed (8)
      Tests  73 passed (73)
   Duration  486ms
```

### Chronological Calendar Order Verified

| Priority | Instrument | Type | Expiry Date | Days Remaining (from Oct 6) | Collateral Locked |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | `SLV 68 Call` | Covered Call | `2026-10-16` | 10 days | 200 shares SLV |
| **2** | `AAPL 310 Put` | Cash-Secured Put | `2026-10-23` | 17 days | \$31,000 Cash |
| **3** | `MSFT 475 Put` | Cash-Secured Put | `2026-10-23` | 17 days | \$47,500 Cash |
| **4** | `NVDA 200 Put` | Cash-Secured Put | `2026-11-06` | 31 days | \$20,000 Cash |
| **5** | `T 28 Call` | Covered Call | `2026-11-20` | 45 days | 100 shares T |

### Production Build Verification (`next build`)
```
   ▲ Next.js 15.5.27
   - Environments: .env.local

   Creating an optimized production build ...
 ✓ Compiled successfully in 6.1s
   Linting and checking validity of types ...
   Collecting page data ...
 ✓ Generating static pages (8/8)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                    93.7 kB         326 kB
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

## 4. Verification & Next Steps

All changes are fully committed, tested, and bundled inside the project repository.
The report is saved in the repository at:  
[`docs/BunBau_Options_Date_Extraction_Report.md`](file:///Users/ivanwong/_Backup_Oracle_Laptop_ICWONG_20201105/ICWONG-LAP/ICWONG-LAP_DriveD/BunBau/bunbau-web/docs/BunBau_Options_Date_Extraction_Report.md)
