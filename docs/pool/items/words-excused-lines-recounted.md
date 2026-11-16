---
id: words-excused-lines-recounted
title: "The insert guard counts the lines the Nov 14 excuse left out, and the rewrite goes most-heard scene first"
area: words
kind: wiring
priority: 1
size: S
status: open
standard: 2
claimed-by: Story lead (claude/dazzling-wozniak-vgomoz-recount)
pr:
after:
blocked-on:
lead: words
model: fable
effort: high
root: none
source: owner, Nov 16, on the Story thread #9750 ("No. Count them again and rewrite them with inserts")
---

**What.** The insert guard left out every fixed line "the world places", so 5,339 bank lines with no record insert sat outside the count and nobody rewrote them. The owner's answer withdraws that excuse: the lines are counted again by bank and rewritten with an insert from the record, or deleted, scene by scene in the order a player meets them. The rewrite itself goes in later items, one scene purpose each, with the lines proved played.
Seen: the guard counted 269 lines while press-comment alone holds 527 fixed lines a player meets at every reporter's question.

**Cause.** Found in code: tests/guards/english/line-inserts.test.ts, `excusedAs` returned "placed" through `isPlaced` for any part whose every use carried a fact, a caused purpose or a record-raised subject, so `linesWithNoInsert` skipped 5,339 parts (scene-talk 5,136, conversation 171, opening-speech 13), counted by that function at main c3646d66.

**Fix.** Delete the "placed" branch of `excusedAs` and the `isPlaced` machinery in tests/guards/english/line-inserts.test.ts, recount tests/guards/english/line-inserts-baseline.json by bank (5,580 in all), and say in the words-engine skill that only the owner's Nov 11 three kinds are excused. The player sees nothing from this item alone; each rewrite item that follows lowers a bank's count and changes what a scene says.

**Time box.** 2 hours for the Story lead on Fable at high effort; the rewrite items that follow are 3 hours each for a Sonnet writer with every line read by the lead.

**Rules.** Replace, never layer: the excuse's code is deleted, not kept behind a flag or a second baseline. Look before you ask: the owner's answer is quoted, not asked again.

**Done when.** A second session, on main, runs `npx vitest run tests/guards/english/line-inserts.test.ts` and sees it green with the baseline naming 5,580 lines and no `excusedOnNov14` key, then adds a four-word line with no slot to any bank in a drawn place's check and sees the guard name that bank; the rewrite items, filed one per scene purpose most-heard first, each name the scene, the drawn place and seed where their lines played, and lower the count.

**Waits on.** Nothing.

**Files.** tests/guards/english/line-inserts.test.ts, tests/guards/english/line-inserts-baseline.json, .agents/skills/words-engine/SKILL.md, .claude/skills/words-engine/SKILL.md

**Notes.** Filed by the Story lead, Nov 16, from the owner's answer on #9750. The 5,339 by scene purpose, most lines first: press-comment 527, ask-vote 246, bribe-offer 232, donor-ask 223, join-cause 209, ask-signature 208, owed-apology 161, conflict-accuse 153, ask-support 143, last-day-farewell 116, family-filing 108, mentor-advice 100. The order of the rewrite follows what a played life meets most (a Sonnet measured it from scene-year runs), not these bank sizes alone.
