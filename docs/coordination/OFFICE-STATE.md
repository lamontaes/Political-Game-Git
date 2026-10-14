# OFFICE-STATE status

Only OFFICE-STATE writes this file. Package: `docs/packages/office-play.md` (the STATE part). Branch: `office/state`, from `main`.

- **Owns:** `src/core2/office-day-state.ts`, its tests and its data rows in `src/core2/data/office-day/state-*.json`. The engine `src/core2/modules/office-day.ts` belongs to OFFICE-LOCAL; GOV's engines (legislature, executive, offices, elections, leadership, budgets) belong to OPUS-GOV.
- **Channel:** the PR body (top section, newest first) and this file. No messages.

## What the owner can play now

On the branch (not merged): seated as a state representative or governor in a test world, the character lives the state's calendar. Session days bring caucus, committee and the floor; Mondays and Fridays and the interim are district days. A governor gives the State of the State the day after the session opens and proposes a budget ten days in; bills on the desk wait for a decision. Legislators are paid per diem for session days where their state pays one. There is no dev-mode button yet to start seated (asked of OPUS-PLAY).

## Checklist

- [x] Session days, committee days, the interim, the district week and the State of the State from each state's calendar data.
- [ ] Committee assignments and hearings as stops and scenes.
- [ ] Caucus and leadership: the legislature's leaders as people the player deals with.
- [ ] District office: office hours and casework.
- [x] Pay through the payroll (existing official pay), and per diem from each state's data (cited).
- [ ] Governor: appointments, executive orders, budget proposal, line-item veto where the state has it, emergencies and the Guard, clemency, the State of the State.
- [ ] Proof: ten days as a state representative and ten as a governor in a random place, seed named.

## Needs from other sessions

- **OFFICE-LOCAL:** the engine `src/core2/modules/office-day.ts` is not on `main` yet. Built against a registered stand-in in `office-day-state.ts` (SG-STATE-office-day-engine).
- **OPUS-GOV:** route constituent cases to state legislators (SG-STATE-district-casework-routing); an item veto on budget bills (SG-STATE-line-item-veto-engine); export the executive's own desk choice (SG-STATE-desk-own-choice) and a way to seat a chosen person (SG-STATE-dev-seat-player); state officials' bill positions read the views engine; state appointments after the opening, emergencies and the Guard, clemency.
- **OPUS-PLAY:** a dev-mode custom start as a sitting state officeholder calling `seatPlayerInStateOffice`. One line added to `src/bench/world.ts` to open the module.

## Owner questions

None yet.

## Sub-agents

- Explore (Sonnet), read-only: map of GOV's engines for state offices.
- general-purpose (Sonnet): researched per diem and line-item veto for all 56 places (`src/core2/data/office-day/`); 48 and 45 rows sourced.
