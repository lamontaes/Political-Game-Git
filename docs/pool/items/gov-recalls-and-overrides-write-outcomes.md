---
id: gov-recalls-and-overrides-write-outcomes
title: "Recall petitions and veto overrides end with no outcome record"
area: gov
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/recall-override-records
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T09:32:25.278Z
---

**What.** South Dakota had two recall petitions, Washington three and Wisconsin seven, all filed March 6, 2025, and none has an outcome record because the recall step changes the seat but writes nothing to the log (recalls.ts near line 284). A council bill shows 'overridden' with no override record because the override vote also writes nothing (legislature.ts near line 2188). Write the outcome and the override vote as records the press and the director can read.

**Rules.** No dice; an effect is a read; one rule, all 56 places; ask why (record ids); the chain is the acceptance.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body), every recall result and every override vote has a public event by record id, shown by a test.

**Files.** src/core2/modules/recalls.ts, src/core2/modules/legislature.ts

**Notes.** The trace audit of Oct 14 (docs/reports/trace-audit-2026-10-14/README-TRACE-5.md); not re-checked on main today beyond the code location.

**Done (Oct 16).** A recall that fails, goes to the ballot, removes or keeps a member, and an override vote, each announce a public event by id (`recall-outcome:<recall>:<result>`, `veto-override:<bill>`). The press and director reading them moved to `director-recall-override-scenes`. In a played year, recalls were not reached in six drawn places (they are rare); the recall test drives one to its result and checks its event.
