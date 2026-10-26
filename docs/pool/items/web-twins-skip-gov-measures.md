---
id: web-twins-skip-gov-measures
title: "The twin check fails on main: it tries to shift the government's measures, which no record row holds"
area: world
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #6151
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** src/core2/outcome-web-twins.test.ts shifts every running non-law cause in the record the web reads it from. Since the labor law wiring, the web counts the government's ten measures (gov-measure-keys.ts, read by gov-measures.ts from budgets, elections and the wage floor) as causes, and budget.parks-added-pct now runs. engineMeasure knows nothing of them, so the check shifts them as kept outcomes, touches no row, and fails: 'budget.parks-added-pct: expected 0 to be greater than 0' (drawn seed 6a3fb300aa4b91e3, on main after the labor family merged, Oct 25).

**Rules.** An effect is a read, not a record: a twin shifts the record a reader reads, and a measure computed by a reader from other engines' records is shifted by changing those records, which a law or budget test does. Never weaken tests: the check still shifts every cause it can and still requires a moved record kind for those.

**Done when.** outcome-web-twins.test.ts leaves out the government's measures with the causes read through a named reader, saying why; it passes on main in Paris, Arkansas (seed ew20oct26) and a drawn place over four months, with each cause's moved record kinds posted in the leads channel. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/outcome-web-twins.test.ts

**Notes.** TODO
Claim released Oct 25: branch never pushed (`claude/web-twins-skip-gov-measures`).

Sent back 2026-10-26 from PR #6151 (branch claude/web-twins-skip-gov-measures): Done-when drawn-place four-month proof is incomplete: body says first of six runs for6a3fb300aa4b91e3 passed and five remain, and the drawn-place per-cause moved-record-kind table is not published in the PR or current leads channel. Complete those two evidence rows; local main integration clean, no own full twin pass claimed.; finish on that branch, merge main into it first.
