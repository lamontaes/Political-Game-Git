---
id: people-new-player-never-graduates-high-school
title: "Every 17-year-old new player leaves high school without a diploma: four of four drawn lives"
area: people
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: lives
model: opus
effort: high
root: none
source: Playtester P1, Nov 13
claimed-at:
---

**What.** On main 5e68cde1, each new life opens with the player at 17, a senior, on January 20, 2025. Played with Day and Week the way a new player plays, every one of them failed to graduate in June. Curtisville, Pennsylvania (bench seed 24b09c77-0589-433f-9b6b-0c77e53b4ff7): "You didn't graduate with your class. Vanessa Webb has been waiting to talk about it." and in the Journal, "I left Curtisville Public Schools without a diploma. That ended thirteen years there." The same happened in Floydale, South Carolina (7ef8e30e-dddf-4aae-a2c2-b4a1655188c7), Washington, District of Columbia (f303bf09-c2c8-4133-b1fc-79bf54763b00) and Henlopen Acres, Delaware (4e72516e-1566-405f-b6f6-76c7fe9af3c1). The national graduation rate is near 87%, and the player's siblings and parents all graduated in their stories. Seen: the June scene "You didn't graduate with your class" and the Journal line about leaving without a diploma.

**Cause.** Measured: Curtisville, Pennsylvania, bench seed 24b09c77-0589-433f-9b6b-0c77e53b4ff7, and the three other places and seeds above, each a new life on the bench played with Week (one also with Day and the campaign trail). In code: src/core2/modules/school.ts `schoolDay` skips the player (`person.id === api.state.playerId`), so the player's attendance is written only when the player's own acts take the `child-school` offer (`offerProviders`, `effectHandlers["school-day"]`). src/core2/school-outcomes.ts ranks seniors for graduation by `standing`, built from that attendance share (`attendanceShare`) and study traits. With Day and Week, src/bench/player.ts `advance` answers the player's choices with the core's own pick (`answerForSelf`). The four lives show that pick seldom or never takes school, so the player ranks last. Whether the offer is never made on Week's path, or made and outscored, is not yet traced.

**Fix.** Trace one Day of a 17-year-old player on a school day through `advance` and `answerForSelf`: whether the `child-school` offer is published and what the core picks. Then make the player's school day count the way every other student's does when the player has not chosen something else for those hours. That means the same chooser with the same compulsory pull, so a player who simply lives the day goes to school, as the owner's rule that Day never opens a choice list implies. A player who travels elsewhere in school hours misses that day, as now.

**Time box.** 4 hours for one Opus session.

**Rules.** No dice: graduation stays the school engine's ranking by attendance and traits; only the player's attendance record changes. One model, two tiers: the player attends by the same rule as every other full student. One rule, all 56 places.

**Done when.** A second session, on main, plays three new lives in a drawn place each, from January to July with Day and Week only. In each, the player's attendance share in June is near their household members' (dev mode or the school table, by record id), and the player graduates unless their standing ranks them out. The session takes a screenshot of the June scene and the Journal line.

**Waits on.** Nothing.

**Files.** src/core2/modules/school.ts, src/core2/school-outcomes.ts, src/bench/player.ts, src/core2/player-v1.ts
