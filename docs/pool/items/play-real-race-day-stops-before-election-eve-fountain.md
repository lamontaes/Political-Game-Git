---
id: play-real-race-day-stops-before-election-eve-fountain
title: "A played campaign week can leave the day one short of the election eve (Fountain, Colorado)"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: governing
source: account lead sweep, Nov 14 (Measured: the real-race played test at a fresh seed)
standard: 2
model: opus
effort: medium
root: none
checked:
---

**What.** In the real-race played test at seed 1a53f072da2f0fcc, at Fountain, Colorado (0827865, place seed `24dd3866c4afae9cfded09230b3f85a4be99b1523e1a875fc24edc96961b8162`), the test's walk toward the eve of election day ended at 2025-11-03 with the next stop still waiting, so the clauses were read on the eve but the note "the day stopped at 2025-11-03, before 2025-11-04" was printed: the world did not reach the date the loop asked for. At Castle Rock, Colorado (0812415) the same walk reached the date. The player's clock should reach election day in a played campaign, with every stop answered the way the test answers it (meeting adjourned, desk bills left, waiting entries acted on). Seen: the played race's clock reaching election day in a drawn place, the day the player reads the count.

**Cause.** Measured: at seed 1a53f072da2f0fcc, place Fountain, Colorado (0827865), shown by `GOLDEN_PATH_SEED=1a53f072da2f0fcc npx vitest run src/core2/campaign-real-race-played.test.ts` on the train at 71f2fa7e (draw 1, before #9164 pinned the test; the draw loop is gone after it, so replay with the place seed above in a played world built by `buildBenchWorld`), the walk in `src/core2/campaign-real-race-played.test.ts` (the loop that advances with `player.advance("calendar", to)` and answers each `stop` packet) left `core.date` at 2025-11-03 for the Fountain draw. Which stop or refusal held the clock is not yet read; this item's first step is to rerun that place with the walk printing each packet.

**Fix.** Rerun Fountain with the walk printing each packet kind and pause id until the date stops moving; the fix is then in whichever engine held the clock (the dev-mode run-until trap in `advance` is a known cause of a stranded unanswered stop; see the F6 work) or in the walk's own stop answers. Add the place to the pinned places in the played test once the clock reaches election day.

**Time box.** 2 hours for an Opus session.

**Rules.** Read-only screens spend no game time. No dice: the fix never decides an outcome by chance.

**Done when.** A second session replays Fountain, Colorado at place seed `24dd3866c4afae9cfded09230b3f85a4be99b1523e1a875fc24edc96961b8162` in a played world built with buildBenchWorld, with the walk's stops answered, sees `core.date` reach 2025-11-04 with no "day stopped" note, and sees the cause named by the stop's pause id as a record id in the test output.

**Waits on.** Nothing.

**Files.** src/core2/campaign-real-race-played.test.ts

**Notes.** Nov 14 (account lead): found beside the test pin in #9164. The incumbent's step-up at the same two places is the open item campaign-incumbent-hears-the-race (its evidence is added there).
