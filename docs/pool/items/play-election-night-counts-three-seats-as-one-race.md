---
id: play-election-night-counts-three-seats-as-one-race
title: "Election night lists every seat's candidates in one count and names one winner of 'the race'"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: elections-at-large-count-disagrees-with-per-seat-filing-and-ballot
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
source: "Playtester P3, Nov 13, 2026 (crew line #8928, comment 6844698994)"
checked:
claimed-at:
---

**What.** A town electing three selectboard seats at once, each its own contest, showed one returns screen: 'Stephen Pugh 116 votes, Sofia Nash 58, Logan Tyson 29, Donald Riddle 26 ... Every place is in. Stephen Pugh wins the race for Selectboard member.' Tyson and Riddle ran unopposed for the other two seats, so the screen reads as if four people ran for one seat and two of the winners lost. Seen: the election-night returns screen after a town election with more than one seat.

**Cause.** Measured: North Hyde Park, Vermont, seed a6b481a5-c6c9-432b-8cca-c0463c518da8, main 9ebc7c89 (Playtester P3, Nov 13, 2026). Mar 5, 2025, the returns panel (#returns in src/bench/play.html) for the player's race listed the candidates of the three contests the ballot showed separately (three 'For Selectboard member' blocks on the ballot paper). Not yet traced to the line that gathers them; start from the returns route in src/bench/server.ts and the panel's renderer in src/bench/play.mjs.

**Fix.** Make the returns screen read one contest, the player's own (by its contest id), so only that contest's candidates and its call show. Where the other seats on the same ballot are wanted, show them as separate blocks, each with its own winner, from the same result records.

**Time box.** 2 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the check draws a place with a multi-seat town race. Screens show record data only: no new words; if a heading per seat is needed, the words go to Fable A.

**Done when.** A second session plays a new life in a drawn place on main where the town elects several seats on one day, files for one, and on election night sees the count for their own contest only, with the call naming that contest's winner.

**Waits on.** elections-at-large-count-disagrees-with-per-seat-filing-and-ballot decides whether the seats are one race or three; this screen then shows that.

**Files.** src/bench/play.mjs, src/bench/server.ts
