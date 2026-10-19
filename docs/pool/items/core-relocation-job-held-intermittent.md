---
id: core-relocation-job-held-intermittent
title: "A played year once stopped with 'Invalid relocation: one living household, no job held' in a drawn place (seed not captured)"
area: core
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/relocation-dead-member
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T20:40:54.006Z
---

**What.** A played year stopped with "Invalid relocation: one living household, no job held" in a drawn place (seed not captured). Found by reading the callers of `relocatePeopleV1`: when an evicted household is doubled up with a relative in another town, `placeRemovedHousehold` in `src/core2/housing-homeless.ts` passed the household's whole roll as movers, and a member who has died stays on that roll (the health engine only sets `alive: false`), so the move was refused as a dead mover. The fix passes the living members and lets the core treat a household as moving whole when only the dead are left behind.

**Rules.** One model, two tiers: the same rule moves a full or counted household. No dice: who moves follows the household's living members and the relative's room.

**Done when.** A test in `src/core2/state.test.ts` moves a household whose other member has died, as a whole, under its own id, and still refuses a move that names the dead member; the housing-homeless tests pass.

**Files.** src/core2/state.ts, src/core2/housing-homeless.ts, src/core2/state.test.ts

**Notes.** Cause inferred from the code and shown by the unit test, not by the original seed. If the same message ever appears with a living mover, the other branch of the check is a job held in another place.
