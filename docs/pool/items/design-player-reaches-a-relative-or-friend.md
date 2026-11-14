---
id: design-player-reaches-a-relative-or-friend
title: "The player can reach a relative or friend outside a shared talk (a call, a letter, a visit, a dinner, a stay), so a promise to do it can be kept"
area: director
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after: talk-offer-of-help-cannot-spend-the-players-day
blocked-on:
source: promises brief T, Words lead rulings 1 (Nov 14)
lead: director
standard: 2
model: opus
effort: medium
root: design-story-director
---

**What.** A build waiting on a missing player act, not a drop. Scenes ask the player to visit, write back, come to a gathering, put someone up or be there for a friend's plan. The player has no act that reaches a relative or friend unless both happen to be in one talk, so a promise to do any of these cannot be kept or broken by the simulation. Under ruling 1 the promise reply was cut from homecoming, friend-ask, letter-ask and gathering-ask (listed in /mnt/project-files/words-lead/promises/cuts.md); the yes now settles in the scene. Seen: in those scenes, and later when the person brings up whether the player came.

**Cause.** Design: no action in src/bench or src/core2 starts a call, letter, visit, dinner or stay with a chosen person; a talk happens only when the conversation engine puts two people together. The promise kind `reach-someone` is named in src/director/data/promise-kinds.json with `settle: []`, so no ending offers it. The rows it replaces are read in docs/stopgaps/triage-2026-11-10/director.md (SG-WORDS-reunion-letter-promise-unread, SG-WORDS-celebration-gathering-promise-unread, SG-WORDS-homecoming-stay-unread).

**Fix.** The act itself is built by talk-offer-of-help-cannot-spend-the-players-day. What stays here: in promises.ts, a settle operation on an event kind with the promised person in personIds, rows on `contact.visit` and `contact.call` for `reach-someone`, and the promise reply restored. (Originally: design the one player act (choose a person, choose how: call, letter, visit, dinner at their home, a stay) as an action that writes one record the relationship engine already reads (contact with a cause).) Then give `reach-someone` its settle operation (the pair's contact with that cause) and restore the promise reply and its ending row in purpose-arcs.json and promise-kinds.json for the four purposes. The Words lead writes the restored lines.

**Time box.** Design 2 hours (Opus); build 1 day (Sonnet).

**Rules.** This is a game, not a spreadsheet: one act, not a step per kind of contact. No dice. Nothing is done for the player without their press.

**Done when.** A second session sees in the running game, in a drawn place (place and seed named) the player makes the promise at one of the four scenes, then reaches the person by the new act, and the promise ends kept by that act's record id; at a second place they do not, and it ends broken when its window closes; each outcome is said once at the next talk.

**Waits on.** talk-offer-of-help-cannot-spend-the-players-day (the Visit and Call thread, branch claude/project-thread-soscar), which builds the act: core events `contact.visit` and `contact.call`, personIds [player, other].

**Files.** src/director/data/promise-kinds.json, src/director/data/purpose-arcs.json, src/director/promises.ts, data/english/parts/scene-talk.json
