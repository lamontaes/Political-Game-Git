---
id: gov-contests-with-one-name-or-none
title: "Elections with one name or none name no winner, and one-name primaries count no votes (Vermont, Washington)"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4692
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A Vermont selectboard seat with no candidate has a result that names no winner; 12 county party primaries counted no votes because a primary with fewer than two names is skipped (voting.ts near line 1317); and Washington's primary totals are fractions such as 3,261.54. Decide an uncontested race by its law (the sole candidate wins, an empty seat follows the empty-race rule) and keep vote counts whole. Each of these counts as a defect until the record answers why the race ended as it did, by contest and rule id.

**Rules.** No dice; an effect is a read; one rule, all 56 places; ask why (record ids); the chain is the acceptance.

**Done when.** In the played world (buildBenchWorld) in the seeds named in the pull request, a test shows an unopposed race names its winner, an empty one records the rule that applied, and every vote total is a whole number, by contest and result record ids.

**Files.** src/core2/modules/voting.ts

**Notes.** The trace audit of Oct 14 (docs/reports/trace-audit-2026-10-14/README-TRACE-5.md); not re-checked on main today beyond the code location.

Sent back 2026-10-16 from PR #4692 (branch claude/gov-contests-one-name): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4692 (branch claude/gov-contests-one-name): The new wide-races.test.ts one-name edge fixture fails at line 149 in East Hartford, Connecticut (key 0922700), seed b50c6001af7b4364: no stateLegislative or countyOffice contest obtains a filing, so contest is undefined. Make the applicable one-candidate fixture work across drawn places without skipping or loosening its winner and integer assertions. The other six tests, typecheck, changed lint/format, zero-dice and release checks passed; finish on that branch, merge main into it first.
