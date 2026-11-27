---
id: words-family-loss-size-word-follows-the-last-seat
title: "After a lost race, the size said in the narration tells how the race was decided"
area: director
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: Words read of pull request 9512 at its merged head, Nov 17
lead: words
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** The narration after a lost race says the player lost by 11 votes when the player took 2 of 51 votes in a four-way race for three seats.
The figure is the votes the player came short of the last winning seat, so it reads like a near miss for a very wide loss.
Seen: Murtaugh, Idaho, seed read-9512-a, council member, votes 23, 13, 13 and 2, the narration "You lost the race for council member by 11 votes."

**Cause.** Found in code: `lossStakeOf` in src/director/family-stake.ts words the margin from `raceMargin` in src/director/race-margin.ts, which gives the gap to the last winning seat and nothing about how many stood or where the player placed.

**Fix.** Say the size by how the race was decided where it was a race for several seats (the player's place among the candidates, or the share of the vote the player took), read from the same `raceMargin` record the Journal reads; keep the one figure, once, in the narration, and write nothing with a cutoff picked to feel right.

**Time box.** 3 hours for a Sonnet session.

**Rules.** Sliding scales and causes: the size word comes from the count itself and flips at no cutoff, so a wide loss and a near miss read differently.

**Done when.** A second session sees, in a drawn place with a multi-seat race lost wide (name the place and seed) and one lost narrowly, that the narration tells which it was, said once, in a played world test run through the family-loss pinned test.

**Waits on.** Nothing.

**Files.** src/director/family-stake.ts, src/director/race-margin.ts, data/english/parts/scene-talk.json, src/director/family-loss-stake-scene.test.ts (new)

**Notes.** Filed Nov 17 from the Words read of pull request 9512; not fixed in that pull request.
