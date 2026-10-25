---
id: web-reach-schools
title: "Every school outcomes link in the outcome web reaches a person's records or names why not"
area: core
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr: #5934
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
claimed-at:
---

**What.** The outcome web holds 221 researched links; after the merged engine families about 109 reach an engine's records and 112 do not, each listed with its reason and stopgap in `src/core2/data/outcome-web/unwired.json` (written by `scripts/outcome-web/write-unwired.ts`; on the capstone branch until it merges). This item is the school outcomes family: 15 unwired links, 2 where the owning engine does not read the factor and 13 where nothing keeps the outcome. Their outcomes: school.test-scores, school.graduation, school.absence, school.learning, school.years-completed, school.college-completion-pct and the rest. Make the engine that owns each outcome multiply its own rates by the link's effect per person, so real records move, or give the link one specific reason it cannot.

**Rules.** An effect is a read, not a record: a link counts only when the owning engine reads the factor at the moment it decides or pays. One model, two tiers: full and counted people take the same factor by the same rule, with researched moderators. Research before building: size, lag and spread come from the link's citation, never a tuned guess.

**Done when.** `src/core2/outcome-web-twins.test.ts` in a drawn place (seed named) shows each link in this family moving a record kind outside the web's own tables after its lag, and `scripts/outcome-web/effect-matrix.ts` on a played year of `buildBenchWorld` grades it as reaching, with one record id per link in the PR body; any link that stays unwired keeps a specific stopgap row in the unwired list.

**Files.** src/core2/modules/school.ts, src/core2/school-outcomes.ts (on branch effect-web-schools), src/core2/outcome-web-reach.ts

**Notes.** Split Oct 24 by the CTO from the effect-web audit (order `docs/work-orders/lead-effects-2026-10-24.md`). Counts from the capstone branch's unwired list on Oct 23 (effect-web-integration). The school outcomes engine is in review on branch effect-web-schools, with the income-fifth fix `world-school-income-same-tiers`; most of the 13 "no measure" links are measures that engine keeps. A PR names this item on line 1 and `Lead: effects` in its body.

Sent back 2026-10-24 UTC from PR #5934 (branch claude/web-reach-schools): three carried reaching links lack the per-link played outside-web record IDs explicitly required in the PR body; add records and place/seed tied to matrix/twin proof; finish on that branch, merge main into it first.

Sent back 2026-10-25 UTC from PR #5934 (branch claude/web-reach-schools): at0a9bf3d131 carrier world proof fails school-outcomes-carriers-web.test.ts174 in Haledon NJ root535166c84bebb611, place seedb195856203535b083d5ae8ae82f7751f36b0378e324252092086426cbba21006, graduation groupfactor ratio1 expected1.3; reproduced unchanged in isolated same-seed full-year rerun (defaultdebug2798.59s, bookkeepingoff1043.81s), so trace actual consumed carrier value and preserve positive per-carrier records/full365-day boundaries; spending365-day Lexington proof passed and should remain; finish on that branch, merge main into it first.

Sent back 2026-10-25 UTC from PR #5934 (branch claude/web-reach-schools), checked 896e4c3a1a: the new 144-month spending exposure reads mutable opening-month values as pre-opening history (modules/outcome-web.ts309-313); controlled Westerly RI root37ee85ff132ea714/world a8a96cd3e4929d2de0707c16ae13d4dbf596da616c7f2d7a472b97e31327c58e, real schools-budget raise10% and two same-date web refreshes on2025-01-21 change effect .0007708333331 to .1109999999620 (144x), baseline still0; preserve historical opening observations and add repeated-refresh regression. Haledon carrier repair passes own2074.846s (all3 carriers5/5 fifths,135/135/3 student results), keep it and full365-day boundaries; fresh spending worker exited unexpectedly with no result, not cited as an assertion failure. Finish on that branch, merge main into it first.
