---
id: story-lines-carry-and-floor
title: "A member's ask to carry their bill and the floor debate are written again from bank 7"
area: words
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-lines-bank7-floor
pr:
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: CTO, Nov 18 17:02Z on the Story thread (issue 9750), bank 7 on main for the after-office worker; patterns B7-02 and B7-06 (docs/story/scene-patterns.json)
checked:
---

**What.** Two office scenes the cut of Nov 17 left silent. A member asks the player to carry their bill, and the player agrees, bargains, stalls or declines. On the floor a member speaks for or against a bill, and the player agrees, disagrees, asks the member to yield or sits down. Seen: a legislator's or council member's session days.

**Cause.** Design: the lines were written before Nov 15 and deleted by the cut (`docs/current.json`, replaced list, Nov 17); `src/director/scene-talk.test.ts` skipped `bill-carry` and `floor-debate` by name in `CUT_PURPOSES`. The carry ask's packet held only the bill's name, so its lines could not say what the bill does.

**Fix.** Write both scenes again as rows in `data/english/parts/scene-talk.json` from their patterns. Give the carry ask the bill's purpose and issue in `composeBinding`, the way `floorDebateFacts` already does, each cited to the record. Delete the carry rows whose facts nothing sets. Both leave `CUT_PURPOSES`.

**Time box.** 3 hours.

**Rules.** Every line of four words or more carries an insert, and a slot carries the fact the line is about, never padding (owner, Nov 14). A reply never promises an act the engine does not record, and narration says only what is seen. Every scene is built from a real-lives pattern (owner, Nov 18).

**Done when.** A second session, as a council member in a drawn place, is asked to carry a bill and hears what it does, and hears a member speak on a bill on the floor and answers; the English guards hold no new red; every new reply pair and narration has a verdict.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/purpose-scene.ts, src/director/scene-talk.test.ts, tests/support/scene-talk-fixture.ts

**Notes.** Nov 18 (Story): written by a Sonnet helper and sent back once (stock shorts, the full name in every floor reply, a threat as a thank-you close); the lead deleted three lines that gave a want or a need. The carry ask's lie replies were deleted because nothing could catch them.
