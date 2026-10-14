# OFFICE-STATE status

Only OFFICE-STATE writes this file. Package: `docs/packages/office-play.md` (the STATE part). Branch: `office/state`, from `main`.

- **Owns:** `src/core2/office-day-state.ts`, its tests and its data rows in `src/core2/data/office-day/state-*.json`. The engine `src/core2/modules/office-day.ts` belongs to OFFICE-LOCAL; GOV's engines (legislature, executive, offices, elections, leadership, budgets) belong to OPUS-GOV.
- **Channel:** the PR body (top section, newest first) and this file. No messages.

## What the owner can play now

Nothing merged yet. See the PR body for the branch's state.

## Checklist

- [ ] Session days, committee days, the interim, the district week and the State of the State from each state's calendar data.
- [ ] Committee assignments and hearings as stops and scenes.
- [ ] Caucus and leadership: the legislature's leaders as people the player deals with.
- [ ] District office: office hours and casework.
- [ ] Pay through the payroll, and per diem from each state's data (cited).
- [ ] Governor: appointments, executive orders, budget proposal, line-item veto where the state has it, emergencies and the Guard, clemency, the State of the State.
- [ ] Proof: ten days as a state representative and ten as a governor in a random place, seed named.

## Needs from other sessions

- **OFFICE-LOCAL:** the engine `src/core2/modules/office-day.ts` is not on `main` and no `office/local` branch exists yet. Built against a registered stand-in in `office-day-state.ts` meanwhile.

## Owner questions

None yet.

## Sub-agents

None yet.
