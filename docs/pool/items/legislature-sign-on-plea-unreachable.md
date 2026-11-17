---
id: legislature-sign-on-plea-unreachable
title: "A plea to sign on that says the player stood by a colleague never plays: the player asks only the few closest, who never have a bill of their own the player voted for"
area: gov
kind: bug
priority: 3
size: S
status: dropped
claimed-by:
pr:
after:
blocked-on:
lead: words
source: Account lead's ruling on #9369 (Nov 15 19:48Z); probe by the story builder (bill stages)
standard: 2
model: opus
effort: medium
root: none
---

**What.** The Words lead's plea for a second ask to sign on, "I was there when you needed me. I'm asking you to be there for this.", was deleted from the bank in #9369 because no played world reached it: it needs the player's yes on the asked colleague's own bill (`favorsGiven`, src/director/arc-variant.ts), and the player asks to sign on only the few colleagues closest to them, none of whom drafted a bill the player voted for. Seen: the sign-on ask, asked again after a not-yet.

**Cause.** Measured: a probe outside the tests (Nov 15) played 300 days at Manteca, California (0645484, seed 1d3c1565...), Wiggins, Colorado (0884770, ae49513e...), Wilmont, Minnesota (2770582, 2cb5aaf1...) and Parrottsville, Tennessee (4757040, 8766e9ee...), the player voting yes through their own seat (`chooseOwnVote`, src/bench/bill-stage.ts) on every colleague's own bill at its floor and drafting on every question. Colleagues drafted bills of their own at every place (Wiggins seats 033 and 035, Manteca 013, 020, 026 and 030, Wilmont 47B and 42B, Parrottsville 072), and the player's vote asks reached them 16 times, but none of the 528 sign-on asks did. Found in code: `signOnCandidates` (src/core2/modules/legislature.ts) asks only members with closeness above zero, closest first, at most `cosponsorsMax` (4); at Wiggins the backed seat 033 is tenth closest.

**Fix.** Either the colleagues a player knows best also draft bills of their own (the members' own drafting, where closeness to the player plays no part), or the Words lead writes the plea for the colleagues the player does ask, from a record they share (`signOnCandidates` reads closeness: a shared vote, a past yes). Then restore a plea to `cosponsor-ask` on that record. The player sees it in the sign-on ask, asked again.

**Time box.** 3 hours.

**Rules.** A plea that claims a past act plays only on the record (Words lead, Nov 15); no hand staging or stand-in vote (Account lead, Nov 15).

**Done when.** A second session plays the sign-on ask in a drawn place, in a played world built by buildBenchWorld with the player's yes cast through their seat, and is offered a plea that names a past act the record holds, named by record id, in the test that pins it.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/director/arc-variant.ts, data/english/parts/scene-talk.json

**Notes.** Nov 15 (story builder, #9369; Account lead's ruling 21:53Z): "I said no last time. I'm less sure of that now. Let me read this one." is also taken out of the sign-on ask, with the `leans-closer` fact that gated it. It claims a change of mind, so it is said only when the colleague holds a record made since the no about the player (a favor, backing, the player's yes on their bill) and the total is higher. Room time alone moves the total by about 0.01 a day, and that is not a reason a person would name. No pinned world gives a sign-on colleague such a record yet (above), so the line had no case. The Words lead keeps its text in /mnt/project-files/words-lead/bill-stages/second-ask-not-moved.md, and it returns with this route. Until then, a second ask with nothing recorded since says "You asked before. I still haven't made up my mind." The colleague's yes or no is still the sum of their own terms; the record gates only the wording.

- Nov 17, story-cut-deleted-scene-kinds: src/director/bill-sign-on.test.ts deleted with its scene kind (owner, Nov 17: "DELETE EVERYTHING THAT IT HASNT WRITTEN"). Dropped: the scene kind this item serves is deleted.
