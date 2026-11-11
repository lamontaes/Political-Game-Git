---
id: words-race-told-turnout
title: "Who turned out for the winner is answered from the count's own rows, not 'that's all I know for sure'"
area: words
kind: feature
priority: 3
size: S
status: done
claimed-by: story/race-told-turnout
pr: #8149
blocked-on:
lead: words
source: coordinator, Nov 10 (the only answer to "Who turned out for {candidate}?" was "{candidate} got the most votes. That's all I know for sure.")
claimed-at: 2026-11-10T15:00:00.000Z
merged-at: 2026-11-10T18:36:37.156Z
seen-by: second-session-2
seen-at: 2026-11-11T01:32:35.232Z
---

**What.** The race-told scene reads three facts from the voting engine's result row for the race (`result:<contest>`): `vote-share` (the winner's share of the ballots cast), `turnout` (the share of the people eligible who voted) and `best-place` (the place that gave the winner the biggest share of its ballots, where the race kept place results), each cited to the result row and the place row. Six answer pieces use them; the two "got the most votes, that's all I know" pieces are held back (`excludesFacts: vote-share`) when a share exists, and stay for a race with no totals.

**Rules.** No new engine; nothing in src/core2. The voting engine records totals, turnout, eligible counts and, for a race with a wider electorate, results by place. It records no voter group's lean by candidate (age, job, party), so "who" is a share, a turnout and a place, not a kind of person.

**Done when.** src/director/race-told-scene.test.ts carries the winner's share cited to the result row and its ask answer never says "that's all I know for sure" when a share exists; the English and families guards pass.

**Files.** src/director/race-turnout-facts.ts, src/director/purpose-scene.ts, data/english/parts/scene-talk.json, src/director/race-told-scene.test.ts

**Notes.** Seen in the game (2026-11-11, second-session-2): drawn seed 1611a4081e31 (test world), seed 1611a4081e31, main 32a6683b: race-told-scene.test.ts passed on a fresh seed, with the winner's share cited to the result row
