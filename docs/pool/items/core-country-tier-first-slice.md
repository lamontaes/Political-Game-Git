---
id: core-country-tier-first-slice
title: "The country tier and the results-first clock, first slice: every state as counted groups with a ledger, stepped monthly; the nation as their sum; a 20 years button"
area: core
kind: feature
priority: 1
size: L
status: open
claimed-by:
pr:
after:
blocked-on:
lead: fable
source: Fable build brief, Nov 9, 2026, piece 2 (docs/audits/fable-build-brief-2026-11-09.md on branch audit/fable-vision); Fable audit, root causes 1 and 5
---

**What.** The audit's root causes 1 and 5. The town is simulated from its people; the nation is one formula with a built-in cycle (`stepMacroMonth`, src/core2/macro-model.ts), each state follows the nation (`stepRegionMonth`, src/core2/regional-model.ts), moves between states are forced to match the Census every month (src/core2/modules/counted-moves.ts) and routine layoffs follow a fixed pace (`reviewTurnover`, src/core2/modules/jobs.ts). Measured in Woods Cross, Utah (seed f61d987b2e0e): with the state and federal income taxes set to zero, national unemployment after three years was 5.722% against 5.727%, and the region's population was 729,822 in both worlds. A 20-year game takes 17 to 51 minutes where it finishes at all, and the game has no fast clock. This item writes one design for both causes and builds its first working slice: other states as counted groups with a state ledger, stepped monthly by the town's own rules times their counts; the nation as the sum of the states; whatever the player is not watching kept as results and rebuilt when opened; that tier advancing in months; a "20 years" button. It deletes what it replaces: the national formula, the pull of each state toward the nation, the Census-forced moves and the fixed layoff pace.

**Time box.** Two weeks for Fable with helpers on the same model, the design first and one pull request per finished unit. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a state's counted groups are read by the same rule the town's are, times their count, never a second simulation. No dice: a state's jobs, prices and moves come from its people, firms, laws and ledger, with no seeded roll and no fixed rate deciding them. Sliding scales and causes: a recession starts from a cause on the records (credit, prices, a budget, a disaster), never a built-in period. Replace, never layer: the four top-down mechanisms are deleted in the same work that replaces them. Speed: a country's year stays under two minutes and twenty years run on the monthly tier. Owner, November 8: "None of the simulation should be hard-coded like that or, you know, set against a baseline. The baselines are to calibrate"; "ranges aren't targets"; "I would love if 20 years only took, 5 seconds... Click 20 years."

**Done when.** A second session, not Fable, sees both of these in the running game on main. First, in a drawn place it names with its seed, it presses the 20 years button and the game reaches the date twenty years on without a crash, and the Metrics tab's country, state and town rows show figures that could be a real place (no more jobs than adults, for one); it attaches a screenshot of the Metrics tab before and after and the time the run took. Second, the Woods Cross twin test as a named repro (seed f61d987b2e0e, state and federal income tax set to zero on day one through dev mode's law control, three years): national unemployment, the state's unemployment and the state's population differ between the two worlds by more than the audit's 0.005 of a point and one person, each difference traced to the households and firms that moved it by record id. A search of src/core2 finds no `stepMacroMonth`, no pull of a region toward the nation, no pass that rescales arrivals to the Census, and no `reviewTurnover`. The owner plays it: he abolishes his state's income tax, clicks 20 years, and watches people and jobs move on the Metrics tab.

**Files.** docs/design/country-tier.md, src/core2/macro-model.ts, src/core2/modules/macro.ts, src/core2/regional-model.ts, src/core2/modules/regional.ts, src/core2/modules/counted-moves.ts, src/core2/modules/jobs.ts, src/core2/modules/outside-budgets.ts, src/core2/coarse-place.ts, src/core2/life.ts, src/bench/metrics.ts

**Notes.** Fable is building this on branch `claude/political-game-audit-build-h6d7tg`; the plan goes on the crew thread before the build starts. The measured defects it must close are filed as their own items: `nation-other-states-change-laws-in-year-one-then-almost-never`, `nation-other-states-never-change-an-amount`, `nation-another-states-law-reaches-nobody`, `core-officials-elsewhere-built-as-full-people-at-the-opening`, `world-three-checks-still-fail-a-run-for-leaving-a-real-range`. Existing open items on the same ground, to be folded into the design and not built twice: `world-other-places-coarse-population`, `core-opening-counts-from-census`, `core-outside-governments-treasuries`, `views-other-places-voters`, `core-speed-world-campaign-days-as-group-results`. The stopgaps it retires: SG-LABOR-turnover-fixed-rate, SG-SPEED-fast-forward-campaigns, SG-NATION-outside-budget-lines, SG-GOV-outside-revenue-base-national, SG-GOV-reserve-sweep.
