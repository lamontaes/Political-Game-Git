---
id: gov-recalls-and-overrides-write-outcomes
title: "Recall petitions and veto overrides end with no outcome record"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4683
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** South Dakota had two recall petitions, Washington three and Wisconsin seven, all filed March 6, 2025, and none has an outcome record because the recall step changes the seat but writes nothing to the log (recalls.ts near line 284). A council bill shows 'overridden' with no override record because the override vote also writes nothing (legislature.ts near line 2188). Write the outcome and the override vote as records the press and the director can read.

**Rules.** No dice; an effect is a read; one rule, all 56 places; ask why (record ids); the chain is the acceptance.

**Done when.** In the seeds named, every recall petition and every override has an outcome or vote record by id. Shown in a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, with the test named and the record ids that prove it.

**Files.** src/core2/modules/recalls.ts, src/core2/modules/legislature.ts

**Notes.** The trace audit of Oct 14 (docs/reports/trace-audit-2026-10-14/README-TRACE-5.md); not re-checked on main today beyond the code location.

Sent back 2026-10-16 from PR #4683 (branch claude/recall-override-records): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
