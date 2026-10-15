---
id: director-world-moments-red-on-main
title: "world-moments.test.ts fails on main: an economy event with no moment citing it, and no baby-born moment for parents (Oak Grove, Tennessee)"
area: director
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Two tests in `src/director/world-moments.test.ts` fail on clean main: "gives everyone an economy event named a moment that cites it" (one event has no moment citing it) and "tells parents of a baby born this year, by relation" (no parent moment found). Both fail the same way in Oak Grove, Tennessee, seed 118758c6a4b5ad6fe056c074ae0e615c54585cdec708c1674b965149bdf56718. Find which record the director no longer turns into a moment and fix it at the root.

**Rules.** Ask why (name the event and the producer by id); the chain is the acceptance; no dice.

**Done when.** Both tests pass on the seed above and on a drawn place; the cause is named by event id in the PR body.

**Files.** src/director/ledger.ts, src/director/world-moments.test.ts

**Notes.** Found while running the whole src/director suite for director-civic-producers-household (13 of 14 files and 80 of 82 tests pass; the same two fail on main, so the change under test did not cause them).
