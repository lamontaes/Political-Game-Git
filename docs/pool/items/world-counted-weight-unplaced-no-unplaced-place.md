---
id: world-counted-weight-unplaced-no-unplaced-place
title: "counted-weight-unplaced.test.ts fails in a place with no unplaced workers (Lone Chimney, Oklahoma)"
area: people
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/peaceful-ritchie-03780x
pr: #5076
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T19:03:10.497Z
---

**What.** `src/core2/counted-weight-unplaced.test.ts` drew one place and asserted it had unplaced workers, so it failed in a place whose opening employment target leaves none (Lone Chimney, Oklahoma, 4043725). The test now draws places until one has them and names each that does not.

**Rules.** Tests draw a random place from all 56 and name place and seed; a test that cannot reach its case in a drawn place draws again rather than returning or failing.

**Done when.** `npx vitest run src/core2/counted-weight-unplaced.test.ts` passes on a fresh random seed, and fails with the named places if none of twelve draws has unplaced workers.

**Files.** src/core2/counted-weight-unplaced.test.ts

**Notes.** Found Oct 19 while building people-stopgap-residents-faked-mechanic (#5076); fixed in the same PR.
