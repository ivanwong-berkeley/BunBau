# BunBau Milestone v7.4 Release Report: High-Visibility Sub-Navigation, Two-Tier Advisory Box Accessibility & Multi-Year Audit Workstation

- **Application Version:** `2.7.16`
- **Build Number:** `Build 131`
- **Architecture Version:** `v2.9.9 High-Visibility Tactile Sub-Navigation, Two-Tier Advisory Box Accessibility & Multi-Year Audit Report/Chart/Scroll Workstation Architecture`
- **Release Date:** October 13, 2026
- **Verification Status:** 114/114 Test Suites Passed (652/652 Unit & Integration Tests) • Clean Production Build

> **Mandatory Iteration Version Rule:** *"You also need to update the application version/build/architecture version for every iteration build."*

---

## 1. Executive Summary of Delivered Improvements

### 1.1 High-Visibility Tactile Sub-Page Navigation Dock (`TaxExpertView.tsx`)
- Replaced the small, low-contrast sub-page tab strip with an elevated **Tax Fiduciary Workspace Navigation Dock** (`data-testid="tax-workspace-nav-dock"`).
- **5 High-Contrast Tactile Module Cards:**
  - `Overview & KPIs` (`Executive KPIs, Shields & 1040/540`) — Purple/Indigo graphic icon badge
  - `Forward-Looking Life Planner` (`2026–2040 Milestones, Medicare & RMD`) — Emerald/Teal graphic icon badge
  - `Multi-Year Audit` (`9-Year Trajectory & Matrix Audit`) — Blue/Cyan graphic icon badge
  - `Document Vault & Viewer` (`Filed PDFs & Canonical Form Sheets`) — Amber/Orange graphic icon badge
  - `Portfolio Tax Strategy` (`Tax Drag, Harvest & Loss Shields`) — Rose/Purple graphic icon badge
- **Mouse-Over Magnification & Navigation Accessibility Controls:**
  - Interactive hover magnification (`hover:scale-[1.05] hover:-translate-y-1 hover:shadow-xl`) with a magnifying-glass indicator badge on each button and a `Hover Magnify: ON/OFF` toggle (`data-testid="nav-hover-magnify-toggle"`).
  - Dedicated Navigation Dock `AccessibilityZoomBar` (`85%` – `135%`) and `(i)` module guide popover (`data-testid="nav-dock-info-btn"`).
  - Full Light and Dark mode visual harmony with glowing active state indicators (`Active View` badge).

### 1.2 Two-Tier Standardized UX & Accessibility for Opportunity, Info, and Alert Boxes (`TaxAnomalyBanner.tsx`)
- **Tier 1 — Level-1 Wrap Container (`Fiduciary Advisories, Active Tax Shields & Statutory Cliff Alerts`):**
  - Wraps all Opportunity, Info, and Warning advisories with severity filter pills (`All`, `Opportunity`, `Warning`, `Info`), a **`Cards` vs. `Chart` toggle** (`data-testid="anomaly-impact-chart"` comparing dollar magnitudes across shields and cliffs), a Level-1 `AccessibilityZoomBar` (`70%` – `150%`), `(i)` Info popover, `Copy All`, `Download CSV`, `Print`, and Full-Screen Portal `Detach` (`createPortal`).
- **Tier 2 — Level-2 Standardized UX Toolbar on Each Individual Advisory Box:**
  - Every individual `OPPORTUNITY`, `INFO`, and `WARNING` card features its own Level-2 header toolbar (`data-testid="anomaly-box-toolbar-${id}"`):
    - **Per-Box `AccessibilityZoomBar` (`70%` – `150%`)** to independently enlarge the text of any dense box.
    - **Per-Box `(i)` Statutory Rule & Form Reference Popover** displaying the exact IRC / CA R&TC authority and form/line provenance.
    - **Per-Box Mini Benchmark Chart Toggle** comparing the advisory's dollar impact against its statutory threshold.
    - **Per-Box One-Click `Copy`**, **`Download CSV`**, **`Print`**, and **Focused Large-Print Reader Modal (`Detach`)**.

### 1.3 Multi-Year Audit Workstation: Level-1 & Level-2 UX, Report Engine (Preview/CSV/PDF), Category Graphic Chart Toggle, & Bi-Directional Scrollable Matrix (`LongitudinalComparisonCard.tsx` & `SmartTable.tsx`)
- **Level-1 Container UX Completion:**
  - Added Level-1 `AccessibilityZoomBar` (`70%` – `150%`), `Download CSV`, `Print`, and Full-Screen Portal `Detach` (`createPortal`) to the top-level `9-Year Longitudinal Tax Trajectory & Historical Audit` container.
- **Level-2 Category Sub-Page Standardized UX Toolbar (`All`, `Income`, `Deductions`, `Taxes`, `Payments`, `Carryovers`, `California`):**
  - **`Detailed Table` vs. `Graphic Chart` Toggle:** Switches any category sub-page between the multi-year matrix table and an interactive **Multi-Year Comparative Audit Graphic Chart** (`data-testid="subpage-category-chart"`) with metric filter pills, grouped multi-year bars, 2024 vs. 2025 delta callouts, and click-to-inspect support.
  - **`Report Preview`, `CSV` & `PDF` Export Engine:** Opens a formatted **Multi-Year Longitudinal Tax Audit Report Preview Modal** (`data-testid="multi-year-audit-report-modal"`) with an in-modal category filter switcher, executive KPI summary strip, complete multi-year audit table, `AccessibilityZoomBar`, **`Export CSV`**, **`Export / Print PDF`**, and **`Copy Report`**.
  - **Level-2 Controls:** Independent Sub-Page `AccessibilityZoomBar`, `(i)` Category Statutory Info banner, One-Click `Copy`, and Sub-Page Full-Screen `Detach` (`createPortal`).
- **Bi-Directional Scrollable Matrix Viewport & Sticky First Column Fix:**
  - Enhanced `SmartTable.tsx` and `LongitudinalComparisonCard.tsx` with a bi-directional scroll viewport (`overflow-x-auto overflow-y-auto`, `min-w-max`), a **pinned sticky first column** (`Line Item & IRS Form Reference`), sticky year headers, and interactive **`Pan Table: Left | Right | Top | Bottom`** buttons (`data-testid="matrix-scroll-nav-bar"`) so right-hand columns (`2024`, `2025`, `CAGR`, `Source PDF`) are never truncated across any filter.
