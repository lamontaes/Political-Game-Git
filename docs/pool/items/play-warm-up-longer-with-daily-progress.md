---
id: play-warm-up-longer-with-daily-progress
title: "The warm-up runs two months and the loading bar moves with each of its days"
area: play
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/blockers-warm-up
pr: #9795
after:
blocked-on:
lead: speed
model: fable
effort: high
root: rc10-screens-keep-own-facts
source: owner's play of v0.112.0, Nov 16, 2026 ("It should continue to load. This is just poor optimization."; asked about the warm-up, "Longer"), crew list issue 9747 item 3c, split by the CTO on Nov 17
checked:
---

**What.** A new game's warm-up ran all its days in one block, so the loading bar stood still for 9 to 12 seconds at 85% and moved only 8 or 9 times in a build. The owner also asked for a longer warm-up. The history step held the bar for 3 to 4 seconds more.
Seen: Dallas, Wisconsin (seed 591cd64a-547e-49db-8633-5f18432f6486), still for 9,572 ms at 85% on main.

**Cause.** Found in code: src/core2/player-warm-up.ts `warmUpOpening` ran every warm-up day in one call and src/core2/pre-start.ts `runPreStart` ran every module's past in one call, so src/bench/world.ts `benchWorldStages` could not yield between them; src/core2/places-elsewhere.ts `townWithin` rebuilt every town in the state for each school year and work spell.

**Fix.**

1. The warm-up and the pre-start run become steps (`warmUpOpeningDays`, `runPreStartSteps`); school history and people's past report their own steps.
2. The build yields each step; the server sends the build's share, counting each warm-up day; the bar reads it.
3. `townWithin` reads each state's towns once per world.
4. The warm-up runs 61 days, and the day-zero marks it fills come off.

**Time box.** 4 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Speed: the bar moves only from real work done, never from a timer, and a world built in steps equals the world built in one block.

**Done when.** A second session starts a new game on the bench in a drawn place it writes down with its seed, and sees the bar move through "Letting the country run" step by step rather than stand for ten seconds, and the world opens 61 days after it was built. The rest of the owner's "every second" is play-loading-bar-still-through-warm-up.

**Waits on.** Nothing.

**Files.** src/core2/player-warm-up.ts, src/core2/pre-start.ts, src/core2/past-school.ts, src/core2/modules/people.ts, src/core2/places-elsewhere.ts, src/bench/world.ts, src/bench/handler.ts, src/bench/play.mjs, src/core2/data/opening/day-zero.json, tests/guards/day-zero-baseline.json

**Notes.** Built by the Blockers lane, Nov 17.
