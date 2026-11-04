---
id: screens-result-night-stages-own-result
title: "Election night stages the player's own result scene once the returns close"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Lane 3 (words-venue-speeches-delivered Notes, Nov 4): the director composes the loser's concession call on the election-result moment, but the bench never stages it; the Storrs replay went from the returns to the morning-after talk. Needs from Lane 4: after the returns' Close, stage the player's election-result moment that night.

**Rules.** One scene engine: the bench shows the director's own moment (storyScene), no second scene. Wire to the world: the moment is the one the race's result record caused.

**Done when.** A test in a drawn place where the player's candidate lost finds election night carrying the director's result moment by record id, with its scene bound; play.mjs plays it after the returns' Close.

**Files.** src/bench/handler.ts, src/bench/election-night.ts, src/bench/play.mjs

**Notes.** lead: Lane 4, for Lane 3's path 6.
