---
id: story-lines-donor-ask
title: "A donor's call about a bill is written again from pattern B04, naming the bill and the donor's work"
area: words
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-lines-after-office-2
pr:
after: story-lines-press-interview-and-constituent-stop
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: CTO, Nov 18 13:47Z on the Story thread (issue 9750), the order for after office; pattern B04 (docs/story/scene-patterns.json)
checked:
---

**What.** In office, a donor who gave to the player's campaign calls about a bill. The cut of Nov 17 left only the donor's side-taking cores of this scene, which need a gift on record and a side; with no side, the request had no sentence to compose and the scene did not play. Seen: the donor's call before a vote, for a council member with a campaign gift on record.

**Cause.** Design: the lines were written before Nov 15 and deleted by the cut (`docs/current.json`, replaced list, Nov 17); `src/director/scene-talk.test.ts` skips `donor-ask` by name in `CUT_PURPOSES` until its lines return.

**Fix.** Write the scene again from pattern B04 as rows in `data/english/parts/scene-talk.json`: request cores that need only the bill or the cause, so a donor with no side on record still asks, and the replies, follows and closes, each naming the bill, the cause or the donor's work from the scene's record. `donor-ask` leaves `CUT_PURPOSES`.

**Time box.** 3 hours.

**Rules.** No hand-written player text in code; words come from the banks (`scene-standard`). Talk says how it feels, never the figure (owner, Nov 11). Every scene is built from a real-lives pattern (owner, Nov 18).

**Done when.** A second session, in a drawn place with the player seated and a campaign gift on record, plays the donor's call and each line names the bill or the cause; the English guards hold no new red; every new reply pair and narration line has a fresh reader's verdict.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/scene-talk.test.ts

**Notes.** Nov 18 (Story): written by a Sonnet helper and read by the Story lead (two replies that gave a town official a staff deleted); 553 pairs and 6 narrations judged by fresh readers, every plant caught. `desk-visit` (C38) is next for the same writer.
