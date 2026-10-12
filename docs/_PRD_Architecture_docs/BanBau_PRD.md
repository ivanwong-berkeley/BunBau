# PRD: BunBau (資本寶)

## 1. Executive Summary

**BunBau (資本寶)** is an AI-powered personal wealth aggregation and strategic intelligence platform built with a playful, modern Gen Z aesthetic[cite: 1, 2]. Instead of brittle bank API connections or manual spreadsheet tracking, BunBau allows investors to drag-and-drop screenshots directly from their brokerage and banking apps (e.g., Fidelity, Schwab, Citi, Webull, Nationwide, Bank of China, NBC, HSBC). 

Using **Google Gemini Multimodal Vision API**, BunBau extracts institutional metadata, accounts, and line-item positions across asset classes (Cash, CDs, SGOV/Bond ETFs, Equities, Options, Crypto). It aggregates net worth and multi-level P&L, delivers proactive CD/Fixed Income maturity calendar alerts (Green/Yellow/Red), and applies a hybrid mathematical-and-LLM strategy engine to help users achieve target income/APY goals (such as generating 10% APY on a $2M portfolio) tailored to their risk tolerance (Conservative, Moderate, Aggressive).

---

## 2. Problem Statement

Retail and cross-border investors frequently hold assets across multiple domestic and international financial institutions. Managing this portfolio presents three primary challenges:
1. **Aggregator Friction & Security Concerns:** Traditional API aggregators (Plaid, Yodlee) regularly fail due to 2FA/MFA challenges, session expirations, and lack of support for international or regional institutions (e.g., Bank of China, HSBC, Nationwide).
2. **Fixed Income Blind Spots:** Investors actively managing staggered Certificates of Deposit (CDs) and Treasuries across institutions miss rollover windows, leading to automatic reinvestment at unfavorable default rates.
3. **Strategic Yield Planning Gap:** Investors with substantial assets (e.g., $2M) aiming for specific annual return targets (e.g., 10% APY) lack a unified tool that blends safe fixed yields (CDs, SGOV) with options income strategies (Covered Calls, Cash-Secured Puts) aligned with their specific risk tolerance profile.

---

## 3. Goals & Objectives

* **Zero-API Ingestion via Vision AI:** Parse brokerage screenshots directly to identify institutions, account types, balances, and holdings without requiring credential sharing.
* **Smart Account Reconciliation & Deduplication:** Maintain an idempotent account-registry model that seamlessly updates account state upon incremental screenshot uploads without double-counting balances.
* **Comprehensive Portfolio Aggregation:** Provide unified views of net worth, asset class breakdowns, and multi-tier P&L (portfolio, account, asset category, and position levels).
* **Proactive Fixed Income Maturity Calendar:** Offer an interactive calendar and visual status system (Green > 30d, Yellow <= 30d, Red <= 14d) paired with automated alert notifications.
* **Risk-Adjusted Yield Strategy Engine:** Combine financial formulas and Gemini LLM reasoning to recommend specific allocation adjustments and tactical trades (e.g., Covered Calls, CSPs) to meet user-defined target APY% or dollar returns.
* **Gen Z Visual Experience:** Feature an engaging, vibrant design with custom typography, responsive card layouts, dark/light modes, and interactive chart/table toggles[cite: 1].
* **Antigravity Consumption Ready:** Format all data structures, UX requirements, and system flows for automated vibe-coding execution.

---

## 4. Target Personas & Use Cases

### 4.1 The Multi-Brokerage Power Allocator
* **Profile:** Holds capital across multiple brokerages (Schwab, Fidelity, Webull, offshore banks).
* **Pain Point:** Frustrated by disjointed spreadsheets and broken API syncs.
* **Goal:** Upload a batch of 5–10 screenshots weekly to obtain a single consolidated picture of total net worth, cash drag, and equity exposure.

