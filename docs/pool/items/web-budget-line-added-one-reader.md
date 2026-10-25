---
id: web-budget-line-added-one-reader
title: "The outcome web reads a budget line above its base two ways; one reader should serve every line"
area: laws
kind: cleanup
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on: laws-nine-links-rights-env, laws-nine-links-health-schools
source: added with npm run pool -- add
---

**What.** Once the rights and environment family (#5669) and the health and schools family (#6026) are both on main, the outcome web reads "a budget line above its Census base" in two ways. The rights family keeps `budget.parks-added-pct` and `budget.highways-added-pct` as government measures in `src/core2/gov-measures.ts`, read through `lineAddedPct`. The health family reads `budget-line-added:<line>` for the health and hospitals, welfare and Medicaid, higher education and schools lines through `budgetLineAddedPct` in `src/core2/modules/outcome-web.ts`. Both measure the same thing for different lines (found by the laws lead while working out the merge of the two branches, Oct 25).

**Rules.** Replace, never layer: one reader serves every budget line, and the other path, its measure keys and its data rows are deleted in the same change. One rule, all 56 places: the reader takes the line from data, never a named line in logic.

**Done when.** One function reads any budget line's share above its base, every link that starts from a budget line names its measure the same way in `data/research/outcome-web/links.json` and `src/core2/data/outcome-web/outcome-web.json`, the other path is deleted, and in a played year (`buildBenchWorld`, a drawn place from all 56, seed named in the PR) raising the parks line and the schools line each moves its outcome-web measure, named by the web's month record id. `src/core2/outcome-web.test.ts` and both families' tests pass.

**Files.** src/core2/gov-measures.ts, src/core2/gov-measure-keys.ts, src/core2/modules/outcome-web.ts, data/research/outcome-web/links.json, src/core2/data/outcome-web/outcome-web.json

**Notes.** Filed by the laws lead, Oct 25. Take it after both families merge.
