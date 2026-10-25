---
id: web-twins-skip-gov-measures
title: "The twin check fails on main: it tries to shift the government's measures, which no record row holds"
area: world
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/outcome-web-twins.test.ts shifts every running non-law cause in the record the web reads it from. Since the labor law wiring, the web counts the government's ten measures (gov-measure-keys.ts, read by gov-measures.ts from budgets, elections and the wage floor) as causes, and budget.parks-added-pct now runs. engineMeasure knows nothing of them, so the check shifts them as kept outcomes, touches no row, and fails: 'budget.parks-added-pct: expected 0 to be greater than 0' (drawn seed 6a3fb300aa4b91e3, on main after the labor family merged, Oct 25).

**Rules.** An effect is a read, not a record: a twin shifts the record a reader reads, and a measure computed by a reader from other engines' records is shifted by changing those records, which a law or budget test does. Never weaken tests: the check still shifts every cause it can and still requires a moved record kind for those.

**Done when.** outcome-web-twins.test.ts leaves out the government's measures with the causes read through a named reader, saying why; it passes on main in Paris, Arkansas (seed ew20oct26) and a drawn place over four months, with each cause's moved record kinds posted in the leads channel.

**Files.** src/core2/outcome-web-twins.test.ts

**Notes.** TODO
