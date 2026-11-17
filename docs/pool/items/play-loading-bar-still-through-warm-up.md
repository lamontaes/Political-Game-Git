---
id: play-loading-bar-still-through-warm-up
title: "The loading bar stands still for ten seconds while the warm-up runs all its days in one block"
area: play
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by: claude/blockers-warm-up
pr:
after:
blocked-on:
lead: speed
model: fable
effort: high
root: rc10-screens-keep-own-facts
source: owner's play of v0.112.0, Nov 16, 2026 ("It should continue to load. This is just poor optimization."), crew list issue 9747 item 3c
checked:
---

**What.** A new game's loading bar moves 8 or 9 times in a build and stands still for 9 to 12 seconds at 85% while the world's warm-up runs. The history step holds it for another 3 to 4 seconds. The owner read it as a stuck, badly made load.
Seen: Dallas, Wisconsin (seed 591cd64a-547e-49db-8633-5f18432f6486), still for 9,572 ms at 85% on main by src/bench/loading-bar-moves.browser.mjs.

**Cause.** Found in code: src/core2/player-warm-up.ts `warmUpOpening` ran every warm-up day inside one call, and src/core2/pre-start.ts `runPreStart` ran every module's past in one call, so src/bench/world.ts `benchWorldStages` could not yield between them and the server could not answer the bar. src/core2/places-elsewhere.ts `townWithin` also rebuilt every town in the state for each school year and work spell.

**Fix.**

1. The warm-up and the pre-start run become steps (`warmUpOpeningDays`, `runPreStartSteps`); a module's run may report its own steps (school history, people's past).
2. The build yields each step with how many are done; the server sends the build's share, counting each warm-up day; the bar reads it.
3. `townWithin` reads each state's towns once per world.
4. The warm-up runs 61 days, from the owner's answer "Longer".

**Time box.** 4 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Speed: the bar may move only from real work done, never from a timer that fakes it, and the world built in steps must equal the world built in one block.

**Done when.** A second session starts a new game on the bench at 1440x900 in a drawn place it writes down with its seed, and watches the bar: it moves at least once every second until the game opens, and src/bench/loading-bar-moves.browser.mjs passes on main.

**Waits on.** Nothing.

**Files.** src/core2/player-warm-up.ts, src/core2/pre-start.ts, src/core2/past-school.ts, src/core2/modules/people.ts, src/core2/places-elsewhere.ts, src/bench/world.ts, src/bench/handler.ts, src/bench/play.mjs, src/bench/loading-bar-moves.browser.mjs (new)

**Notes.** Filed and built by the Blockers lane, Nov 17, on branch claude/blockers-warm-up.
