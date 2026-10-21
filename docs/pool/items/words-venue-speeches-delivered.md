---
id: words-venue-speeches-delivered
title: "A floor speech, a victory and a concession delivered in play read their venue words"
area: words
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/political-game-pool-7xkkii
pr: #5196
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:52:34.624Z
---

**What.** The venue speeches (src/english/venue-speech.ts) compose a floor speech, a campaign stop, a victory and a concession in their register from the speaker's records, and a public hearing scene already carries the speaker's own words. No scene yet shows a member's floor speech on a bill, a winner's victory words or a loser's concession, though the legislature records each floor vote and the elections engine records each result. Give the director a floor-speech scene when a member votes on a bill they spoke on, and a victory and a concession scene when a contest is decided, each carrying the venue words and citing the records they were filled from.

**Rules.** The chain is the acceptance: the record of the vote or the result, the speaker named by record id, the words the engine composed, and the director's scene, all one trace. An effect is a read, not a record: the scene reads the vote or result at the moment it is staged. No hand-written player text: the words come from the English engine's banks. Ask why: each line cites the record it rests on. One rule, all 56 places: the place drawn is named in the PR body.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place from all 56, named with its seed, a member's floor vote on a bill produces a scene whose speaker line is the house or state floor register and cites the vote record, and a decided contest produces a victory scene for the winner and a concession scene for a loser, each citing the result record. A test beside src/director/hearing-scenes.test.ts states it by record id, and the owner plays it: win a seat and hear the victory speech.

**Files.** src/director/scene.ts, src/english/venue-speech.ts, src/director/hearing-scenes.test.ts, src/director/data/director.json

**Notes.** TODO