### 4.2 The Yield & Income Strategist
* **Profile:** Manages a sizable portfolio ($500K–$2M+) and actively uses CDs, SGOV, and options (CSPs, Covered Calls) to generate living income.
* **Pain Point:** Forgetting CD maturity dates and having idle cash drag down overall yield.
* **Goal:** Track upcoming roll dates on an alert calendar and receive AI-guided strategies to maintain a 10% target portfolio yield.

---

## 5. User Experience & Design System

### 5.1 Branding & Visual Identity
* **Brand Name:** BunBau (資本寶).
* **Logo:** Persistent BunBau mascot icon (a rounded, smiling golden bao/vault character with sunglasses) displayed prominently in the sidebar and top navigation.
* **Typography:** Modern, rounded heading fonts (*Plus Jakarta Sans*, *Fredoka*, or *Outfit*) combined with clean monospaced fonts (*JetBrains Mono*) for numerical data and metrics.
* **Color System:**
  * Primary: Electric Mint (`#10B981`) & Neon Amber (`#F59E0B`).
  * Secondary: Playful Violet (`#8B5CF6`) & Bubble Coral (`#F43F5E`).
  * Neutrals: Crisp Cream/Off-white for Light Mode, Deep Obsidian Slate (`#0F172A`) for Dark Mode.

### 5.2 Layout & Navigation
* **Collapsible Left Sidebar:** Expandable/collapsible drawer providing maximum analytical screen real estate. Includes:
  * BunBau Logo & Brand Title
  * 📊 Dashboard
  * 📅 Fixed Income & CD Calendar
  * ⚖️ Strategy & Rebalancing Planner
  * 📜 Snapshot History
  * ⚙️ Profile & Settings
* **Top App Bar:**
  * Quick Upload Action: `[+ Upload Screenshot]` button.
  * AI Assistant drawer toggle icon.
  * User Profile Dropdown: Displays Google avatar, quick risk tolerance indicator, and sign-out option.

### 5.3 Dashboard Structure
* **Key Metric Highlights:** Total Net Worth, 24h P&L, Total Unrealized P&L, Current Blended Portfolio APY%, and Active Option Collateral.
* **Interactive Chart Sections (Each card features a Graphic/Table Toggle and an AI Sparkle `✨` Insight button):**
  1. *Total Asset Allocation Chart:* Donut/Sunburst breakdown across Cash, CDs, Bonds/SGOV, Equities, ETFs, Options, and Crypto.
  2. *Performance & P&L Attribution:* Multi-tier bar/treemap view showing gains/losses by institution and by asset category.
  3. *Fixed Income Maturity Runway:* Visual timeline displaying upcoming CD maturities categorized by urgency colors.
* **AI Chart Insights (`✨`):** On-demand prompt execution summarizing yield leakages, concentration risks, and actionable improvements for that specific chart.
* **Embedded AI Chatbot:** Interactive slide-out drawer or docked widget to chat directly with the dashboard data using natural language (e.g., *"How much uninvested cash do I have across Fidelity and Schwab?"*).

---

## 6. Functional Requirements

### 6.1 Authentication & Profile Management
* **Google Identity Integration:** Native Google Sign-In via Firebase Auth.
* **Profile Settings Submenu:**
  * User Details: Display name, Google email, avatar, editable phone number.
  * Risk Tolerance Selector: Dropdown with `Conservative`, `Moderate`, and `Aggressive`.
  * Theme Preference: Dark Mode / Light Mode toggle.
  * Bring-Your-Own-Key (BYOK) LLM Configuration: Model provider selection (Gemini, OpenAI, Anthropic, Ollama/Local), API Key input, model selector (e.g., `gemini-2.5-flash`, `gemini-2.5-pro`), and a "Validate API Key" action.

