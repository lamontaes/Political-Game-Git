---
id: press-reporter-fee-bill-says-cuts-the-program
title: "A reporter's question about a park fee bill says it cuts a program most people use"
area: words
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: filed by hand on branch claude/project-thread-xy4wd4 (cluster 13, PR #9308)
after:
lead: words
standard: 2
model: opus
effort: medium
root: none
---

**What.** After the player files a bill that raises a park fee, the reporter's scene asks "Then why does it cut the program most of them use?" The bill raises a fee; it cuts no program. The line must read what the bill does. Seen: in the reporter's scene after the player files a fee bill, where the question and replies name the fee.

**Cause.** Measured: played in the browser (scripts/play-walks/fee-bill.mjs) at Fairfield, Oklahoma, seed 14fecd05-cd2a-4dbf-9bdc-c52c9a54e162, Adair County Board of Commissioners, Ordinance 2025-1 "Park Fee Increase Ordinance" (park and recreation fees raised to one and a half times today's fee). On January 23, 2025 Emily Witt of the Fairfield Gazette says "Who did you have in mind when you wrote Ordinance 2025-1?" and then "Then why does it cut the program most of them use?"; the player's reply choices also say "It doesn't cut it. It moves it to the states, with the money attached." Traced by the reporter's-call builder: the follow "Then why does it cut the program most of them use?" (press-comment, follow ask) requires no fact, so it plays after any answer about any bill. Its fix is in that builder's PR (pool item scene-replies-placed-by-what-was-said): the scene sets `bill-cuts` from the bill's own sections and the follow requires it; this item waits on that PR.

**Fix.** Give the reporter question a row for a bill that moves a charge, reading the bill's own record (the service, the direction, the new level), and delete the fallback pairing for fee bills. Replace, never layer.

**Time box.** 2 hours for one opus session.

**Rules.** Words go through the English engine's banks; a builder does not judge its own lines (reply pairs go to the Words lead's readers).

**Done when.** A second session plays a fee bill at a place and seed it did not choose and sees a reporter question and replies that name the fee, in the running game.

**Waits on.** Nothing.

**Files.** data/english (reporter bank), src/director

**Notes.** Found while building PR #9308 (fee levels by bill).
