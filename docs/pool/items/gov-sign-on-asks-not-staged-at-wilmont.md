---
id: gov-sign-on-asks-not-staged-at-wilmont
title: "An official's ask at the seat is never met the same day, so sign-on asks are not staged at Wilmont, Minnesota"
area: gov
kind: bug
priority: 3
size: S
status: merged
standard: 2
claimed-by:
pr: #9664
blocked-on:
source: "the Account lead, Nov 16: bill-sign-on Wilmont MN red on Train 2 head ef708196, found while gating the favor fix"
claimed-at:
after:
lead: laws
model: sonnet
effort: medium
root: rc3-thin-life-record
merged-at: 2026-11-16T19:58:43.915Z
---

**What.** The test `the player asks, the colleague answers from the record, and a yes is a name the chair weighs` in `src/director/bill-sign-on.test.ts` (removed) fails at Wilmont, Minnesota, where the player's bills are drafted and no sign-on ask is staged on the player's schedule. A player there who drafts bills is never asked by the game to go to colleagues for their names. Seen: the played world at Wilmont, Minnesota (place 2770582, world seed 2cb5aaf15d55f6b06548834319221a87402931e3d1570c6e674f546d2ff2025f), after drafting a bill on each question and playing two days.

**Cause.** Found in code: in `scheduleMoment` (`src/director/scheduling.ts`, the `familyNews` own-record test) a scene is met the same day only if one of its bindings' resolved setting kinds is in the schedule's `ownRecordSettings`. The Train's setting change (an official whose employer is the government's treasury meets at the seat) makes `office` resolve to `{ kind: "venue", seat: true }`, and `venue` is not in that list, so an official's ask is never met the same day and waits or becomes a journal line. Measured: with `row.setting.seat` also counted as met, `bill-sign-on.test.ts` passes (3 of 3) at Wilmont, Minnesota (place 2770582), and hold-chair-sought goes from `scene-waiting` back to `scene-now`.

**Fix.** Count a seat setting as met in that one test: `met.has(row.setting.kind) || row.setting.seat`. No new setting kind, no list change.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** No dice; the asks come from who the player knows (`askToSignOn`).

**Done when.** At place 2770582 with the world seed above the test passes by the player's presses, and a second session on main, in a place and seed it names, sees the sign-on asks staged after drafting.

**Waits on.** Nothing.

**Files.** src/director/scheduling.ts

**Notes.**

- Nov 17, story-cut-deleted-scene-kinds: src/director/bill-sign-on.test.ts deleted with its scene kind (owner, Nov 17: "DELETE EVERYTHING THAT IT HASNT WRITTEN").
