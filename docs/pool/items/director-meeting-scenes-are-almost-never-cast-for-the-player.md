---
id: director-meeting-scenes-are-almost-never-cast-for-the-player
title: "A scene that waits for the player to meet someone (an apology, a date, advice) almost never comes"
area: director
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
root: rc3-thin-life-record
source: "Words builder W7, Nov 11, 2026, measuring fix 3 of director-a-waiting-scene-is-never-played; Fable B's order of 16:01Z"
---

**What.** Nine kinds of scene wait for the player and one other person to be in one place: apology, becoming-friends, date, proposal, betrayal, visit, advice, reconciliation and cause-invite. Fix 3 of director-a-waiting-scene-is-never-played opens such a scene when the player walks up to that person or arrives where they are (`openWaitingSceneWith`, src/bench/waiting-scene.ts). But in play the director almost never stages one to wait, so the player never sees any of them. Seen: a player who quarrels, starts dating, gets a mentor or makes a friend never gets the scene that follows.

**Cause.** Measured: seven drawn places, with the player's clock advanced and every stop resumed. Those runs talked to no one.
- Wilderness Rim, Washington; Cabot, Arkansas; Wilmington, Delaware; Conner, Montana: 90 days each, seed abcdf71b87b5dcad:0 to :3 of `waiting-together`. No meeting scene was waiting.
- Exeter, Nebraska: 90 days, seed ac6a9c25-f343-4f12-984f-9f8f5355124b. One meeting-type binding in 94 moments: a visit to an ill grandfather. Family news makes it interrupt (scene-now), so it never waits.
- Rotonda, Florida (ef96e7c3-38a4-487c-ab1c-703be72d9873), Paradise Valley, Nevada (dbe0454d-4d1e-4449-97c7-1cc6d4c82662) and Beaumont, Texas (4ddc0b45-8425-4cb4-a2b8-2366dc01f378): 180 days each. No meeting-type binding at all. Rotonda's one family.partnered moment was a relative's, so `date` rightly did not cast.

Found in code: in `scheduleMoment` (src/director/scheduling.ts lines 1093 to 1116), a scene waits only when it does not interrupt and ranks within the life's pace. Nothing produced the causes in these runs:
- apology, date, proposal, cause-invite and the mentorship case of advice need the player's own family.quarrel, family.partnered, family.engaged, cause.shared or work.mentorship-formed.
- becoming-friends and reconciliation need a tie with the player that grew (`tie:contact:contact`, `threadTurn: grew`).
- betrayal needs a kept fact that comes due.
- advice's other cause is `awaitingProducer: next-step`, so it has no producer.

The tie causes are partly an artifact of the measurement: these runs talked to no one, so no tie could grow. Measuring with talks comes first.

**Fix.**
1. Measure again with play walks (skill `play-walks`) that talk to the household and coworkers each day, 60 days in three drawn places. For each of the nine types, count moments, bindings and outcomes.
2. For each type that still never waits, name which part fails: the cause is never produced, the type interrupts, or it ranks outside the pace.
3. Wire the missing producers through the engines that keep the record (skill `scene-producers`), starting with advice's `next-step`. Register a stopgap for any type kept rare on purpose.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, write the counts into Notes, and stop.

**Rules.** No dice: a scene comes from a record, never a chance. One rule, all 56 places. A scene writes something back (scene-standard).

**Done when.** A second session, not the builder, plays three new lives in drawn places it names with their seeds, talking each day as a player does, for 60 days. In at least one, a scene that waits for a meeting (say which) opens when the player walks up to that person, with its lines quoted. The per-type counts for all three are in Notes.

**Waits on.** The opener pull request from claude/director-waiting-next-together (fix 3 of director-a-waiting-scene-is-never-played), so a scene that waits can open.

**Files.** src/director/scheduling.ts, src/director/data/situation-types.json, src/director/meeting-facts.ts, src/bench/waiting-scene.ts (new), scripts/play-walks/
