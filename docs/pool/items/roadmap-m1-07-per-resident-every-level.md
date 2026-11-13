---
id: roadmap-m1-07-per-resident-every-level
title: "M1-07's check leaves per-resident taxes and spending unchecked for the federal level and the territories, and bounds counties only from above"
area: gov
kind: feature
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-roadmap-m1-07-per-resident-every-level
pr: #8566
blocked-on:
after: roadmap-m1-housing-budgets-business-commands
source: added with npm run pool -- add
lead: m0-m2
model: sonnet
effort: high
root: none
checked: fable 2026-11-10
claimed-at: 2026-11-11T04:25:57.813Z
branch: claude/pool-roadmap-m1-07-per-resident-every-level
---

**What.** The M1-07 command (src/core2/tooling/m1-07-check.ts, PR #5893) passes in Napi Headquarters, New Mexico (place key 3551035, seed c7622b23bf5be89188acdc16fb35d2a78eb8d36d7e9f7ebe442d142558796aa6), but the spec says spending and taxes per resident are checked at every level. The check lists the federal level as not applicable because the repository held no cross-section for it, checks the county only together with the city, and holds a territory's taxes as not applicable. M1-07 stays false until every level reports its per-resident taxes and spending.

**Cause.** Design: docs/coordination/OWNER-DECISIONS.md, the Nov 8 entries "Ranges are not targets, for everything; baselines only calibrate" and "Per-world spread in the checks" (the M1 checks compare a published figure to the world's own value within the world's spread parameter, and a real band is reported, never failed). The spec text is docs/roadmap/features.json M1-07; clause (4) in the header of src/core2/tooling/m1-07-check.ts lists the federal government and a territory's taxes as not applicable, and its perResident block (about line 237) holds the state and the county and city together to a Census range.

**Fix.** In src/core2/tooling/m1-07-check.ts: add the federal level, taking per-resident taxes and spending from the federal budget the world adopted and printing beside them the receipts and outlays of data/research/money/federal-budget-fy2025.json divided by the population; check the county and the city each, not only together, against data/research/money/state-local-finances-2022.json; print every level's value with its published figure and the world's spread parameter. A level fails only when its value differs from its own opening value by more than the world's spread (taxes doubled is such a case); a published figure the world leaves is printed as a report and never fails the run. A territory's taxes stay listed as not applicable, with the reason, until a published figure is fetched into data/research/money/.

**Time box.** 6 hours.

**Rules.** Research before building: each published figure is SOURCED from fetched data (Treasury receipts and outlays for the federal level, the Census county and city finances for the rest) and real figures check totals only. One rule, all 56 places: the check draws its place from all 56, a territory included, and prints the place and seed. Ranges are not targets (owner, Nov 8): nothing pulls the world toward a real level.

**Done when.** A second session runs the M1-07 command in a drawn place and in two more drawn places, one of them a territory, and sees federal, state, county and city per-resident taxes and spending each printed with the place, the seed, the world's value and the sourced published figure beside it. A test shows the check exits nonzero when one level's taxes are doubled and does not fail when the world's value merely differs from the real figure. docs/roadmap/features.json reads passes true for M1-07 only after that run.

**Waits on.** Nothing.

**Files.** src/core2/tooling/m1-07-check.ts, src/core2/tooling/m1-07-coverage.ts, src/core2/tooling/m1-07-coverage.test.ts, data/research/money/federal-budget-fy2025.json, data/research/money/state-local-finances-2022.json, docs/roadmap/features.json

**Notes.** TODO

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: ranges check realistic-not-real (OD:12/OD:558); do not tighten to real per-resident values.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have extended a per-resident check to the federal level and territories; no player sees the check.

Released (2026-11-11): 6-hour rewrite of the 476-line m1-07 check (federal level, county and city each, territory taxes, per-world spread); read it, not started. Continue on branch claude/pool-roadmap-m1-07-per-resident-every-level.
