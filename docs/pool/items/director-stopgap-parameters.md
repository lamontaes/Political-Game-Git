---
id: director-stopgap-parameters
title: "The director's number stand-ins take their sourced values"
area: director
kind: stopgap
priority: 2
size: M
status: done
claimed-by:
pr: #4723
blocked-on:
source: "core-needs-fixer-51 triage, Oct 15"
claimed-at:
---

**What.** Seven director parameter stopgaps (directorMomentFloor, directorWeightTieSociability, directorWeightMoneyRisk, directorTies, directorHalfLives, directorAnniversaryHalfDays and the past-fact estimates) are listed in `src/director/data/stopgaps.json` as open, and `data/research/stand-in-figures-2026-10-12.json` carries a recommended value or bounds and a source for each. Apply each as a SOURCED or ESTIMATED row in the parameter table with its spread, and resolve its stopgap. Where the research gives only bounds, keep the row TUNABLE and name the spread it is checked against.

**Rules.** Estimate, never UNKNOWN: a value the player can see starts from the real average with a per-world spread and its source. Every number lives in the parameter table, tagged.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56) the director reads each applied row, shown by a parameter row and the moment record id it scored; the tests for src/director pass and the seven stopgap rows are resolved or rewritten with a reason.

**Files.** src/director/data/director.json, src/director/data/stopgaps.json, src/director/ledger.ts, data/research/stand-in-figures-2026-10-12.json

**Notes.** core-needs-fixer-51 triage, Oct 15: none of these seven had a pool item. SG-P13-param-directorInterruptImpact, directorScaleHealth and directorRenewedFading are also open but have no research row.

Sent back 2026-10-16 from PR #4723 (branch claude/director-stopgap-params): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
