---
id: speech-outline-point-shapes-red-by-draw
title: "The speech outline test is red on some random seeds, so a draw decides it"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc4-hand-written-words
source: Account lead, Nov 14, 2026, from the Speeches builder's two-worker run of the changed tests
checked:
---

**What.** `src/director/speech-outline.test.ts` draws a random seed on every run, so its "ten drawn places" case passes on most draws and fails on others. Seed ecd58aa1425040e9 gives 20 of 39 speeches whose points open with a figure, where the test allows 19.5 (line 444). The same seed fails the same way on the train head without the jobs, pay and prices change. Seen: in a run of the test with seed ecd58aa1425040e9.

**Cause.** Found in code: line 38 of `src/director/speech-outline.test.ts` sets `seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex")`, so nothing pins the draw, and the bar of half the speeches at most per point shape is hit only when a draw lands over it. Why that draw goes over (which point shape the planner picks for a speaker whose facts are mostly figures) is not yet found.

**Fix.** Pin the test to fixed named seeds (the `pinned-tests` skill) and read why seed ecd58aa1425040e9 leaves 20 of 39 figure-first, then fix the planner's choice if it is a fault there. The bar of half stays as it is. The player sees it as speeches that open on a mix of figures, questions and plain statements.

**Time box.** 2 hours, Sonnet.

**Rules.** No dice: the shape follows the speaker's facts and the point's record. Tests pinned to named places and fixed seeds, never loosened to pass. Guards: `src/director/speech-outline.test.ts`.

**Done when.** The test names its seeds and passes on them. In three drawn places, seed ecd58aa1425040e9 among them, the test passes. Seed ecd58aa1425040e9 either passes because the planner's choice is fixed or is named as a pinned case with the cause. The bar stays at half. A second session reads three composed speeches on main and sees that their points open on a mix of figures, questions and plain statements.

**Waits on.** Nothing.

**Files.** src/director/speech-outline.test.ts, src/director/speech-outline.ts

**Notes.** Filed by the Speeches builder (D). Built as its own PR after the jobs, pay and prices PR folds. Red main, Nov 19 (CTO ruling on #9747, option a, left for the landing): Story's cut cleared the red on the train, but the planner gap stays. Cause read at `src/director/speech-outline.ts` (the `fits` and `shape` choice near line 2312): the speaker's order holds three shapes (context-first, question-first, plain-first) and a speech with more points than shapes falls back to a repeat, so on a speech of many points two points share a shape, and a complaint wording cannot open question-first. Fix, for Story after the reset: add a fourth shape a complaint can open with, and make the test a drawn-place check that no two points of one speech share a shape (print the place and the places passed over; replay with GOLDEN_PATH_SEED). The pin in the Fix above is replaced by this: pinned seeds only with a CTO line.
