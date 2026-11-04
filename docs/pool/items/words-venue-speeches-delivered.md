---
id: words-venue-speeches-delivered
title: "A floor speech, a victory and a concession delivered in play read their venue words"
area: words
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The venue speeches (src/english/venue-speech.ts) compose a floor speech, a campaign stop, a victory and a concession in their register from the speaker's records, and a public hearing scene already carries the speaker's own words. No scene yet shows a member's floor speech on a bill, a winner's victory words or a loser's concession, though the legislature records each floor vote and the elections engine records each result. Give the director a floor-speech scene when a member votes on a bill they spoke on, and a victory and a concession scene when a contest is decided, each carrying the venue words and citing the records they were filled from.

**Rules.** The chain is the acceptance: the record of the vote or the result, the speaker named by record id, the words the engine composed, and the director's scene, all one trace. An effect is a read, not a record: the scene reads the vote or result at the moment it is staged. No hand-written player text: the words come from the English engine's banks. Ask why: each line cites the record it rests on. One rule, all 56 places: the place drawn is named in the PR body.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place from all 56, named with its seed, a member's floor vote on a bill produces a scene whose speaker line is the house or state floor register and cites the vote record, and a decided contest produces a victory scene for the winner and a concession scene for a loser, each citing the result record. A test beside src/director/hearing-scenes.test.ts states it by record id, and the owner plays it: win a seat and hear the victory speech.

**Files.** src/director/scene.ts, src/english/venue-speech.ts, src/director/hearing-scenes.test.ts, src/director/data/director.json

**Notes.** TODO Released from idle draft #5196 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-7xkkii` (2026-10-20). Cleared from the front matter and kept here.

Lane 3 (Nov 4): the director side of the concession works; the bench never stages it. In a played world (Villa Esperanza, Puerto Rico, 7286584, seed diag:4, concession-reported setup), the loser's `election-result` moment is `scene-now` with bindings race-lost (composed) and family-loss (composed), and `purposeScene({ next: true })` picks race-lost, the concession call. Answering it writes `conceded`, and the press prints the concession (`concession-reported.test.ts`). In the Storrs replay (confirmer-lane3-path6, storrs-run.log.txt), the clock went from election morning to the returns at 7:00 AM on November 5 and then to the morning-after talk on November 6. The election-night scene-now stop for the result moment was never staged. Needs from Lane 4: after the returns' Close, stage the player's `election-result` moment (bench story.ts `storyScene` with its momentId) that night, before the morning after. No Lane 3 file needs a change for it.
