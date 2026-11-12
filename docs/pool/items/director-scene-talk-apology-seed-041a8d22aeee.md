---
id: director-scene-talk-apology-seed-041a8d22aeee
title: "scene-talk.test.ts fails on seed 041a8d22aeee: the apology purpose composes no apology line"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: director
model: haiku
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** src/director/scene-talk.test.ts, 'composes every purpose', fails on GOLDEN_PATH_SEED=041a8d22aeee on clean main: the apology scene's lines are leave, confront and a narrator reaction, with no line that apologizes (expected false to be true). Found by Merger 2 on Oct 27 while gating PR 6312; it fails the same on origin/main. A helper reran it on current main on Oct 29: 7 of the file's 8 tests pass and this one still fails at src/director/scene-talk.test.ts line 167, because the scene's last spoken line is the asked side's confront and the talk records no gap saying a question was left unasked. In src/director/data/situation-types.json the apology type's asker is the wronged side and its asked side is the apologizing role, whose moves include apologize, so the cause is either a bank with no apologizing line for this cast or a cast that never reaches that move, and which one is not yet known. Seen: an apology scene in which someone actually apologizes; today the last spoken line is a confront and the test is red on that seed.

**Cause.** Measured: does not reproduce on main 986f946b (Nov 11). `GOLDEN_PATH_SEED=041a8d22aeee npx vitest run src/director/scene-talk.test.ts` passes all 9 tests, 'composes every purpose' among them, and so does a fresh draw, `GOLDEN_PATH_SEED=cf-c-apology-1`. The re-run in the Notes found the same this morning on 79d23fa596. The test no longer meets an apology scene that ends on the asked side's confront, so the change that fixed it came in between Oct 29 and Nov 11; no line of the apology bank or cast is wrong today.

**Fix.** Nothing to build. The CTO drops the item as done by main. If 'composes every purpose' fails again on any seed, file a new item from that seed with the scene's lines printed.

**Time box.** 0.5 hours for the CTO to read this and drop the item.

**Rules.** One rule, all 56 places: reproduce on the seed and one fresh drawn seed and name the place and seed. Never skip or narrow the test to get green.

**Done when.** A second session runs the test file `src/director/scene-talk.test.ts` on GOLDEN_PATH_SEED=041a8d22aeee and on a fresh drawn seed (place and seed written down) and it passes; the item is then dropped.

**Waits on.** Nothing.

**Files.** src/director/scene-talk.test.ts, src/director/data/situation-types.json

**Notes.** TODO

**Notes (re-run, 2026-11-11, main 79d23fa596).** `GOLDEN_PATH_SEED=041a8d22aeee npx vitest run src/director/scene-talk.test.ts`: green, exit 0. Fresh draw `GOLDEN_PATH_SEED=760f630ebaa03cea`: green, exit 0. The place is not printed on a pass. Proposed for the CTO: drop as fixed on main.

Nov 11 (cause finder for Fable B): ran the file on the item's seed and one fresh seed on main 986f946b; both pass all 9 tests. I agree with this morning's re-run: drop it as fixed on main.
