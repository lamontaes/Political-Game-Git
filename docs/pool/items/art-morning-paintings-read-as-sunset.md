---
id: art-morning-paintings-read-as-sunset
title: "The morning paintings are warm golden light and read as sunset beside text that says early or morning"
area: art
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: claude/pt-carryover-n16-49
pr:
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: Carryover screens, Nov 23 sitting (N16-49, N16-50)
---

**What.** The owner's Nov 16 playtest found morning or "early" text shown in sunset light. In a played life the room's picture follows the clock (6 a.m. to 11 a.m. is the `morning` painting), but the `morning` paintings are drawn in warm golden low-sun light (orange on the walls, an amber window, a long low shadow), which reads as sunset.
Seen: Nov 24, a drawn place: the clock read 8 a.m. and the backdrop was `trailer-home-living__morning.jpg`, an orange-lit room.

**Cause.** Measured: in a drawn place (a played life, seed drawn by the New game button, run on Nov 24 with the play script that presses Hour 25 times and reads the clock against the backdrop file), a played life with Hour pressed 25 times gave `__night` at 8 p.m., `__morning` at 8, 9 and 10 a.m., and the midday-light painting from 11 a.m. to 6 p.m. (`lightAt` in src/bench/scene.ts reading `variantByHour` in src/bench/data/scene-places.json), so the code follows the clock; the painting itself is the sunset-like light.

**Fix.** A wanted row for a cool early-morning light variant of each `morning` room (docs/art/WANTED.md, row pt-1). No picture is painted or added here, and the game's code is not changed; a painted variant is a manifest row and the lookup already picks it by hour.

**Time box.** 1 hour, one Sonnet session at medium (the row only).

**Rules.** Wire to the world: the wanted row covers every room with a `morning` painting, not the one example, so a painted cool light reaches every morning scene through the one `variantByHour` lookup, and nothing is hand-typed per scene.

**Done when.** docs/art/WANTED.md carries the row pt-1 for the cool early-morning variant of every room that has a morning painting, and a second session reading it in a drawn place's played world finds the row names `trailer-home-living__morning` and the 6 a.m. to 11 a.m. hours, with no test or screenshot needed because nothing changes in the running game until the painting exists.

**Waits on.** Nothing.

**Files.** docs/art/WANTED.md

**Notes.**
