---
id: dock-lit-under-resting-pointer-on-load
title: "News and Day glow when the game loads, because the pointer rests on them"
area: play
kind: bug
priority: 3
size: S
status: claimed
standard: 2
claimed-by: claude/pt-carryover-n8-p12
pr:
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: Carryover screens, Nov 23 sitting (N8-P12)
---

**What.** The owner, Nov 8: News and Day glow when the game loads, for no reason. Carried as N8-P12.
Seen: Nov 23, a drawn place, 1440x900: nothing on the dock has a glow class, an animation or a different shadow at rest. The glow is the ordinary hover light on whichever button sits under the pointer where the click that began the life landed.

**Cause.** Found in code: the hover rules (about line 932 of src/bench/play.css) `.ring:hover` and `.action:hover:not(:disabled)` in src/bench/play.css light any button under a resting pointer, and the dock (`#dock`, shown when `rings.hidden` turns false in src/bench/play.mjs, near `fitUiScale`) appears under the spot of the click that started the life.

**Fix.** While the dock settles after it appears, a hover on its rings or buttons shows the plain look; the first pointer move ends the settling and the hover light works as before. No player text changes.

**Time box.** 1 hour, one Sonnet session at medium.

**Rules.** Wire to the world: the fix covers every ring and action button in the one dock, not only News and Day, and adds no player text.

**Done when.** In a drawn place at 1440x900, with the pointer resting over News as the dock appears, News shows no hover light until the pointer moves, and lights as before after it moves. A second session starts a new game in the running game and sees nothing in the dock glowing before the pointer moves.

**Waits on.** Nothing.

**Files.** src/bench/play.css, src/bench/play.mjs

**Notes.**
