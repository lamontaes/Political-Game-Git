---
id: tests-two-level-elections-redraws-at-run-time
title: "two-level-elections redraws places at run time until it finds a two-party race, instead of naming each seed's place"
area: elections
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-hjvzia-redraw
pr: 9641
after:
blocked-on:
root: design-electorate-one-model
lead: governing
model: sonnet
effort: medium
source: Account lead, Nov 15 (seen while tracing tl-c)
---

**What.** src/core2/two-level-elections.test.ts picks a state and place from its seed, and where that place has no race of both parties on Nov 3, 2026 it draws again, up to eight times, inside the test. Which place a seed plays is therefore found at run time, and the item and PR notes for tl-b first named the wrong state. Guards: every two-level election check names the place it played before it runs.

**Cause.** Found in code: `playTo(draw)` and the redraw loop in src/core2/two-level-elections.test.ts's `it` (DRAWS = 8) pick the place by hashing the seed with the draw number and keep the first world with a two-party race.

**Fix.** A script outside the test (under scripts/, capped at one hour) finds, for each seed the test names, the place and draw with a two-party race, and writes the seed and place key pairs into the test; the test then builds each named place directly with no redraw, and a seed with no named place is refused. No check is loosened.

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** One rule, all 56 places: the places are found by drawing from all 56 once by script, not chosen by hand and not redrawn at run time.

**Done when.** The test names each seed's place in its file and plays it with no redraw, passing at each named seed; a second session runs it at two of those seeds on the train and finds the place in the test's report line is the one the file names.

**Waits on.** Nothing.

**Files.** src/core2/two-level-elections.test.ts, scripts/elections/two-level-places.ts (new)
