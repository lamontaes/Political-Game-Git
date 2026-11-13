---
id: play-filing-follow-up-scene-waits-unseen-and-the-clock-stops
title: "After filing, the clerk's next scene waits unseen: Hour does nothing and three hours of doors take no time"
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

**What.** The player files at the counter at 8:00 AM and the talk ends. The clerk's follow-up ('It takes 10 signatures ... You know how to run a campaign?') is staged but never opened. The player stands in their own living room at 8:00 AM. Politics, Campaign, Go out on the trail, Knock on doors for 3 hours runs (54 doors, 34 signatures) and the clock still reads 8:00 AM. Hour pressed twice does nothing and says nothing. Only Day brings the scene up, and afterward the clock reads 11:00 AM, so the tutorial on how to get signatures plays after the player already has 34. The player can get out: pressing Day (on the clock at the bottom of the screen) opens the waiting talk at once, without the day passing, and play goes on from there; no menu screen opens it, and nothing on screen says to press Day. It is P2 because play can continue, though a player who never presses Day sees time stand still. It happened in both lives played (a new candidate on Jul 7, 2025 and the incumbent on Aug 19, 2025). Seen: the room after the filing talk, the Hour button, and the clerk's follow-up talk.

**Cause.** Found in code: BenchPlayer.spend in src/bench/player.ts (line 242) returns undefined while the player's packet is a choice, so POST /api/wait sends {} and the page changes nothing. POST /api/advance answers 400 'Answer the open choice or stop first.', and only then does the page fetch /api/story and open the staged candidate-filed moment. Campaign acts run while that choice is open, so their hours are not spent. Measured: Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train branch c39bbb71 (Account lead T25, Nov 13, 2026); moment person_9ffbde868fc7226e:2025-07-07:candidate-filed:filing:contest:seat:gus2025:190194:council:0:2025-11-04:person_9ffbde868fc7226e.

**Fix.** When the filing talk closes and the core holds an open choice, the page opens that choice's story at once, the same path the Day button's 400 takes now. Hour, Day, Week and the trail's Go open the waiting choice instead of returning nothing. Add a browser or bench test: file at the counter, then press Hour, and the follow-up talk is on screen with the clock unmoved until it is answered.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** This is a game, not a spreadsheet: a press that seems to do nothing loses the player. Read-only screens spend no game time, and an act spends its hours. Nothing waits silently: a press either moves the clock or shows what holds it.

**Done when.** A second session starts a new life on main in a drawn place, named with its seed, files at the filing office, and sees the clerk's follow-up talk without pressing Day. After it, the trail's 3 hours of doors move the clock by 3 hours.

**Waits on.** Nothing.

**Files.** src/bench/player.ts, src/bench/handler.ts, src/bench/play.mjs
