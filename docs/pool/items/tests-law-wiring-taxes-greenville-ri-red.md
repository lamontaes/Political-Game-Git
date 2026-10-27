---
id: tests-law-wiring-taxes-greenville-ri-red
title: "law-wiring-taxes fails in Greenville, Rhode Island: a tax law has no applied record after play"
area: laws
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/taxes-greenville-ri
pr: #6207
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T01:06:24.953Z
---

**What.** src/core2/law-wiring-taxes.test.ts fails on clean main in Greenville, Rhode Island (4431600) with GOLDEN_PATH_SEED=m3-wh1: 'laws with no applied record after play: expected [ Array(1) ] to deeply equal []'. Found by Merger 3 on PR 6193; it fails the same on main. One tax law in that place's played world writes no applied record, so the test reads nothing for it.

**Rules.** No dice. Fix the law's reach or the test's expectation from the records, in the drawn place, naming place and seed. Do not skip or narrow the test. Time box 3 hours, Sonnet, no helpers.

**Done when.** GOLDEN_PATH_SEED=m3-wh1 npx vitest run src/core2/law-wiring-taxes.test.ts passes on the merged head, and passes on two other drawn places, with the failing law named by id and its applied record id in the PR body

**Files.** src/core2/law-wiring-taxes.test.ts, src/core2/law-reach

**Notes.** TODO