### 6.2 Screenshot Upload & Vision AI Extraction
* **Upload Zone:** Drag-and-drop file uploader supporting multi-image uploads (`.png`, `.jpg`, `.jpeg`, `.webp`).
* **Multimodal Extraction (Gemini Vision):**
  * Detects Institution Name (Schwab, Fidelity, Citi, Webull, Bank of China, HSBC, etc.).
  * Detects Masked Account Identifier (e.g., `***-4589`).
  * Detects Account Type (Brokerage, Roth IRA, Traditional IRA, 401(k), Checking/Savings, Crypto Custody).
  * Parses Position Items: Symbol/Name, Asset Category (`Cash`, `CD`, `Bond/SGOV`, `Stock`, `ETF`, `Option`, `Crypto`), Quantity, Cost Basis, Current Value, APY%, Maturity Date (CDs/Bonds), Strike/Expiry (Options).
* **Smart Reconciliation & Deduplication:**
  * Computes deterministic account key: `md5(userId + institution + normalizedAccountMask)`.
  * Replaces/overwrites prior active positions for that account while preserving timestamped audit logs.
  * Flags completely new institutions/accounts and creates fresh records automatically.
  * Saves encrypted image files to Firebase Cloud Storage linked by `imageId` metadata.

### 6.3 Analytical Engine & Strategy Planner
* **Multi-Tier P&L & Allocation:**
  1. Total portfolio level net worth and overall P&L.
  2. Account level P&L per financial institution.
  3. Asset class level P&L across categories.
  4. Individual investment holding level P&L.
* **Income & APY Rebalancing Planner:**
  * Inputs: Target APY% (e.g., 10%) or Target Annual Dollar Income (e.g., $200,000 on a $2M portfolio).
  * Calculates current blended APY vs. target yield gap.
  * Uses Risk Tolerance level to generate mathematical asset re-allocation recommendations:
    * *Conservative:* Emphasizes Brokered CDs (4.5–5.0%), SGOV Treasury ETFs, and conservative Covered Calls (Delta 0.10–0.15) on broad market indexes.
    * *Moderate:* Blends high-yield CDs, dividend growth ETFs, Delta 0.15–0.20 Covered Calls, and selective Cash-Secured Puts (CSPs) on stable blue-chip equities.
    * *Aggressive:* Tactical CSP rotation on high-IV equities, active growth stocks, Delta 0.25–0.30 Covered Calls, minimal pure cash drag.

### 6.4 Fixed Income & CD Maturity Manager
* **Calendar View:** Monthly and list views showing maturing CDs, issuing institutions, locked yields, and redemption amounts.
* **Urgency Coding:**
  * 🟢 **Green:** Maturing in $> 30$ days.
  * 🟡 **Yellow:** Maturing in $\le 30$ days and $> 14$ days.
  * 🔴 **Red:** Urgent maturity in $\le 14$ days.
* **Notification Dispatcher:** Automated email alerts sent at 30-day, 14-day, and 3-day thresholds. Phase 2 placeholder for SMS/iMessage integration using profile phone number.

### 6.5 Snapshot History & State Management
* **Snapshot Button:** Dedicated header button to capture a point-in-time state of the entire portfolio to the database.
* **History Management:**
  * Chronological log displaying date, time, total assets, and institutional breakdown.
  * Ability to inspect historical portfolio states.
  * Bulk deletion by date range or individual snapshot removal.

---

## 7. Technical Constraints & Performance

* **Extraction Speed:** Screenshot processing via Gemini Vision should complete within $< 5$ seconds per image.
* **Chart-to-Table Responsiveness:** Client-side toggle re-rendering must occur in $< 150\text{ ms}$.
* **Cross-Environment Support:** Native local execution on macOS (Apple Silicon M-Series) with zero-configuration Docker deployment to Google Cloud Run.

---

## 8. Success Metrics

* **Extraction Precision:** $\ge 98\%$ correct parsing of institutional names, balances, and position values.
* **Deduplication Reliability:** 100% accurate deduplication without double-counting balances during repeated screenshot updates.
* **Alert Delivery:** Timely delivery of fixed income maturity alerts across configured channels.