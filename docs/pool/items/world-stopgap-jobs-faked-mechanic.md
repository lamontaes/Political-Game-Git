---
id: world-stopgap-jobs-faked-mechanic
title: "Stopgaps in jobs (faked-mechanic): 6 open"
area: world
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/jobs.ts, kind faked-mechanic"
---

**What.** Replace or clear the 6 open faked-mechanic stopgap row(s) in src/core2/modules/jobs.ts: SG-WORLD-jobs-opening-seekers, SG-WORLD-jobs-layoff-decider, SG-WORLD-jobs-counted-choices, SG-WORLD-jobs-agreement-pinned, SG-WORLD-jobs-counted-retiree-income, SG-WORLD-jobs-offer-deadline-reminder. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/jobs.ts

**Notes.** First row: The opening's job seekers are the jobless working-age adults whose money covers the fewest days, as many as the nation's unemployment rate implies against the generated jobs; the other jobless adults sit outside the mode
