---
id: tests-bill-nomination-governor-seat-not-taken
title: "The governor's named cabinet pick is not seated in the bill-nomination test, and the list offers a member of Congress from another state"
area: gov
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: executive-governor-pick-offers-the-state build, Nov 15
claimed-at:
after:
lead: governing
standard: 2
model: opus
effort: medium
root: none
checked:
---

**What.** `src/bench/bill-nomination.test.ts`, "stops the governor when a cabinet post opens and seats the one they name", fails at its drawn place: the governor names the first person on the post's list, and the post's row still names the holder who died. Seen at train head aa927a84 and on the governor-pick branch alike, test seed dc23907be369d0d2: Apache Junction, Arizona (0402830), world seed ed7335e4e6b0fe8e4beeba68b4aaf32ab87bb86d6122d4b0dc4bb016dd37d0e8, post agriculture. The first person offered for the Arizona post is official:seat:US-CA:us-house:39, a member of Congress from California. Seen: on a governor's office panel, the list of people for an open cabinet post, and the post left unfilled after the governor names someone.

**Cause.** Measured: at Apache Junction, Arizona (0402830), world seed ed7335e4e6b0fe8e4beeba68b4aaf32ab87bb86d6122d4b0dc4bb016dd37d0e8 (`NOMINATION_SEED=dc23907be369d0d2 npx vitest run src/bench/bill-nomination.test.ts`), the named person is offered (`stateCandidates`) but the appointment row is unchanged after `ordersDecide` names them, so either the state senate refused the nomination (a legitimate outcome the test does not allow for) or the appointment was refused for the nominee. Why a sitting member of Congress from another state passes the pool's filter in `stateNominationInput` (`src/core2/modules/executive.ts`), which drops anyone with a serving term, is not yet traced.

**Fix.** Trace the nomination row the decision wrote (`nominations` table: confirmation and reasons). If the senate refused, the test must name someone the chamber confirms or assert the refusal; if the pool let in a serving official, fix the filter so officials of other governments are not offered.

**Time box.** 2 hours for one Opus session at medium effort.

**Rules.** One rule, all 56 places. Tests pinned to named places and seeds.

**Done when.** The test, pinned to the place and seed above, seats the person the governor names or records the chamber's refusal by its nomination row, and no serving official of another government is on a state post's list. A second session plays a governor in a drawn town, names a cabinet pick, and sees them seated or refused with the chamber's reason.

**Waits on.** Nothing.

**Files.** src/bench/bill-nomination.test.ts, src/core2/modules/executive.ts

**Notes.** Filed by hand by the civic roles builder. Nov 15: red the same way at Albion, New York (3601033), `NOMINATION_SEED=28b358851c9cdbc3`, on the Train head d82bf47e and on #9438 at bf89c51b: the post still holds `person:cabinet:US-NY:agriculture:0` after the player names `person_72255d52d0d87b8b`.
