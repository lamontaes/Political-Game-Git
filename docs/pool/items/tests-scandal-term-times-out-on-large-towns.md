---
id: tests-scandal-term-times-out-on-large-towns
title: "scandal-term.test times out at the default 30 seconds in a large town"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/scandal-term.test.ts builds a drawn town with bookkeeping on and had no timeout of its own, so in a large town the build alone passes the suite's 30 second default and the test fails with 'Test timed out in 30000ms' while passing in a smaller town. It failed in two runs of the s-to-w sweep and in one of three standalone reruns on clean main. The assertions are not at fault.

**Rules.** Tests draw a random place from all 56 and name place and seed; a test that builds a world sets its own timeout like its neighbors.

**Done when.** src/core2/scandal-term.test.ts sets a 600 second timeout as src/core2/player-money-year.test.ts does, and passes in six consecutive random draws by npx vitest run, with the place and seed named in any failure.

**Files.** src/core2/scandal-term.test.ts

**Notes.** TODO
