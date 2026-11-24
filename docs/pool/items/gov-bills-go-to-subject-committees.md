---
id: gov-bills-go-to-subject-committees
title: "Every bill goes to one committee named 'general', so legislatures vote in lockstep"
area: gov
kind: bug
priority: 2
size: M
status: done
claimed-by:
pr: #4691
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In all ten audit places every bill was sent to the 'general' committee with the same members and bills held there record 0 to 0; floor tallies repeat (Wyoming's House voted 56 to 6 on 12 of 16 votes). Route each bill to a subject committee by what its sections touch (legislature-committees.ts has the subject map), seated by the leadership engine, so votes differ by bill. Wyoming is the clearest case: with every bill in one committee its House vote repeats at 56 to 6, so a committee that never differs can never decide a bill differently.

**Rules.** No dice; an effect is a read; one rule, all 56 places; ask why (record ids); the chain is the acceptance.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, bills go to different committees whose members' votes differ, shown by bill id, committee id and the vote record ids of members on each committee, and a test in src/core2/legislature.test.ts covers it.

**Files.** src/core2/modules/legislature.ts, src/core2/legislature-committees.ts

**Notes.** The trace audit of Oct 14 (docs/reports/trace-audit-2026-10-14/README-TRACE-5.md); not re-checked on main today beyond the code location.

Sent back 2026-10-16 from PR #4691 (branch claude/bills-subject-committees): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
