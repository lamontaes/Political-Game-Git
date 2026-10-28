---
id: core-counted-weight-money-test-red
title: "counted-weight-money test fails on a drawn place: counted rent and pay exceed the weighted expectation (6,258,687 against 5,704,457)"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/weight-money
pr: #6444
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T23:44:10.358Z
---

**What.** src/core2/counted-weight-money.test.ts fails on the unchanged main code in a drawn place: Ostrander, Ohio, wage flow residents:wages:opening-payroll-calendar:organization_bc110158f37a326c on 2025-02-20 moves 6,258,687 minor against an expected ceiling of 5,704,457 (one household times the wage scale plus 4). Found Oct 20 while changing residents.ts; the same failure appears with the file unchanged. Find why the counted flow pays more than the full run times its weight and fix it at the cause, not the bound.

**Rules.** One model, two tiers: a counted group is paid by the same rule as a full person, times its count, so the books balance. No dice. Wire to the world: the fix is shown in a generated world.

**Done when.** src/core2/counted-weight-money.test.ts passes on the drawn place and seed it failed on (Ostrander, Ohio; seed in the test output) and on two other seeds, with the flow and journal record ids named, and the played world's year-end money held is unchanged for a place the test did not fail on. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/counted-weight-money.test.ts, src/core2/modules/residents.ts

**Notes.** Failure text: AssertionError ... residents:wages:opening-payroll-calendar:organization_bc110158f37a326c|residents:jurisdiction_082f7e93b3d1faad:0@2025-02-20: expected 6258687 to be less than or equal to 5704457. Released from idle draft #5076 by the CTO, Oct 26.
Oct 27 (claude/counted-weight-money): not reproduced on main at 17:05 UTC. src/core2/counted-weight-money.test.ts passed on three fresh random draws (the test draws its own place). The pinned Ostrander seed was never recorded, so the original failure cannot be replayed. Likely fixed by b6ad5d4ada (weight tests read a counted job's own heads). Released unbuilt; a done-when needs the failing seed to prove a fix.
Oct 27 (claude pool worker, later): it does reproduce when pinned. `CWM_KEY=4080350 CWM_SEED=b39fa4a75ebf1a1c6277d451d3328ef877df3965f11242dc28d65ae2bbe187a4 npx vitest run --config src/core2/tooling/vitest.config.ts src/core2/counted-weight-money.test.ts` fails on clean main in West Siloam Springs, Oklahoma (4080350): residents:wages:opening-payroll-calendar:organization_47fde2b6d2040c5a|residents:jurisdiction_40fd9d71db7b56e5@2025-02-06: tax 45945 -> 156616: expected 7674.12 to be less than or equal to 4928.70. (The three random draws I ran earlier happened to pass; the item's own Ostrander seed was never recorded.) Use this pinned input.
