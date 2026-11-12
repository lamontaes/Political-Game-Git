---
id: money-retire-legacy-paid-work
title: "Retire the legacy discretionary paid-work pay path (work-cash settleLegacyWorkResultJournal, legacy-wage-counters) so every wage goes through the one payroll"
area: core
kind: cleanup
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
branch: money/retire-legacy-paid-work
---

**What.** Pay runs through more than one path. The legacy path settles calendar-average pay when the act engine's paid-work effect fires (modules/life.ts paid-work handler, work-cash.ts settleLegacyWorkResultJournal, legacy-wage-counters.ts, api.settleLegacyWorkResult, and readers in tooling/payroll-observables.ts, work-observables.ts and finance-observables.ts). Money measured it in three played worlds, one year each (Wooster IN seed money-1, Amherst NH seed money-3, Hillsdale WY seed money-5): the paid-work handler ran zero times, while the recorded payday path (work-payroll-cash.ts) covered the paychecks. So the legacy path is dead weight that tests and observables still depend on. Replace, never layer: delete it and its data and tests, keep the discretionary extra-shift idea only if the owner wants it, paid at the next payday through the one payroll. Guards: the paycheck the player opens, which comes from one pay path once the old one is gone.

**Rules.** Replace never layer: delete the old path, its data rows (work.json, content.json paid-work act), tests and observables in the same PR and count lines removed. Wire to the world: prove in played worlds at random places from all 56 that no one is paid twice or not at all, same seed before and after. One engine per mechanic: the recorded payday is the only payroll.

**Done when.** In a one-year played world (buildBenchWorld) at a place drawn from all 56 with a seed the builder did not choose (name both in the PR body), the set of workers paid and the dollars paid are identical before and after the deletion (same seed, records proof), grep finds no settleLegacyWorkResult or legacy-wage-counters left in src, the tests that used them are deleted or moved onto the payday path, and the PR body counts the lines removed.

**Files.** src/core2/work-cash.ts, src/core2/legacy-wage-counters.ts, src/core2/modules/life.ts, src/core2/state.ts, src/core2/types.ts, src/core2/tooling/payroll-observables.ts

**Notes.** TODO

Released by next (2026-11-10): no push to money/retire-legacy-paid-work since 2026-11-08 17:26 UTC, more than twice its 4-hour time box. Continue on branch money/retire-legacy-paid-work.
