# UX39 bounded calendar successor

Source: clean `7d53d9f1c6898ec77eba479c1692b9c896fbbbac`; isolated `/private/tmp/pg-ux39`, `codex/ux39`, no upstream. Original, Fable and Desktop worktrees are read-only.

Implement the actual `ShellWorkspaces.CalendarWorkspaceSurface` consumer using a new feature-local month/week grid. Keep the existing canonical calendar projection, event actions, clock callbacks, Today content and distinct History. Date ordering is a presentation preference only, persisted locally; ISO World dates never change. Only the Calendar region and new UX39 files are writable.

Verify calendar geometry/date boundaries and actual pointer/keyboard ordinary navigation, event selection, date preference/save/reopen, unchanged inspection time. Run type/scoped lint plus required art validation/inventory/QA. Character images and browser evidence remain private and local. Return this complete increment independently; broader creator, People path, campaign and Travel work remain separate.

## Delivered increment

Runtime commit `e51673572ace380676d655180104102a4c3e6c97` adds the normal Calendar month/week table, actual dated cells, current-day marker, upcoming event titles with canonical start times, date selection feeding the existing event actions, period navigation and a separate existing History view. Arrow keys move through days, Enter selects, and Home/End move within a week. Existing Today, day/week execution, interruption controls, event authority and pin callbacks remain intact.

U.S. long dates default. Visible radio choices use TEXT39's exact `Date format`, `Month / day / year` and `Day / month / year` wording. The local browser preference persists through reopening a saved life; it does not alter ISO storage, the World, the clock, another life, or claim portable cross-device settings. This setting covers the calendar-owned header/day headings/grid. The separately owned embedded Today and shell date displays retain their existing formatting.

## Actual verification

- `npx vitest run src/player/ux39-calendar-dates.test.ts src/presentation/run-d-lite.test.ts`: 36 passed (3 date-boundary checks plus 33 existing clock/work checks).
- `npm run typecheck`: passed before and after radio-control change.
- Scoped ESLint across changed TS/TSX and the new browser test: passed. Prettier and `git diff --check`: passed.
- `npm run validate:art`, `npm run inventory:art`, `npm run qa:art`: passed. Inventory's existing duplicate-hash warnings remain; no generated asset diff.
- `PLAYWRIGHT_PORT=5293 PG_RUN_ID=ux39-calendar-06 npx playwright test tests/e2e/ux39-calendar.spec.ts`: 1 passed (3.4 minutes), with exact clean served source `e51673572ace380676d655180104102a4c3e6c97` and matching source digest `97b4d431325bc08818e5a5e0035ac26ec971e149e1b05262f704041e95931f6c`.
- Actual ordinary Aurora life, Maya Rivera: month/week, previous/next, date arrow/Enter activation, date-format Space activation, separate History, event pointer/keyboard selection, exact serialized World equality after browsing/save, Continue/reopen preserving preference and canonical date.
- Whole-window private captures were read locally. Example displayed text: `January 2026`; `4 January 2026 – 10 January 2026`; `6:10 PM Journey to the public meeting`; `6:30 PM Posted public meeting`. Their source is this exact generated life, not a real-world event claim.

Private artifacts: `/private/tmp/pg-ux39/test-results/runs/ux39-calendar-06/`, including `provenance.json` and the two `*-private.png` captures in its results directory. No image, footage or artifact was uploaded. Original, Desktop and Fable worktrees were not modified.

Earlier browser attempts remain recorded: localhost sandbox refusal; cold-load timeout; native-select keyboard non-commit; radio version passing interaction/World equality but timing out on reload; in-flight wording change correctly refused by source-digest guard. Final proof uses visible radios, DOM-ready navigation, adequate cold-start budget and frozen source. No assertions were removed or weakened.

## Architecture and acceptance

Confirmed: existing `projectPlayerCalendar` remains the accessible-event filter; no simulation file, World shape, identity, event, date, scheduler, action or history writer is added. Grid state is selection/layout only. All execution continues through the existing calendar callbacks. No Stage 6 semantics or new political/domain engine is changed.

Ready for A's independent composition. Automated functional verification passed; human visual acceptance, installation and final combined-build acceptance are separate. No build/package or public-publishing claim is made.

## Further breadth, outside this delivered increment

- Before-Begin appearance needs a prospective character/appearance draft contract carried into `onBegin(committed)`; current `SavedAppearanceControls` takes an already-created World/person and writes that World. Mounting it alone would not safely preserve a stable household draft. The creator root is A-owned.
- People category/path highlighting and its known-introduction evidence remain separate. No People or private artwork edit is included.
- Creator birthday widgets/randomize, navigation/background/campaign investigation, Travel destinations and non-calendar date formatting remain the specifically separate UX breadth.

LEARN: identify the actual ordinary consumer before editing a legacy namesake. Freeze all source inputs, including wording and plan files, throughout an identified browser run. Native popup keyboard behavior needs actual platform proof; two explicit date-format radio choices removed the failing popup interaction without weakening the test. UI-only date preferences must never enter canonical time storage.
