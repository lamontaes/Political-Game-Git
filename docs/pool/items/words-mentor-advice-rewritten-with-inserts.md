---
id: words-mentor-advice-rewritten-with-inserts
title: "The mentor's advice says what the record holds: a coworker talks about the job, a party officeholder talks about the seat and the player's chance"
area: words
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by:
pr: 9983
after:
blocked-on:
root: rc4-hand-written-words
lead: story
model: opus
effort: medium
source: owner, Nov 16, "No. Count them again and rewrite them with inserts", "either that or remove them and start fresh"; owner's grade, Nov 17, money said out of the household's books
---

**What.** The advice scene played one set of 108 fixed lines about running for office for both of its causes, so a new hire's first week at work drew "Wait a cycle. Run for {office}" from a coworker who never ran. The office lines stated what no record holds: years as a figure, the mentor's own lost race, a diner and pie, money as an amount. The two causes now speak in two scene keys from what their records hold.
Seen: a coworker who took a new hire under their wing talks about the employer, the job, the pay and the hours, and a party's officeholder talks about the seat, its holder, the player's own chance and their answer to the chair.

**Cause.** Found in code: the `advice` type in src/director/data/situation-types.json names two causes, `feeling:event:work.mentorship-formed` and `circumstance:mentor-weighs-in`, with no `sceneKey`, so `typeForCause` in src/director/purpose-scene.ts tags both with the type's `routine` key and every `mentor-advice` piece in data/english/parts/scene-talk.json serves both. `composeBinding` set no fact from the `party-asked` record beyond `office` and none from the `work.mentorship-formed` record, so 106 of the 108 pieces carried no `requiresFacts`, and the two that did need `asked_partner` and `asked_short_on_money`, which no code sets.

**Fix.** Add `sceneKey` `work-mentor` and `party-mentor` to the two causes, delete every `mentor-advice` piece, and write the two families from src/director/mentor-advice-facts.ts (`mentorAdviceFacts`, called from `composeBinding`): the seat's serving term by the weighing's own read (`contestIncumbent`), the player's own chance (`ownChanceIn`) against two TUNABLE rows, the player's answer to the chair (`partyAskAnswer`), the player's and the mentor's races, the mentor's seat and service; the employer, the job, the mentor's time there, pay below the middle for the title and a shift past midnight.

**Time box.** 6 hours, Opus at medium effort.

**Rules.** No hand-written player text: every line is a bank piece placed by a fact the packet sets from a record, and none is typed in code. Wire to the world: each fact reads the elections, offices, voting, candidacy or jobs engine's own rows, so a line plays only where its record holds.

**Done when.** In a drawn place, Town, State (seed nobody chose), a second session runs a world until a party's chair asks someone to run and until a new hire is taken under a coworker's wing, presses every reply in both advice scenes, and finds no office line in the work scene, a seat-held or seat-open line that matches the offices engine's serving term by id, and no figure spoken.

**Waits on.** None.

**Files.** data/english/parts/scene-talk.json, src/director/data/situation-types.json, src/director/mentor-advice-facts.ts, src/director/purpose-scene.ts, src/director/data/director.json, src/core2/modules/candidacy.ts, src/core2/modules/partnerships.ts, src/core2/modules/jobs.ts, src/director/mentor-advice-reads.test.ts, scripts/words/mentor-walk.ts

**Notes.**

- 2026-11-17 (Story lead's builder, Opus): built on claude/story-mentor-advice. Finding for the Story lead: no code sets any `asked_*` fact; only the readers in src/english/scene-talk-words.ts and reply-pairs.ts name them.
