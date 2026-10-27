---
id: world-web-engine-cause-baseline-opening-day
title: "An engine-measure cause changed on the web's opening day gets its baseline after the change"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The outcome web takes each engine-measure cause's baseline when it opens, so a cause a law changes on that same day (a state corporate rate, a property tax rate) gets the changed value as its baseline and the web never sees the change. The taxes helper fixed it for those two measures with baselineReader in src/core2/modules/outcome-web.ts on PR #5649; every other engine-measure cause still has it. The fix belongs in one place for all causes, not per measure.

**Rules.** Replace, never layer: one baseline rule for every engine-measure cause, read from the law in force the day before the web opened, replacing the per-measure readers; an effect is a read, not a record.

**Done when.** Every engine-measure cause's baseline is the value the day before the web opened, through one code path in src/core2/modules/outcome-web.ts; a test changes a cause on the web's opening day and shows the web moving, for at least three causes, in a drawn place named with its seed. **On screen.** Nothing yet: it would show on Politics → Budgets, and nothing there reads it.

**Files.** src/core2/modules/outcome-web.ts

**Notes.** TODO

Analysis (Claude worker, Oct 27; released unbuilt). The premise is narrower than the item says. The causes read in `ENGINE_READERS` (src/core2/modules/outcome-web.ts) split three ways. (1) Law reads with a date (property tax, state corporate rate) already take the law in force the day before the web opened through `BASELINE_READERS`. (2) The SNAP maximum and the minimum-wage measures are defined against the law at `startedAt` or a year back, so a same-day change is already a move from their own reference, not from the first reading. (3) The budget-line causes (parks, highways, schools, health and hospitals, welfare, higher education) read the budget row in place: `amendBudget` (src/core2/modules/budgets.ts:1643) overwrites the fiscal year's row, and only carried changes are kept by year in the `enacted` table, so there is no record of the line "the day before" for a one-time grant or a first-day amendment. The first web reading is therefore the earliest value anyone holds. A single date-aware baseline path needs each reader to take a date, and the budget readers need a dated history of amendments first (a per-government log of line changes with their day, which `gov-prior-year-budgets-at-opening` and the budget history work would also read). Whoever takes it should build that log first, then make `ENGINE_READERS` take a date and delete `BASELINE_READERS` and the JSON `baselineReader` field. Estimated above the 3-hour box.

Analysis (Claude worker, Oct 27; released unbuilt). The premise is narrower than the item says. The causes read in `ENGINE_READERS` (src/core2/modules/outcome-web.ts) split three ways. (1) Law reads with a date (property tax, state corporate rate) already take the law in force the day before the web opened through `BASELINE_READERS`. (2) The SNAP maximum and the minimum-wage measures are defined against the law at `startedAt` or a year back, so a same-day change is already a move from their own reference, not from the first reading. (3) The budget-line causes (parks, highways, schools, health and hospitals, welfare, higher education) read the budget row in place: `amendBudget` (src/core2/modules/budgets.ts:1643) overwrites the fiscal year's row, and only carried changes are kept by year in the `enacted` table, so there is no record of the line "the day before" for a one-time grant or a first-day amendment. The first web reading is therefore the earliest value anyone holds. A single date-aware baseline path needs each reader to take a date, and the budget readers need a dated history of amendments first (a per-government log of line changes with their day). Whoever takes it should build that log first, then make `ENGINE_READERS` take a date and delete `BASELINE_READERS` and the JSON `baselineReader` field. Estimated above the 3-hour box.
