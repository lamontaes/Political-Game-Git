---
id: core-fill-in-returning-unrecorded-member
title: "Filling in a household returned to the counts stops the game when a member is on file but not in the counted record"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/path-sweep
pr: #4910
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T12:07:26.163Z
---

**What.** `fillInPerson` stopped the game with `Household already present` in the housing engine's eviction removal. A household returned to the counts (`demoteHousehold`) kept a member in `core.people` (alive, at the counted place) whom the counted record no longer held, because that member died or left as a counted person. The returning branch moved only the people the record held, so the household looked like a partial move and `relocatePeopleV1` refused it. The unrecorded demoted member now comes back with the household.

**Rules.** Fix at the root: the household moves whole, and nobody is left at a counted place without a counted record. No dice.

**Done when.** `src/core2/fill-in-returning-dead-member.test.ts` returns a drawn place's household to the counts, removes one member as a counted person, fills the other in, and checks the household is back and none of its living members stays at a counted place; it fails on main with the crash's own error. The path check on seed swf4d9a322 (Cullowhee, North Carolina) runs to its end instead of stopping.

**Files.** src/core2/state.ts, src/core2/fill-in-returning-dead-member.test.ts

**Notes.** Found by the eight-place path-check sweep, Oct 17 (claude). Open question for the people area: should `removeCountedPerson` also mark the full record dead, so no alive person with a counted place and no counted record can exist? Not changed here.
