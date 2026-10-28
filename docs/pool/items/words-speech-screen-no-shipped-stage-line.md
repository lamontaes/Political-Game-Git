---
id: words-speech-screen-no-shipped-stage-line
title: "The speech screen test fails on main: no speech stage line ships until the owner grades one"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/bench/speech-screen.test.ts fails on main in every drawn place, for example Belleville, Wisconsin, run seed aef02a699218f55c677103d86a4241b5823b44629b92886f0d9a8173a0eaea51, with 'opener: expected 0 to be greater than 0'. Every part in data/english/parts/speech-stages.json has been held (shippable false) since the authored-parts sweep, so the play screen offers no opener and a speech cannot be built in play. The test still expects four picks, and nothing in the release run catches it. The batch 22 table read now puts 18 of the 21 stage lines in front of the owner in a speech, so his grades are what bring the screen back.

**Rules.** No hand-written player text: the screen offers only stage lines with a good grade in the ledger, never a held one to fill the slot. Ask why: while no stage line ships, the test says so by part key instead of failing on a count of zero.

**Done when.** src/bench/speech-screen.test.ts passes on main in a place drawn from all 56 with a fresh seed: while every speech stage part is held it checks the play screen offers no held line and names the held part keys, and once any stage part has a good grade in data/english/part-grades.json it builds a speech from four picks and gives it through the campaign as before; the test fails when a held stage line is offered.

**Files.** src/bench/speech-screen.test.ts, data/english/parts/speech-stages.json, data/english/part-grades.json

**Notes.** Found by the Words session on Oct 24 while running the batch 22 table read's tests; the failure is identical on clean main.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built (test premise gone).
