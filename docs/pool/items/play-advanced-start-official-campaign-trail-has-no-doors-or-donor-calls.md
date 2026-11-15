---
id: play-advanced-start-official-campaign-trail-has-no-doors-or-donor-calls
title: "An official the Advanced start steps in as gets a campaign trail with no doors, events, forum, interviews or donor calls"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: rc7-player-cannot-drive
source: "Account lead T25 playtest, Nov 13, 2026 (Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train c39bbb71)"
checked:
claimed-at:
---

**What.** Stepped in as council member Quinn Pugh through the Advanced start and filed for re-election on Aug 19, 2025, with 0 of 10 signatures due Aug 28. Campaign, Go out on the trail lists only Ask (Volunteers, Endorsements, Ad, Poll), Money and Speak. The Out and about group (Knock on doors, Hold an event, Host a forum, Ask for an interview, Call donors, Meet donors) is missing at every hour from 8 AM to 8 PM. Meanwhile the world ran the campaign for him: by Sep 2 it showed 148 doors, 92 signatures, $1,346 raised and $578 spent that the player never chose. Seen: Politics, Campaign, Go out on the trail, and the race's numbers.

**Cause.** Found in code: contextOf in src/core2/campaign-day.ts (line 293) opens the day's choices only when filing.personId === core.playerId (world false). core.playerId is set once when the world is built (src/core2/state.ts, line 398), and BenchPlayer.select in src/bench/player.ts (line 80) never changes it when the Advanced start steps in as an official. So the stepped-in player's filing is treated as a world candidate's. Measured: Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train branch c39bbb71 (Account lead T25, Nov 13, 2026); Advanced start as Quinn Pugh (person_0da8a3ad92ce11a4), filing on contest:seat:gus2025:190194:council:0:2025-11-04.

**Fix.** When the bench selects the person the player plays (the Advanced start's pick, or continuing as another person), set the core's playerId to that person through the one setter the core has for it, or add one there. Then every reader of core.playerId (campaign day, volunteers, journal, hearer groups) follows the person on screen. Add a bench test: an Advanced start as a council member who files gets the canvass choice and no world-run campaign acts.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: the player chosen at an Advanced start is the one record every engine reads as the player. The world never campaigns for the player.

**Done when.** A second session takes the Advanced start on main in a drawn place, named with its seed, steps in as a local officeholder whose seat is up, files, and finds Knock on doors and Call donors on the trail. The race's doors, money and signatures move only when the player acts or a volunteer walks.

**Waits on.** Nothing.

**Files.** src/bench/player.ts, src/core2/state.ts, src/core2/campaign-day.ts
