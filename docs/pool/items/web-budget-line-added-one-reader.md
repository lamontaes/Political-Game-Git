---
id: web-budget-line-added-one-reader
title: "The outcome web reads a budget line above its base two ways; one reader should serve every line"
area: laws
lead: laws-effects
kind: cleanup
priority: 2
size: S
status: claimed
standard: 2
claimed-by: claude/pool-web-budget-line-added-one-reader
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:39:13.564Z
---

**What.** Once the rights and environment family (#5669) and the health and schools family (#6026) are both on main, the outcome web reads "a budget line above its Census base" in two ways. The rights family keeps `budget.parks-added-pct` and `budget.highways-added-pct` as government measures in `src/core2/gov-measures.ts`, read through `lineAddedPct`. The health family reads `budget-line-added:<line>` for the health and hospitals, welfare and Medicaid, higher education and schools lines through `budgetLineAddedPct` in `src/core2/modules/outcome-web.ts`. Both measure the same thing for different lines (found by the laws lead while working out the merge of the two branches, Oct 25). Seen: the Metrics tab's measures a budget line moves, read by one reader (one engine per mechanic).

**Cause.** Found in code: src/core2/modules/outcome-web.ts ENGINE_READERS (line 236) reads 'parks-added-pct' and 'highways-added-pct' through lineAddedPct (line 260, measuring budget.parks-added-pct), while the budget-line readers go through budgetLineAddedPct from src/core2/gov-measures.ts (line 299, used at outcome-web.ts line 273); both measure a budget line's share above its Census base.

**Fix.** Keep one function that reads any budget line's share above its base, with the line taken from data; point every link at it in data/research/outcome-web/links.json and src/core2/data/outcome-web/outcome-web.json, and delete the other path and its measure keys (src/core2/gov-measure-keys.ts). A third path, schools-line-above-base, was noted Oct 27; fold it in too.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Replace, never layer: one reader serves every budget line, and the other path, its measure keys and its data rows are deleted in the same change. One rule, all 56 places: the reader takes the line from data, never a named line in logic.

**Done when.** A second session plays a year of buildBenchWorld in a drawn place (place and seed named), raises the parks line and the schools line, and sees each outcome-web measure move, named by the web's month record id; one function reads every budget line, the other path is gone (grep named), and src/core2/outcome-web.test.ts and both families' tests pass.

**Waits on.** Nothing. laws-nine-links-rights-env and laws-nine-links-health-schools, which it once waited on, are both marked needs cause and read the same budget lines: if either is being worked when this starts, tell its holder that the reader's name changes.

**Files.** src/core2/gov-measures.ts, src/core2/gov-measure-keys.ts, src/core2/modules/outcome-web.ts, data/research/outcome-web/links.json, src/core2/data/outcome-web/outcome-web.json

**Notes.** Filed by the laws lead, Oct 25. Take it after both families merge. Laws-and-effects lead, Oct 27: health is on main and #5669 now carries both readers side by side (merge b632d51a7a); main's schools reader `schools-line-above-base` is a third path to fold in.
