---
id: tests-one-sponsor-evening-no-three-seat-body-by-draw
title: "one-sponsor-one-evening-staged.test.ts finds no town body of three held seats in some draws"
area: director
kind: bug
priority: 3
size: S
status: merged
standard: 2
claimed-by: claude/pool-tests-one-sponsor-evening-no-three-seat-body-by-draw
pr: #8586
blocked-on:
source: added with npm run pool -- add
after:
lead: director
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
claimed-at: 2026-11-11T04:51:44.512Z
merged-at: 2026-11-11T23:39:38.341Z
---

**What.** A confirmer replay of the unit for #7165 on main d6f72cf7c9 shows npx vitest run src/director/one-sponsor-one-evening-staged.test.ts failing "a sponsor's two asks on one evening, written by the engine, play in one stop and reach their roll calls (seed 8a51dac2a079525e)" with "no town body of three held seats" in As Rabagau, Northern Mariana Islands (territory:MP:as-rabagau), Alpine, Colorado (0801640) and the rest of its draws. On main 7898b3ea2c the same file passed on its own draw. The test gives up when every drawn place has only a small body, so the fix is in the search.

**Cause.** Found in code: src/director/one-sponsor-one-evening-staged.test.ts line 64 pushes "no town body of three held seats" and the test fails when every draw is a small body (seed 8a51dac2a079525e).

**Fix.** Draw more places from all 56, or build a three-seat body through the core's seams, naming each place passed over, without pinning a seed.

**Time box.** 2 hours.

**Rules.** One rule, all 56 places: a test that needs a case draws until it finds one, from all 56, naming each place and seed; never pin a seed to pass.

**Done when.** A second session runs GOLDEN_PATH_SEED=8a51dac2a079525e npx vitest run src/director/one-sponsor-one-evening-staged.test.ts on main and sees it pass, then ten fresh draws, each naming the drawn place whose three-seat body it used and the places it passed over.

**Waits on.** Nothing.

**Files.** src/director/one-sponsor-one-evening-staged.test.ts

**Notes.** TODO
