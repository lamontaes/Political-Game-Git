---
id: words-venue-speeches-delivered
title: "A floor speech, a victory and a concession delivered in play read their venue words"
area: words
kind: wiring
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: words
model: opus
effort: medium
root: design-story-director
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** The venue speeches compose a floor speech, a campaign stop, a victory and a concession in their register from the speaker's records (now in src/english/english-opening-speech.ts and data/english/parts/speech-stages.json; the item's old file src/english/venue-speech.ts is gone), and a public hearing scene already carries the speaker's own words. No scene yet shows a member's floor speech on a bill, a winner's victory words or a loser's concession, though the legislature records each floor vote and the elections engine records each result. Give the director a floor-speech scene when a member votes on a bill they spoke on, and a victory and a concession scene when a contest is decided, each carrying the venue words and citing the records they were filled from. Nov 4 finding: the concession race-lost scene exists on the director side, and only the bench never stages the player's election-result moment after the returns.

**Cause.** Design: docs/design/words-machine.md, and the item's own design that the floor, victory and concession scenes read the vote and result records; the Nov 4 note in Notes shows the director side of the concession already works.

**Fix.** Add a victory scene and a floor-speech scene that read the result and vote records, worded from the speech banks, in src/director/scene.ts and director.json; stage the player's election-result moment after the returns (the bench staging is the play-first lane's, see Waits on).

**Time box.** 8 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: the record of the vote or the result, the speaker named by record id, the words the engine composed, and the director's scene, all one trace. An effect is a read, not a record: the scene reads the vote or result at the moment it is staged. No hand-written player text: the words come from the English engine's banks. Ask why: each line cites the record it rests on. One rule, all 56 places: the place drawn is named in the PR body.

**Done when.** A second session (not the builder) plays a one-year run of the played world (`buildBenchWorld`) in a drawn place from all 56, named with its seed, and sees a member's floor vote on a bill produce a scene whose speaker line is the house or state floor register and cites the vote record, and a decided contest produce a victory scene for the winner and a concession scene for a loser, each citing the result record. A test beside src/director/hearing-scenes.test.ts states it by record id, and the owner plays it: win a seat and hear the victory speech.

**Waits on.** Nothing. The bench staging of the election-result moment belongs to the play-first lane (Lane 4, src/bench/story.ts); no director file needs a change for it.

**Files.** src/director/scene.ts, src/english/english-opening-speech.ts, data/english/parts/speech-stages.json, src/director/data/director.json

**Notes.** TODO Released from idle draft #5196 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-7xkkii` (2026-10-20). Cleared from the front matter and kept here.

Lane 3 (Nov 4): the director side of the concession works; the bench never stages it. In a played world (Villa Esperanza, Puerto Rico, 7286584, seed diag:4, concession-reported setup), the loser's `election-result` moment is `scene-now` with bindings race-lost (composed) and family-loss (composed), and `purposeScene({ next: true })` picks race-lost, the concession call. Answering it writes `conceded`, and the press prints the concession (`concession-reported.test.ts`). In the Storrs replay (confirmer-lane3-path6, storrs-run.log.txt), the clock went from election morning to the returns at 7:00 AM on November 5 and then to the morning-after talk on November 6. The election-night scene-now stop for the result moment was never staged. Needs from Lane 4: after the returns' Close, stage the player's `election-result` moment (bench story.ts `storyScene` with its momentId) that night, before the morning after. No Lane 3 file needs a change for it.
