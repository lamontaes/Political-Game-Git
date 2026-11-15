---
id: words-appointment-call-offers-a-post-already-filled
title: "The call asking the player to take a post comes after the post is already theirs"
area: words
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: design-life-record
source: Found by the short-replies builder tracing the appointment offer's put-offs for the Words lead, Nov 15, 2026; the Words lead asked for it filed
---

**What.** The appointment scene plays as an offer: the appointer asks, and the player may agree, ask, or decline ("You kept your seat"). The appointment it is staged from is already in force when the call plays. The player's no keeps nothing, and a yes takes nothing that was not already taken. Seen: the appointment call in play, where the player's answer changes nothing in the post or the Journal.

**Cause.** Found in code: the `appointment` situation type (`src/director/data/situation-types.json`, purpose `appointment-offer`) is caused by `official-appointed` (`src/core2/modules/executive.ts`, emitted after `appointments` holds the row and, for a state post, after `startPublicJob` started the job) and by `economy.board-appointment` (`src/core2/central-bank-appointments.ts`, after the seat is filled). No engine reads the scene's reply to an appointment, so the arc's endings (`accepted`, `declined`) write nothing anyone reads.

**Fix.** Either the offer comes before the appointment and the appointing engine reads the answer (a no passes the post to the next in line, by the same rule that picked the player), or the scene is told as news of an appointment made (congratulations, the appointer's reasons from `reasons`) with no offer replies. Which one follows the executive engine's own order; the Words lead rules on the lines.

**Time box.** 3 hours, Opus.

**Rules.** An effect is a read, not a record: the player's answer to the appointer is read by the engine that owns the post. Lines by the Words lead, judged by M5.

**Done when.** In the played world (buildBenchWorld) at one pinned place and one place drawn from all 56 (named with its seed), the player is picked for an appointed post. The call either asks before the post is filled and a no leaves it to someone else, by record id, or tells of the appointment without offer replies. A second session sees it in the running game.

**Waits on.** Nothing.

**Files.** src/core2/modules/executive.ts, src/core2/central-bank-appointments.ts, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json

**Notes.** Filed by hand on the put-offs branch, Nov 15. The put-offs item took out the appointment's stall and walk-off replies (Words lead, Nov 15).
