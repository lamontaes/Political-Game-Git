---
id: director-rival-word-placed-by-its-record
title: "News of a rival's message says how it reached the teller and what it argued, once a message, and stops after the vote"
area: director
kind: bug
priority: 2
size: M
status: merged
claimed-by: account lead thread "Give rivals more than one issue"
pr: 9416
blocked-on:
after:
source: Words lead's read of the Salado TX play (words-lead/regression/page-read-salado.md, class F, P34 and P35), Nov 15
lead: words
standard: 2
model: opus
effort: medium
root: none
---

**What.** Word of a rival played six times in ten weeks with the same lines: an opener that did not say how it came, replies the same whoever the teller was, and "Did it change your mind?" answered with "Mostly their side of it."
Seen: the Salado TX play, seed review1:2, class F of the Words lead's read.

**Cause.** Found in code: in src/core2/modules/campaigns.ts, `rivalWordPassedOn` wrote the rival-word event kept the teller, the rival and the topic but not how the message reached the teller (the message row's kind), the side it argued or how far it moved the teller, so the bank had nothing to place a line by; and a scene about a race stayed worth staging after its election day.

**Fix.** The event now keeps `how` and `side`; the packet reads them with the teller's own stance cause for the message (none, a little, a lot, by `rivalWordMovedALot`) and the player's own stand; the bank's openers, replies and answers are written to those facts (the Words lead's rival-word/lines.md) and the lines nothing backed are deleted; a situation type's `liveWhile: "contest-open"` drops the scene once its cause's contest has had its election day.

**Time box.** 4 hours for an Opus session.

**Rules.** Replace, never layer: the old openers and answers are deleted, not left beside the new. Wire to the world: every fact is read from the message, the views engine's cause row or the contest, by record id. No hand-written player text in code: every line is a bank piece.

**Done when.** A second session sees, at a place drawn from all 56 (name the place and seed), a rival's news scene whose opener matches how the word came, whose "Did it change how you see" answer matches the teller's own stance cause, and no such scene staged after the contest's election day.

**Waits on.** Nothing: it builds on the campaigns engine's rival-word record as it stands.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/elections.ts, src/director/purpose-scene.ts, src/director/scheduling.ts, src/director/data/situation-types.json, data/english/parts/scene-talk.json, src/core2/data/campaigns/parameters.json

**Notes.** Filed Nov 15 by hand with its PR. Left out for lack of a record: "last night" for a night of doors, "more than one showing" for an ad, "nothing about you" (the message holds no attack flag) and the close-tie answer. The answer "{opponent} is against {about}." and the ask for a rival who argued against a question were cut: no drawn place played a rival arguing against (ten places scanned, every row "for"), so no line ships unplayed; add them when a place plays one.

- Nov 17, story-cut-deleted-scene-kinds: src/director/rival-word-record.test.ts deleted with its scene kind (owner, Nov 17: "DELETE EVERYTHING THAT IT HASNT WRITTEN").
