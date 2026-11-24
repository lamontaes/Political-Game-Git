---
id: gov-item-veto-deadlines-and-categories
title: "The item veto finishes its special deadlines, outside assent and protected spending categories"
area: gov
kind: stopgap
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: governing
standard: 2
model: opus
effort: medium
root: rc9-place-facts-one-default
checked: fable 2026-11-10
---

**What.** The item veto strikes or reduces appropriation increases with exact override fractions and the played year proves the chain, but special deadlines, external assent and some protected or mixed appropriation categories are incomplete, and territorial reductions are unavailable. Read the remaining legal details from data per place and finish those cases. Closes the stopgap `SG-STATE-line-item-veto-engine`.

**Cause.** Found in code: `src/core2/modules/legislature.ts` (line 5881) registers `SG-STATE-line-item-veto-engine` for the remaining source and played-proof gaps; the row is in `src/core2/data/stopgaps/state.json`, and the per-state data is `src/core2/data/office-day/state-line-item-veto.json`.

**Fix.** Read each state's item-veto deadline, outside assent and protected categories from data and finish those cases, with a test for a protected category; resolve the stopgap row.

**Time box.** 6 hours for one opus session.

**Rules.** One rule, all 56 places: deadlines and protected categories live in data per place. The chain is the acceptance: a struck line is followed to the adopted budget and a named owner.

**Done when.** A second session plays a year in a drawn state with a special item-veto deadline (state and seed named) and sees the veto, its override vote and the adopted line named by record id, and `src/core2/legislature.test.ts` covers a protected category.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/budgets.ts, src/core2/data/office-day/state-line-item-veto.json, src/core2/data/stopgaps/state.json, src/core2/legislature.test.ts

**Notes.** Oct 20 (pool feeder): the row SG-STATE-line-item-veto-engine stays open while its pool item is done. Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). Special deadlines, external assent and territorial cases of the item veto; the veto chain already plays.
