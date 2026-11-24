---
id: bench-office-stop-switch-floor-stop-never-held
title: "The floor-vote stop switch test finds no stop with the switch on"
area: play
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: governor's briefing room builder, Nov 15; red on the Train at 693479ab and on 0491cac2e8
lead: play-first
claimed-at:
---

**What.** `src/bench/office-stop-switch.test.ts` (floor switch, Danville, Iowa, state senator, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6) expects a floor-vote stop with the switch on and gets null. Seen: a played state senator is held for the floor vote when the switch is on.

**Cause.** Needs cause. Measured: `npx vitest run --dir . src/bench/office-stop-switch.test.ts` fails at line 166 (`a floor stop with the switch on: expected null not to be null`) on a clean checkout of the Train head 693479ab90eaa361dc807c993b87daad5eb4d750 and on the briefing-room branch, about 18 seconds in. The briefing room touches no floor or office-day stop code on its first commit.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Opus session. When it runs out, push what passes and say so. Seen: the test passes and a played state senator is held for the floor vote.

**Rules.** No dice. Wire to the world: another engine reads what is written. One rule, all 56 places: no place is named in logic.

**Done when.** A second session, on main in a drawn place and a seed the builder did not choose, and also at the pinned case (Danville, Iowa, state senator, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6) on main and sees the floor stop held with the switch on and none with it off, and `src/bench/office-stop-switch.test.ts` passes.

**Waits on.** Nothing.

**Files.** src/bench/office-stop-switch.test.ts, src/core2/office-day-state.ts, src/bench/office.ts

**Notes.** Nov 15. Not yet checked by a lead; filed with Needs cause so nobody builds it before the cause is found.
