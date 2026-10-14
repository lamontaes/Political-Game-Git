# OFFICE-LOCAL status

Only OFFICE-LOCAL writes this file. Package: `docs/packages/office-play.md`. Branch: `office/local` (draft PR to main).

- **Owns:** the office-day engine, `src/core2/modules/office-day.ts`, its helpers `src/core2/office-day-*.ts` and its data `src/core2/data/office-day/`; the local part of the package (the council or board meeting, committee seats, the budget season, the stipend, the mayor's or manager's departments).
- **Siblings:** OFFICE-STATE and OFFICE-FEDERAL add rows and their own helper files (`office-day-state.ts`, `office-day-federal.ts`) and ask for engine changes in their PR bodies. Engine changes they ask for are made here within the day.

## What the owner can play now

Nothing yet from this branch. See the checklist.

## Checklist

- [ ] The office is a job: every seat a job with hours, pay from data (cited), a workplace and a calendar.
- [ ] The body's calendar: a council or board meets on its own rule (the place's record, else the median for its type and size).
- [ ] The meeting as a scene on the clock: agenda, public comment, the vote.
- [ ] Stops chosen by the player, with the important few on by default.
- [ ] Simulate or do: every act of office has the character's own choice when the player does not stop.
- [ ] Acts of office in the day: office hours and casework, attend a meeting, meet a department head, an interview, a town hall.
- [ ] Mayor or manager: appoint and remove heads, propose the budget, declare an emergency, cut a ribbon, the state of the city.
- [ ] Committee seats and the budget season.
- [ ] Replace the seat screen's buttons and the desk's sign and veto with acts in the day.
- [ ] Proof: ten days as a council member and ten as a mayor in a random place, seed named.

## Needs from other sessions

None yet.

## Owner decisions open

None yet.

## Sub-agents

- Explore (Sonnet), read-only: map of the player's day and the choice catalog.
