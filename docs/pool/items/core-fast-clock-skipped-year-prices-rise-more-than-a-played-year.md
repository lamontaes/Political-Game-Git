---
id: core-fast-clock-skipped-year-prices-rise-more-than-a-played-year
title: "A skipped year's prices rise more than the same year played, in some places"
area: core
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by:
pr: #8239
after:
blocked-on:
lead: speed
model: opus
effort: medium
root: design-country-tier
source: found Nov 10 by the builder of the fast clock's part 3 (pull request #8238)
checked: fable 2026-11-10
merged-at: 2026-11-10T21:46:55.921Z
---

**What.** After the fast clock's part 3, a skipped year moves prices, but in some places it moves them more than the same year played day by day. A player who skips ahead should come back to about the world they would have reached by playing. The gap is outside the fifth the fast clock's parts hold themselves to, and nobody knows which engines make it.

**Cause.** Needs cause. Measured by the builder of pull request #8238 with src/core2/results-mode-pay-prices-jobs.test.ts: in Houston, Delaware (seed 7b20d94f3ce81a6655c0) prices rose 2.60 percent in a played year and 3.26 percent in the same year skipped; in Chumuckla, Florida 1.87 percent played and 4.16 percent skipped; in Mountain City, Nevada (seed e4c1a7f09b3d52816a2e) 3.50 and 3.54, which is fine. Tried: running every engine's daily work except the work engine inside the skip brings Chumuckla to 2.30 percent, but no single engine and no half of them does it alone. Known and registered: full workers earn nothing in skipped time (SG-SPEED-results-mode-work-attendance), and fourteen engines never open in a skip (business, credit, outcome web, climate, disasters, national events, national opinion, federal courts, counted demotion, moves, partnerships, public action, outside budgets, world metrics).

**Fix.** None until the cause is found.

**Time box.** 5 hours for one Opus session: in Chumuckla and Houston, print month by month for the played and the skipped year the figures a business's price review reads (the economy engine's price and wage factors, its own costs and its demand) for the same ten firms, find the first month and the first figure that part ways, and name the engine that writes that figure and why it differs in a skip. Then rewrite this item with `Measured:` or `Found in code:` and a real Fix.

**Rules.** Speed: a skipped year runs as results, so the fix may not make it run every engine's every day. No dice. Sliding scales and causes. One rule, all 56 places. Follow .agents/skills/speed-work/SKILL.md for timing and .agents/skills/money-economy/SKILL.md for reading prices.

**Done when.** A second session reads the finding: for the two places (seeds named) the item gives the first month and figure where the skipped year leaves the played one, by record id, and the engine that writes it, and the item is rewritten with its cause and a Fix. After the fix, the part's test in three drawn places prints price changes within a fifth of each other.

**Waits on.** Pull request #8238 on main, which adds the test and the engines' openings in a skip.

**Files.** src/core2/results-mode-pay-prices-jobs.test.ts (new), src/core2/modules/macro.ts, src/core2/finance-state.ts
