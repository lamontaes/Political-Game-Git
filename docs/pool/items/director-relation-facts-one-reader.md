---
id: director-relation-facts-one-reader
title: "Talk, scenes and the Journal read one record of how two people stand, with one closeness cutoff"
area: director
kind: wiring
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/words-relation-facts
pr: #9411
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: Cause: the talk box (saysName, phoneTieFacts, closeTieLevel 0.5), the scene packet (kin, acquainted, stranger, tie-friend, tie-rival in purpose-scene.ts, friendCloseness 0.5) and the Journal each worked out kin, acquaintance and closeness separately, with two cutoff rows and two definitions of "knows you".
source: owner Nov 15 (plan part 1c, Words lead)
claimed-at: 2026-11-15
checked: words lead 2026-11-15
---

**What.** One reader, `relationFacts(core, askerId, askedId)` in src/director/relation-facts.ts, says kin, partners, acquainted, met before today, close, and friend or rival with the tie record. The talk box, the scene packet and the Journal read it; the scene's copy, the talk box's acquaintance read and the second closeness row are deleted.

**Cause.** Two copies of one question, each added by the scene or talk it served (scene-talk-rules tieSides.friendCloseness and conversation-rules closeTieLevel, both 0.5).

**Fix.** The reader above; one TUNABLE row, spread 0.3 to 0.7; `tieSide` moves with it.

**Time box.** 3 hours for one Sonnet session; push what passes and stop.

**Rules.** Replace, never layer. Wire to the world: the pinned test reads Sheridan WY's people.

**Done when.** A second session, on main in Sheridan WY with seed 7 (and one more drawn place, named), plays a life in dev mode and sees a person who greets the player as close on a call also stand as a friend in a scene and in the Journal, from the same tie record id. src/director/relation-facts.test.ts passes at Sheridan WY seed 7, and the phone, Journal, campaign-answer and kin-address tests still pass.

**Waits on.** Nothing.

**Files.** src/director/relation-facts.ts, src/director/conversation.ts, src/director/purpose-scene.ts, src/director/journal.ts, src/director/campaign-answer.ts, src/director/data/scene-talk-rules.json, src/director/data/conversation-rules.json

**Notes.** Open follow-ups (class H): the reader gives met-before only by dates; asked, helped and refused before are read from scene.reply endings in a later PR. celebration-gathering-scene "every line of the two purposes" is red on the clean train (72 lines, limit 45), not from this change.
