---
id: justice-pretrial-test-no-defendant-waits
title: "justice-pretrial.test.ts fails on main in some places: no poor defendant goes to trial and waits"
area: gov
kind: bug
priority: 3
size: S
status: claimed
claimed-by: claude/pretrial-flake
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:59:04.810Z
---

**What.** On clean main, JUSTICE_PRETRIAL_SEED=b6927636559db363 npx vitest run src/core2/justice-pretrial.test.ts fails in Naalehu, Hawaii (1553600) with 'no defendant waited for trial: expected 0 to be greater than 0': in the first twelve poor adults charged, every case either has no case row, pleads, or is not held, so the test's held list is empty. Find which of the three it is in that place (print each charge's plea and pretrial decision) and make the test choose defendants from the cases that go to trial, or fix the engine if a poor non-pleading defendant is not being held.

**Rules.** No dice: a plea comes from the defendant's own reads, not a roll; the test must not loosen its assertion that a poor defendant is held while cash bail is law. One rule, all 56 places: the test names the place and seed.

**Done when.** The test passes in Naalehu with that seed and in five further drawn places, with place and seed in the output, and the PR names which of the three causes it was.

**Files.** src/core2/justice-pretrial.test.ts, src/core2/modules/justice.ts

**Notes.** Found Oct 20 re-running the bail PR's test across seeds; reproduced on clean main.
