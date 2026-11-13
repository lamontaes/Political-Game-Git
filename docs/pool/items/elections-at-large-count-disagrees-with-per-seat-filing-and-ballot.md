---
id: elections-at-large-count-disagrees-with-per-seat-filing-and-ballot
title: "A town's at-large seats are counted as one race but filed, balloted and shown as separate races, so a candidate who lost their seat's race is seated and an unopposed one is not"
area: elections
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: medium
root: rc10-screens-keep-own-facts
source: "Playtester P3, Nov 13, 2026 (crew line #8928)"
checked:
claimed-at:
---

**What.** Three selectboard seats were up on Town Meeting Day. The clerk filed the player against one seat's holder ("You and Stephen Pugh for the selectboard, then"), Politics → Elections listed each seat with its own field ("Selectboard member (Stephen Pugh): You are running"; "Selectboard member (George Long): 1 running"), and the ballot paper printed three separate "For Selectboard member" blocks. The count then pooled all four names: Stephen Pugh 116, Sofia Nash 58, Logan Tyson 29, Donald Riddle 26, and seated the top three. The player, who lost her own seat's race, took office on April 2 ("I took office as Selectboard member."), Donald Riddle, unopposed for his seat, was left out, the winner phoned the player with a concession, the father said Pugh "drew 51 percent", and the paper printed "Stephen Pugh won with 50.7% of the vote. 229 votes were cast." This is the golden path's win-or-lose step. Seen: the clerk's counter, the Elections tab, the ballot paper, election night and the seated members on Government after a town election with more than one seat.

**Cause.** Found in code: holdElection in src/core2/modules/voting.ts (line 3095) counts every contest that atLargeGroup (src/core2/modules/elections.ts, line 875) groups (same office, same day, no district) as one race and seats the top finishers through atLargeWinner (voting.ts line 3042). Filing, the clerk's counter, the Elections tab and the ballot paper (src/bench/ui/ballot-paper.mjs, one block per contest) each treat a seat's contest as its own race with its own field. Measured: North Hyde Park, Vermont, seed a6b481a5-c6c9-432b-8cca-c0463c518da8, main 9ebc7c89 (Playtester P3, Nov 13, 2026): board before, George Long, Stephen Pugh, Steve Watson; after, Logan Tyson, Sofia Nash, Stephen Pugh.

**Fix.** One model, read by every view. First read the place's law: where a town's seats are elected by term or by seat (Vermont's selectboard seats are elected for named terms), each seat is its own race and atLargeGroup must not pool them (a field in the body's data row, not a state in code). Where the law is one at-large race ("vote for up to three"), the clerk files the player for the board, the Elections tab shows one field, the ballot prints one block with how many to mark, and election night and the result scenes read the group. Delete whichever per-seat or pooled path the data does not call for; record the rule's source.

**Time box.** 4 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the seat rule is a data row read for every place, never a state named in logic. The simulation is the one layer that knows: the clerk, ballot, Elections tab, returns and scenes all read the same contest grouping. Research before building: cite each state's rule used.

**Done when.** A second session plays a new life on main in a drawn place whose town elects several seats on one day, files, votes and reads election night, and the field the clerk named, the ballot block, the count and the members seated afterward on Government all agree; a played-world test in two drawn places finds no seated member who lost the race their ballot block showed.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/modules/elections.ts, src/bench/ui/ballot-paper.mjs

**Notes.** Related, filed the same hour: director-concession-received-plays-for-the-loser and play-election-night-counts-three-seats-as-one-race are views of this same pooling; fix this first and re-check them. More evidence, Jan 9, 2026, same life: Politics then Elections lists the March 3, 2026 ballot as "Selectboard member (Logan Tyson) 1 running / Selectboard member (Sofia Nash) / Selectboard member (Stephen Pugh) 1 running / Selectboard member (Logan Tyson)", so one seat is listed twice and the player's own seat shows no count. The seats are named for whoever holds them, and the three seats of a 3-member board all appear up in the same year.
