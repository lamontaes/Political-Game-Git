---
id: tests-scandal-term-times-out-on-large-towns
title: "scandal-term.test times out at the default 30 seconds in a large town"
area: people
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #5529
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** src/core2/scandal-term.test.ts builds a drawn town with bookkeeping on and had no timeout of its own, so in a large town the build alone passes the suite's 30 second default and the test fails with 'Test timed out in 30000ms' while passing in a smaller town. It failed in two runs of the s-to-w sweep and in one of three standalone reruns on clean main. The assertions are not at fault.

**Rules.** Tests draw a random place from all 56 and name place and seed; a test that builds a world sets its own timeout like its neighbors.

**Done when.** src/core2/scandal-term.test.ts keeps a measured explicit timeout (currently main’s 300 seconds; do not raise it without measurements), and passes in six consecutive random draws by npx vitest run, with the place and seed named in any failure. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/scandal-term.test.ts

**Notes.** TODO

Sent back 2026-10-25 from PR #5529 (branch claude/scandal-term): earlier superseded label inaccurate: main300s differs fromrequested600s; currentmainmergeconflictsinscandal-term.test.ts; reconciletestandmeasuredtimeoutandaddDonewhentablewithsixdrawproof; finish on that branch, merge main into it first.

Rechecked 2026-10-26 for #5529: fixer retained main’s 300-second bound after six measured random draws (slowest case 47.7 seconds), rather than making the unmeasured increase to 600 seconds. Acceptance is the explicit measured bound and six consecutive passing random draws; the test now reports place, seed, population and build duration.
