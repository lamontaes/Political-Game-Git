---
id: story-lines-campaign-offers-and-invites
title: "The campaign's offers and invitations are written again: a volunteer, a manager, an interview and a debate"
area: words
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-lines-campaign
pr:
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: CTO, Nov 18 13:47Z on the Story thread (issue 9750), pre-office order step 4, the campaign; patterns B02, B05, B19 and B24 (docs/story/scene-patterns.json)
checked:
---

**What.** Four campaign scenes the cut of Nov 17 left silent: someone offers to help on the campaign, someone close offers to run it, an outlet invites the player to an interview, and an outlet or group invites the player to debate. Seen: a candidate's months between filing and election day.

**Cause.** Design: the lines were written before Nov 15 and deleted by the cut (`docs/current.json`, replaced list, Nov 17); `src/director/scene-talk.test.ts` skipped `volunteer-offer`, `manager-offer`, `interview-invite` and `debate-invite` by name in `CUT_PURPOSES`.

**Fix.** Write the four scenes again as rows in `data/english/parts/scene-talk.json` from their patterns, each yes worded as what the engine records (the helper on the volunteers or the staff, the interview sitting, the debate accepted). All four leave `CUT_PURPOSES`.

**Time box.** 3 hours.

**Rules.** The player says only what they chose (scene-standard rule 12): a yes to an interview or a debate writes its record, and no reply promises an act the engine does not record. No figure aloud, and a slot carries the fact the line is about, never padding.

**Done when.** A second session, as a candidate in a drawn place, is offered help, is offered a manager, and is invited to an interview and a debate, each yes writing its record; the English guards hold no new red; every new reply pair and narration has a verdict.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/scene-talk.test.ts

**Notes.** Nov 18 (Story): written by a Sonnet helper from a played race at Thunderbird Colony, SD; the lead replaced 21 lines that padded the town; 40 pairs judged by a fresh reader, every plant caught; 12 narrations read by the lead. The interview invitation was not reached in a county board race.
