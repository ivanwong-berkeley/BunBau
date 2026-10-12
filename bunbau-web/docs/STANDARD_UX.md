# BunBau Standard UX

Rules every table, container, pop-up and drill-down must follow.

## Tables (use `SmartTable`, or `TableSortBar` + `SmartTh` for legacy layouts)
1. Every column header is sortable (except explicitly `sortable: false`).
2. Default sort on open = **first column, ascending** (no persistence between opens).
3. Header click toggles asc ↔ desc (two states, no "unsorted").
4. **Reset sort** button returns to the default; disabled when already default.
5. **(i) info button** on every table/container/pop-up explains the sort rules.
6. Empty values sort last; currency, `($x)`, `%` and dates sort by value; ties are stable.
7. Totals/subtotals rows are pinned (not sorted).
8. Copy / CSV exports follow the on-screen order.
9. Raw CSV preview defaults to file order (`#` column).
10. Test ids: `smart-sort-bar-{id}`, `table-info-btn-{id}`, `sorted-by-{id}`, `reset-sort-btn-{id}`.

## Other app-wide standards
- Green terminals with one-click copy.
- Accessibility menu (zoom / fullscreen / download) and two-level zoom.

Enforced by `tests/unit/standard_ux_guard.test.ts`.

## Destructive actions (S-DEL)
- Every destructive action shows a **preview** of what will be lost and requires the user to **type an exact phrase** (case-sensitive) before the Delete button enables. Esc and Cancel do nothing.
- Use the shared `DestructiveConfirmDialog` (`src/components/common/DestructiveConfirmDialog.tsx`). Date-range deletes use From / To calendar controls or an ALL checkbox, and put the dates in the phrase.
- Strategist deletes are guarded by `tests/unit/strategist/history_isolation.test.ts`. Older delete dialogs (portfolio / History) already follow the typed-phrase rule via `DeleteDangerZone`.

## Reports and AI output
- AI output is rendered as formatted content (never raw Markdown) and raw HTML is never rendered.
- Report panes have a fixed height and scroll; they never grow the page.
- Reports have a second-level accessibility menu (zoom, copy, download MD / PDF, detach, full screen).
- Exports carry the Not-financial-advice disclaimer.
- Model routing is by tier power rank, never by model name.
