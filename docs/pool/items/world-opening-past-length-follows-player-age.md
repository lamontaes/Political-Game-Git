---
id: world-opening-past-length-follows-player-age
title: "An older player's world takes longer to build, because the history before day one starts at the player's birth year"
area: world
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: speed
model: sonnet
effort: medium
source: "Account lead, Nov 16 07:32Z: the longer past for an older player stays as the owner ruled, with no cap; record the build time by player age so it is on the record"
---

**What.** Since a new game starts the player at 18 or older (#9684), the player is one of the town's adults, often 40 to 60. The history the world builds before day one runs from the player's birth year to the start, so an older player opens a longer past and a slower build. At Bethel Springs, Tennessee (4705380), `npm run speed:year -- --place 4705380 --seed age-4705380 --years 1` built in 17.6 and 15.9 s against 10.6 and 10.1 s with the old 17-year-old player, and `world-metrics.years` held 8,039 rows after year one against 2,121. In a direct build at the same seed, each place held 43 year rows for a 40-year-old player against 20 for a 17-year-old. Year one itself ran within noise (56.9 to 65.8 s against 54.5 to 63.2 s). Seen: the New Game wait grows with the player's age.

**Cause.** Measured: at Bethel Springs, Tennessee (4705380), seed age-4705380, by `npm run speed:year -- --place 4705380 --seed age-4705380 --years 1`, on the age branch at b25788c5 against the Train at f26c10de, one process at a time. Found in code: `preStartFromYear` in src/core2/saves.ts returns the player's birth year, and `defaultPreStart` runs the coarse history from that year (the owner's default: "coarse history from the player's birth year to the start").

**Fix.** None to the length: the owner's default stands and the lead ruled no cap (Nov 16 07:32Z). The speed line keeps the build-time numbers by player age on the record. If a New Game build at a drawn place passes the speed bar's limits, the step to make faster is the coarse history's own cost per year (`runPreStart`), never a shorter past.

**Time box.** 1 hour to record the build time at player ages 18, 40 and 70 at three named places with seeds, one process at a time.

**Rules.** Speed: no change may make a year more than 20% slower than its base. One rule, all 56 places.

**Done when.** The build seconds at player ages 18, 40 and 70 at three named places with seeds are written in this item's Notes. A second session sees in the running game, at a drawn place it names with its seed, that dev mode's "How this world opened" shows the player's age and the world opens with a past from the player's birth year.

**Waits on.** Nothing.

**Files.** src/core2/saves.ts, src/bench/world.ts.
