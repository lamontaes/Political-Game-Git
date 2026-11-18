---
id: story-lines-election-night
title: "Election night is written again: the win, the concession and the family's reckoning"
area: words
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-lines-election-night
pr:
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: CTO, Nov 18 13:47Z on the Story thread (issue 9750), pre-office order step 4, campaign and election night; patterns B34, B39 and B40 (docs/story/scene-patterns.json)
checked:
---

**What.** Election night, which the cut of Nov 17 left silent. On a win, someone close reaches the player once the race is called and the player speaks to the room. On a loss, an aide asks the player to call the winner, and the player agrees, asks how far apart it is, waits on the count or refuses. At home after a loss, the family talks over what the race cost and whether to run again. Seen: the night of the player's first election.

**Cause.** Design: the lines were written before Nov 15 and deleted by the cut (`docs/current.json`, replaced list, Nov 17); `src/director/scene-talk.test.ts` skipped `race-won`, `race-lost` and `family-loss` by name in `CUT_PURPOSES`. The polling place (`polling-place`, pattern A03) has no producer: its situation type lists no cause and no voting record says who is turned away.

**Fix.** Write the three scenes again as rows in `data/english/parts/scene-talk.json` from their patterns, naming the office, the opponent or winner and the recount and poll facts the packets carry, never a figure. All three leave `CUT_PURPOSES`. The polling place waits on a producer.

**Time box.** 3 hours.

**Rules.** No figure aloud: a count or a share is said as how it feels. A close never pressures by what people will think. Every scene is built from a real-lives pattern (owner, Nov 18).

**Done when.** A second session, as a candidate in a drawn place, wins one race and loses another and sees each night's talk name the race and the other candidate; the English guards hold no new red; every new reply pair and narration has a verdict.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/scene-talk.test.ts

**Notes.** Nov 18 (Story): written by a Sonnet helper and sent back once (the town padded into many lines, closes that pressured by reputation). `src/bench/concession-close-call.test.ts` still pins the deleted reply "How close was it?" at Amherst, NH, for the CTO.
