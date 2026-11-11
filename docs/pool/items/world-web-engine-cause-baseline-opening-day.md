---
id: world-web-engine-cause-baseline-opening-day
title: "An engine-measure cause changed on the web's opening day gets its baseline after the change"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: opus
effort: medium
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** The outcome web takes each engine-measure cause's baseline when it opens, so a cause a law changes on that same day gets the changed value as its baseline and the web never sees the change. The taxes helper fixed it for two law measures (a state corporate rate, a property tax rate) with baselineReader. The causes split three ways: law reads with a date already take the law in force the day before the web opened; the SNAP maximum and minimum-wage measures are defined against their own reference; and the budget-line causes (parks, highways, schools, health and hospitals, welfare, higher education) read the budget row in place, which `amendBudget` overwrites, so the day-before value is not kept. The fix belongs in one place for all causes, not per measure.

**Cause.** Found in code: `ENGINE_READERS` (src/core2/modules/outcome-web.ts line 236) read budget rows in place, `amendBudget` (src/core2/modules/budgets.ts line 2105) overwrites the fiscal year's row so the day-before value is not kept, and `BASELINE_READERS` (line 309) covers only dated law reads.

**Fix.** Keep a dated log of budget line changes, make `ENGINE_READERS` take a date, and delete `BASELINE_READERS` and the JSON baselineReader field in src/core2/data/outcome-web/outcome-web.json.

**Time box.** 5 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: the effect numbers on the bill card and Metrics tab for a law that takes effect on the web's opening day, which show no change today.

**Rules.** Replace, never layer: one baseline rule for every engine-measure cause, read from the value the day before the web opened, replacing the per-measure readers. An effect is a read, not a record: the web reads the dated value when it measures. Speed: the log is written on the day a line changes, never a scan.

**Done when.** A second session, on main in a drawn place (place and seed named), changes a budget line and a tax rate on the web's opening day in dev mode, plays a month, and sees the web move for both, with every engine-measure cause's baseline the value the day before the web opened through one code path in src/core2/modules/outcome-web.ts. A test changes a cause on the opening day and shows the web moving, for at least three causes.

**Waits on.** Nothing.

**Files.** src/core2/modules/outcome-web.ts, src/core2/data/outcome-web/outcome-web.json, src/core2/outcome-web-model.ts, src/core2/modules/budgets.ts

**Notes.** TODO

Analysis (Claude worker, Oct 27; released unbuilt). The premise is narrower than the item says. The causes read in `ENGINE_READERS` (src/core2/modules/outcome-web.ts) split three ways. (1) Law reads with a date (property tax, state corporate rate) already take the law in force the day before the web opened through `BASELINE_READERS`. (2) The SNAP maximum and the minimum-wage measures are defined against the law at `startedAt` or a year back, so a same-day change is already a move from their own reference, not from the first reading. (3) The budget-line causes (parks, highways, schools, health and hospitals, welfare, higher education) read the budget row in place: `amendBudget` (src/core2/modules/budgets.ts:1643) overwrites the fiscal year's row, and only carried changes are kept by year in the `enacted` table, so there is no record of the line "the day before" for a one-time grant or a first-day amendment. The first web reading is therefore the earliest value anyone holds. A single date-aware baseline path needs each reader to take a date, and the budget readers need a dated history of amendments first (a per-government log of line changes with their day, which `gov-prior-year-budgets-at-opening` and the budget history work would also read). Whoever takes it should build that log first, then make `ENGINE_READERS` take a date and delete `BASELINE_READERS` and the JSON `baselineReader` field. Estimated above the 3-hour box.

Analysis (Claude worker, Oct 27; released unbuilt). The premise is narrower than the item says. The causes read in `ENGINE_READERS` (src/core2/modules/outcome-web.ts) split three ways. (1) Law reads with a date (property tax, state corporate rate) already take the law in force the day before the web opened through `BASELINE_READERS`. (2) The SNAP maximum and the minimum-wage measures are defined against the law at `startedAt` or a year back, so a same-day change is already a move from their own reference, not from the first reading. (3) The budget-line causes (parks, highways, schools, health and hospitals, welfare, higher education) read the budget row in place: `amendBudget` (src/core2/modules/budgets.ts:1643) overwrites the fiscal year's row, and only carried changes are kept by year in the `enacted` table, so there is no record of the line "the day before" for a one-time grant or a first-day amendment. The first web reading is therefore the earliest value anyone holds. A single date-aware baseline path needs each reader to take a date, and the budget readers need a dated history of amendments first (a per-government log of line changes with their day). Whoever takes it should build that log first, then make `ENGINE_READERS` take a date and delete `BASELINE_READERS` and the JSON `baselineReader` field. Estimated above the 3-hour box.
