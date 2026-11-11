---
id: scene-reporter-call-after-a-vote-never-plays
title: "A reporter's call after the player's own vote is staged but never plays"
area: words
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: words-run-press-comment-lines-are-composed
blocked-on:
lead: words
model: opus
effort: medium
root: rc-scene-waiting-has-no-player
source: Words builder W7, Nov 11, 2026, screenshots for words-run-press-comment-lines-are-composed (Pocatello, Idaho, seed w7-press-b; Valley Green, Pennsylvania, seed w7-press-a)
checked:
claimed-at:
branch:
---

**What.** A seated council member votes on their own ordinance, and the director stages a reporter's call (`press-interview`) on the vote's moment, but the player never sees it. Seen: Pocatello, Idaho, seed `w7-press-b`, playing Amber Holmes from Advanced. Her Ordinance 2025-1 was voted 4 to 1 on February 4, 2025. The ledger entry `person_7a090974d8fd3110:2025-02-04:bill-vote:bill:office:gus2025:102377:council:2025-01-20:person_7a090974d8fd3110:17:office:gus2025:102377:council` holds bindings `floor-vote` and `press-interview`, and `/api/story` for it composes the whole exchange ("You voted for Ordinance 2025-1. What should people know about why?"). No stop opens it. Two months of play showed a lobbyist, a floor debate and a spouse, never the reporter. The introduction of her bill (`office.introduced`) also staged a reporter's call, and it never played either.

**Cause.** Found in code. `scheduleMoment` in src/director/scheduling.ts gives a moment the outcome `scene-waiting` when it ranks within the life's pace and is not an interrupt, and `journal-line` when it ranks below. Only an interrupt becomes a stop: `registerInterrupts` in src/director/ledger.ts registers a module stop for `entry.interrupt` alone. No reader plays a `scene-waiting` entry (searched src/bench and src/director: `scene-waiting` is read only by `forget` in ledger.ts, which keeps such moments). A vote's moment is not an interrupt: its impact is under `directorInterruptImpact` (0.5). `press-interview` has no `stopsDay`, which only `swearing-in` carries, and `cause:event:legislative-vote` is not in `scheduling.ownRecordScenes`. On a sitting day each bill's vote is its own moment; in Pocatello the day's other vote moments ranked 25th (pace 4) and went to the journal.

**Fix.** Give `press-interview` `"stopsDay": true` in src/director/data/situation-types.json. A moment that names the player (`selfNamed`) then interrupts for it. Spacing is already held by the same-day cast rule (`sittingToday` in scheduling.ts: one reporter's call per sitting day) and `seasonCap` (6 a quarter). If the owner's pacing rulings say the reporter should come only for the player's own bill, add a `causeFacts` check on the legislative-vote cause that the bill's `sponsorId` is the subject instead. Read docs/coordination/OWNER-DECISIONS.md for "pace" and "interrupt" before choosing; do not ask.

**Time box.** 2 hours.

**Done when.** A second session, at 1440x900 on main, plays an Advanced life as a seated local member in a drawn place it names with its seed. It drafts a bill from Your office and plays days through its floor vote. Within the next day the reporter's call opens on its own, naming the bill and the count. src/director/director.test.ts and src/director/scheduling tests pass.

**Files.** src/director/data/situation-types.json, src/director/scheduling.ts

**Notes.** Found while taking pictures for words-run-press-comment-lines-are-composed; that pull request's pictures open the staged scene by its moment through `/api/story` (a proof scene, words-engine skill) because nothing in play opens it.
