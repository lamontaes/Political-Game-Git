---
id: play-player-entered-in-races-without-filing-press
title: "Find why the player is entered in races they never filed for, and why the filing route shows nothing open"
area: play
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: filing-counter
model: opus
effort: medium
root: none
source: Account lead thread, Nov 14, 2026, while showing conversation replies at a named place; coordinator asked for it as a pool item
checked:
---

**What.** In a played world where the player never pressed file, the player's ledger holds races and a loss, and the household talks about them. At Sherrodsville, place key 3972242, world seed "scan-25", 310 days from the game start with only advanceCore (no filing press), Angela says "I saw how Mayor came out" and Corey "I'm sorry about Council member" on 2025-11-04, and on 2025-12-06 housemates say "I saw you filed for County assessor" (seed "sh-1" at the same place: "I saw you filed for State Representative", "State Auditor", "Attorney General"). In the same worlds `governmentView(core, playerId).contests.find((row) => row.checks.every((check) => check.met))` never returned a contest, in 40 to 330 days at Sherrodsville (seeds sh-1 to sh-5, scan-10, scan-25, scan-28) and at drawn places (seeds f1, f2, f3, r1, r2, r3, p18aa, p18bb, p18cc), so the player had nothing open to file for. Seen: the person-engine path entered the player in races and recorded the results, while the filing route a player presses showed no race open.

**Cause.** Needs cause. The two routes disagree on whether a race is open to the player; the first step is to find what enters the player's person in a race during `advanceCore` (the candidacy path in `src/core2/modules/elections.ts`) and which of the route's `checks` was unmet at the same date.

**Fix.** None until the cause is found.

**Time box.** 3 hours, Opus.

**Rules.** Follow the standing rule "Wire to the world" and the other standing rules in AGENTS.md; one engine files candidates, so the player's person goes through the same filing as any other person.

**Done when.** At Sherrodsville (key 3972242) with seed "scan-25", no race appears on the player's ledger until the player presses file, and a race that is open to the player shows in `governmentView` with every check met on the day it opens. In three drawn places (name each place and seed), a played year shows the same. A second session on main plays the place and sees the filing route offer the open race and the player enter it by their own press.

**Waits on.** Nothing.

**Files.** src/core2/modules/elections.ts, src/bench/government.ts
