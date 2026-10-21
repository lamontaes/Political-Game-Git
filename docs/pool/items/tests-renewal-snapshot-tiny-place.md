---
id: tests-renewal-snapshot-tiny-place
title: "renewal-snapshot.test.ts fails when the draw is a tiny place with no couple (Healy Lake, Alaska, seed a369304708eb8a70)"
area: people
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/renewal-snapshot-tiny-place-s5
pr: #4875
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T05:32:06.184Z
---

**What.** `src/core2/renewal-snapshot.test.ts` draws a place from all 56 and opens it with a requested 1,500 people, but a tiny place opens at its real size (Healy Lake, Alaska has a few dozen people) and has no couple, so the test's first assertion ("the drawn population must provide an existing couple") fails for that draw. Draw on to the next place until the opening has a couple, and fail clearly if none of 12 does.

**Rules.** A test reaches an applicable case or fails clearly; never skipped.

**Done when.** The test passes on seed a369304708eb8a708a02bfc90fbbdfa1cfebeb92 (which drew Healy Lake) and on a random seed.

**Files.** src/core2/renewal-snapshot.test.ts

**Notes.** Found in a sharded run of the core2 tests on main (Oct 17).
