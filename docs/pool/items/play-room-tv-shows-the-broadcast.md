---
id: play-room-tv-shows-the-broadcast
title: "The TV painted in the room shows the broadcast, not static"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play
model: sonnet
effort: medium
root: design-director-on-core2
source: playtest Nov 23 row C18 ("The TV in the room shows static while the LIVE box shows the President")
checked: sonnet 2026-11-23
---

**What.** The address cuts to a home and the player sees the speaker on the LIVE corner. The set painted in the room itself stays dark or shows painted static, so the room does not show what the household is watching. The owner reported it on Nov 23 and wants the corner kept. Seen: at the home beat of the address.

**Cause.** Found in code: `art/backdrops/apartment-rundown-living__night.jpg` paints static on its CRT and `apartment-starter-living` paints a dark flat screen; `drawTv` in `src/bench/play.mjs` draws only the corner set and knows nothing of the screen painted in the picture.

**Fix.** A data row `tv.screens` in `src/bench/data/controls.json` gives each painted set's glass as a percent of its picture; `drawTv` lays the speaker's headshot on that glass when the room has one. No picture is repainted and the LIVE corner is unchanged.

**Time box.** 2 hours, one Sonnet session.

**Rules.** Replace, never layer: the glass is one data row read by the one `drawTv`, with no second broadcast path. One rule, all 56 places: no place is named in logic, only in the data row keyed by picture. Estimate, never UNKNOWN does not apply.

**Done when.** A second session sees, in the running game, in a drawn place from all 56, with a screenshot, a new life whose home beat of the address is a room that paints a TV, and the painted set shows the speaker while the LIVE corner still does too, and the picture is kept in the pull request. Seen: at the home beat of the address.

**Waits on.** Nothing. Sets painted in other rooms are added as rows when those pictures are found.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/data/controls.json
