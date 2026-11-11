---
id: core-country-tier-part-1-trace-opens-what-moved-a-state
title: "The country tier, part 1: Trace on a state shows what moved its jobs and budget this month, by cause"
area: core
kind: feature
priority: 1
size: M
status: merged
standard: 2
claimed-by:
pr: #8175
after:
blocked-on:
lead: money
model: opus
effort: medium
root: design-country-tier
source: split from core-country-tier-first-slice by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
merged-at: 2026-11-10T18:59:28.000Z
---

**What.** Dev mode's Trace on a state shows its households, employers and ledger. It does not show why this month differs from last, so a second session that sees two worlds differ cannot open the cause from a screen. This part keeps, for each state and month, what each step of the month moved, and shows it in Trace.

**Cause.** Found in code: the month's steps are in `stepCountry` in src/core2/country-model.ts; each computes its own sum (taxes withheld, spending, hiring by sector, moves, the ledger's budget) and keeps only the result. The second sessions' acceptance runs in Willow River, Minnesota and Broadland, South Dakota (Notes on core-country-tier-first-slice, with their seeds and commits) saw the state's figures differ between twin worlds and had no way to open why from the state's record.

**Fix.** Have the month's steps keep, per state, a short row of what each step moved: taxes withheld under which law row, what households spent, jobs added or cut by sector, people who arrived and left, and the ledger's revenue and budget. Keep twelve months per state and fold older ones away. Trace on the state's record shows the latest month's row as worded lines, largest first, and each law it names opens that law.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** An effect is a read, not a record: the row is read by Trace and by the twin test. Speed: twelve rows per state, bounded; the month's step time is measured before and after with `npm run speed:year`. Player screen text applies to dev mode's worded lines. Ask why: every figure names its cause by record.

**Done when.** A second session, on main in a drawn place it names with its seed, runs two worlds for a year in dev mode, one with the state's income tax ended by a passed bill, opens Trace on the state's record in both, and reads which lines differ: the taxes withheld name the law row that changed, and the jobs lines differ by sector. It takes a screenshot of both.

**Waits on.** Nothing.

**Files.** src/core2/country-model.ts, src/core2/modules/macro.ts, src/bench/dev-mode.ts

**Notes (Fable B, Nov 10, marked merged by hand).** Pull request 8175 merged at 2026-11-10 18:59 UTC and built this item, but the item stayed in review: its `pr:` field held the number with no `#`, which the merge's flip does not match, and the pull request's first line named no item (pool item pool-merge-does-not-flip-an-item-whose-pr-field-has-no-hash). A second session's check in the game is still owed.
