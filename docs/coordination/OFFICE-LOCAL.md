# OFFICE-LOCAL status

> **History.** This describes the old engine or a process that ended in October 2026. Don't follow it; read `AGENTS.md`, `ARCHITECTURE.md` and `docs/README.md`.

Only OFFICE-LOCAL writes this file. Package: `docs/packages/office-play.md`. Branch: `office/local`, draft PR #4219 to main; the top of its body is the live status.

- **Owns:** the office-day engine, `src/core2/modules/office-day.ts`, its helpers `src/core2/office-day-*.ts` and its data `src/core2/data/office-day/`; the local part of the package (the council or board meeting, committee seats, the budget season, the stipend, the mayor's or manager's departments). On the play page, the meeting and desk scenes and the office panel (`src/bench/office.ts`), by the package's order to replace the seat screen's buttons.
- **Siblings:** OFFICE-STATE and OFFICE-FEDERAL add rows and their own helper files (`office-day-state.ts`, `office-day-federal.ts`) and ask for engine changes in their PR bodies. Engine changes they ask for are made here within the day.

## What the owner can play now (on this branch)

- **The council meets on its own calendar.** A council or board meets on a weekday at its hour. How often it meets follows the body's type and size: monthly for a small town, twice a month for most, weekly for a large city.
- **The meeting is a scene.** When your own bill is on the agenda, the day stops at 6:00 p.m. in the council room. Each item shows who spoke at public comment. You may speak for or against an item first; every member hears it. You vote Yes, No, Abstain or Decide for me, and then you adjourn. Turn on "Every meeting" to sit through every meeting.
- **Nobody abstains because you looked away.** At any vote you don't stop for, your character votes its own position, and the reasons are kept.
- **Your desk.** A bill that passes waits on your desk the next morning: Sign, Veto or Decide for me. This works for the world's own player. A custom start as a sitting mayor needs a change from OPUS-GOV first.
- **The seat pays.** A part-time seat pays its stipend on the 1st from the town's or county's treasury. A full-time seat is a payroll job.
- **Acts of office in the day:** office hours with your cases, a town hall, an interview, a meeting with a department head, and talking to a colleague about your bill. A mayor or county executive also gives the state of the city in January to April. Anything you don't prepare is said or decided by your character.

## Checklist

- [x] The office is a job: every local seat a job record with hours and pay from data (cited, per-world spread), paid by its treasury.
- [x] The body's calendar: the median interval for the body's type and size, a weekday and an hour; the agenda posted the open-meetings notice before.
- [x] The meeting as a scene on the clock: agenda, public comment, the vote, adjourn.
- [x] Stops chosen by the player: own bill's vote, every meeting, desk.
- [x] Simulate or do: votes, the desk, casework, town hall and interview answers, the state of the city.
- [x] Acts of office: office hours, town hall, interview, department head, colleague, state of the city.
- [x] Replace the seat screen's buttons and the desk's sign and veto (removed: Chamber, Ask, Favor, Schedule vote and their routes and acts).
- [x] Proof: ten days as a council member and ten as a mayor, recorded in the PR body.
- [x] Speed measured before and after (1.08 times, limit 1.20).
- [x] The engine open to the other levels (registry).
- [ ] Appointments: name and remove department heads (needs OPUS-GOV: the appointer's own choice exported).
- [ ] The budget season: the executive's proposal as an act in its season, the council's budget hearing on the calendar.
- [ ] Committee seats on a council that has them.
- [ ] Declare an emergency (needs OPUS-CORE's disasters engine, PR #4125).
- [ ] Cut a ribbon (needs a record of a finished public project; none exists).

## For OFFICE-STATE and OFFICE-FEDERAL

Register your acts and stops from your own file through `src/core2/office-day-registry.ts` (`registerOfficeActs`, `registerStopKinds`), use `officeHost`, `holdPlayerAt` and `releaseHold` from the engine, and add one import line to `src/core2/office-day-levels.ts`. Ask in your PR body for anything else; it is made here within the day.

## Needs from other sessions

- OPUS-GOV: local meetings on the office-day calendar; member filings held until the scene; the desk and votes read the controlled person; the executive's sign-or-veto choice, the office's case decision and the appointer's own choice exported. Details in the PR body.
- OPUS-CORE: a second, salaried pay basis for stipends; the disasters engine for emergencies.

## Owner decisions open

- May the character cast the player's ballot when the player chooses not to stop on election day? The October 13 ruling says the engine never votes for the player; the October 14 ruling says what the player does not stop for still happens. Until ruled, election day always stops (`SG-OFFICE-owner-decision-ballot-stop`).

## Sub-agents

- Explore (Sonnet), read-only: map of the player's day and the choice catalog. Finished.
- General (Sonnet): local office pay research (`data/research/local-government/local-office-pay-2026.json`). Finished; every band value is an estimate with a spread.
