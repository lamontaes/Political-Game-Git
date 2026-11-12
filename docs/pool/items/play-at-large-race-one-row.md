---
id: play-at-large-race-one-row
title: "Campaigns and the clerk offer an at-large council as one race, not one per seat"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-play-at-large-race-one-row
pr: #8550
blocked-on:
source: added with npm run pool -- add
after:
lead: screens
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
checked: fable 2026-11-10
claimed-at: 2026-11-11T03:48:45.664Z
---

**What.** A confirmer replay of Lane 1 path 1 on main (which includes the at-large seats counted as one race) in New Game, Haleyville, Alabama (0132704, replay ab5f58e9be125c95) shows, on May 20, 2025, five races on Campaigns for the August 26 election, 'Council member (Andrew Clay)', '(Cora Daniels)', '(Keith Robinson)', '(Robert Chavez)' and '(Suzanne Copeland)', each with its own running count, plus Mayor. File for it files for one seat (filing:contest:seat:gus2025:160735:council:0:2025-08-26). The count is pooled, but the player still sees and files for one seat of five. The owner met the same thing in Manchester, Connecticut as 'Selectman (Amy Villarreal)', 'Selectman (Janet Giles)', 'Selectman (Karen Li)', each with '1 running' (playtest 2026-11-08-1, point C14).

**Cause.** Found in code: `localRaces` in src/bench/government.ts (its second `.map`, about lines 465 to 480) appends the incumbent's name to the title whenever two contests share a title, and `campaigns()` in src/bench/play.mjs (line 4217) draws one row per contest it is sent, so a pooled at-large council or board of selectmen shows as one-seat races named by their holders. Seen in Haleyville, Alabama (replay ab5f58e9be125c95) and Manchester, Connecticut (docs/coordination/playtest/2026-11-08-1-check.md, C14).

**Fix.** Have the screen show one race per pooled contest (council or board of selectmen) that lists everyone running and files for that race, with its title from the English engine, and delete the holder-name renaming in `localRaces`.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: the screens read the pooled race the elections engine keeps; a view never splits it back into seats. No hand-written player text: the race's label comes from the English engine's banks, not from text typed into the screen.

**Done when.** A second session replays New Game in Haleyville, Alabama at replay ab5f58e9be125c95 on main and on May 20, 2025 sees one Council member race for five seats on Campaigns, with everyone running in it, and files for that race; the same in one other at-large town drawn from all 56 (place and seed named). It is shown in a played world by screenshot, with the contest id named.

**Waits on.** Nothing.

**Files.** src/bench/government.ts, src/bench/play.mjs, src/bench/filing.ts

**Notes.** TODO

Nov 10, Fable audit: still shows. The audit (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6, "Not fixed (measured)") found on Nov 9 that races are still named by their holder: "Selectman (Brandon Reed)". The audit's line names no place or seed; its browser life was in Blodgett Landing, New Hampshire, a random world. The owner met the same thing on Nov 8 in Manchester, Connecticut (docs/coordination/playtest/2026-11-08-1.md, point C14): "Selectman (Amy Villarreal)", "Selectman (Janet Giles)", "Selectman (Karen Li)", each with "1 running". Read on main, Nov 10: the renaming is the second `.map` in `localRaces` of `src/bench/government.ts`, lines 470 to 482, which adds the holder's name whenever two races share a title; the Elections screen (`campaigns()` in `src/bench/play.mjs`, line 4217) draws one row per contest it is sent. The playtest check (`2026-11-08-1-check.md`, C14) names this item as the fix. Whoever claims it should check a board of selectmen as well as a council, in a drawn place, with a screenshot of Politics, Elections that shows one race for the board and no holder's name in a race title.
