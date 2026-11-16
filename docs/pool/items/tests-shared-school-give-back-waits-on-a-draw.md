---
id: tests-shared-school-give-back-waits-on-a-draw
title: "The school give-back test waits a year for a scene with a schoolmate"
area: words
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/project-thread-5efbu8
pr: 9530
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Red on the Train b22cd350 (Nov 15) after #9505 folded
---

**What.** `src/director/shared-school-give-back.test.ts` is red on the Train. It played a year of the director's scenes at seed 7952d3f3e3253ee4 and waited for a scene whose counterpart was a schoolmate. After the Train changed the draw, no school question came up in the year, so the test failed with nothing to check. Guards: the shared-school give-back a player hears in a talk (words-played-talks-cause-invite-yes-not-followed-up).

**Cause.** Measured: `npx vitest run src/director/shared-school-give-back.test.ts` at seed 7952d3f3e3253ee4, on the Train b22cd350, fails at its final count with 0 questions after 365 played days. The test waits for a draw: whether a scene's talk pairs a watched person with a schoolmate depends on the year's scenes, and any change to the director moves that.

**Fix.** In the test, the player chooses whom to talk to, through the bench's own routes: a new life made in the creator at 45 (so the school years are long enough ago for a schoolmate to raise them), schoolmates taken from the school records who work at a place the player's Travel menu lists, a visit to each place (`/api/goto/visit`) and a talk with each schoolmate there (`/api/talk/open`). No moment is copied or staged by hand. No change to the conversation engine.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** One rule, all 56 places: the place comes from the seed, never named in logic. No dice: the test changes how the talk is reached, never what anyone says.

**Done when.** A second session, on main, runs the test in the place seed 7952d3f3e3253ee4 draws from all 56 (Dortches, North Carolina), pinned in the test; there at least four schoolmates ask about the school, each answers back after the player's reply, and the test fails when `shared-school` is taken out of `givesBack.kinds`.

**Waits on.** Nothing.

**Files.** src/director/shared-school-give-back.test.ts

**Notes.** Nov 15: built on claude/project-thread-5efbu8. At the pinned seed five schoolmates ask over two played days (Blair, Julie and Rebekah on Jan 21, 2025; Paige and Kimberly on Jan 22), and each answers back. Measured at about 32 seconds of play, 50 with loading; the limit is 65 seconds. Seen red without the rules row: the talk ends on "Yeah. That takes me back." Read tracing is off in the test, as in play: with it on, the player's pending work choice fails its stale-read check ("Invalid or duplicate dated work result. Stale finance field value...") after a few visits in one day.
