# Inauguration, swearing-in and transition as played scenes for every office (bank id b45, phase P4 every office, unlocks "win, take the right seat" from council to President)

Verified against origin/main a88744a25 (Oct 6).

## What the player experiences

You are Dana Reyes, just elected to a county council seat in a place the game drew. The count was election night (b03). Now the clerk's office sends word: the term starts on a date set by that county's rule, and until then you are the member-elect. The sitting member you beat is still the member. You can meet the outgoing member for a walk-through of pending items, and the clerk for orientation. They are real people with their own mood about losing. The old member may be gracious or sour. On the first day of the term you stand in the room with the oath words in front of you, and you choose swear or affirm and what you place your hand on. The clerk or a judge reads it, your family and a few supporters are in the seats, and the old member either attends or does not. Then the seat is yours and the first meeting opens. The same scene runs for a state senator in January, a governor on the capitol steps, a member of Congress on the House floor, and a President on January 20. Only the date, the officiant, the room and the guests change, and all of them come from records. Between the election and that day the outgoing officials still hold power, and the incoming ones prepare. You see a lame-duck session or a last-minute order and know who made it.

## Owner decisions it rests on

- Register (the acceptance route): "if elected replaces the correct member at the start of the term."
- Register, "Important people everywhere": "they act when their institution acts: a session day, a hearing, a vote, a campaign event."
- Register, local meetings: "On a meeting date the game resolves that meeting: the agenda comes from that place's conditions and each member votes from their own saved record."
- cto-notes/02-vision-audit-2026-09-26.md: the audit row "Win, take the right seat" (failed in 92/101 state chambers before #685). No owner quote exists on main for inauguration scenes themselves; I did not invent one.
- Fixed rules: zero dice; nothing blank (estimate and mark it); one rule for all 50 states, D.C. and territories; emergent not authored; one writer per record kind; delete what you replace.

## Existing code to extend (VERIFIED on a88744a25)

- The oath exists as a record and a panel, for two levels only. `src/simulation/office-transition.ts:566 takeOathOfOffice` refuses before `startsAt`, writes one public event `OFFICE_OATH_TAKEN` (:519). `:547 oathOfOfficeRecord`, `:532 oathChoiceOf`. Words: `src/simulation/oath-of-office.ts:81 stateOathOfOffice` (state wording only, "blanket" phrases, `BLANKET_STATE_OATH_VERSION` :75), `oathSwornOnOptions :44`.
- Profiles: `office-transition.ts:359 OFFICE_TRANSITION_PROFILES` has five (federal House, federal Senate, state legislature, state executive, local). Each has one fixed `entry` and `swearingIn` sentence and a fixed services list (e.g. `executive-outgoing-briefing` :311). Its own `COMMON_NOT_CODED` notes (:~100) say oath is not required to hold powers, no deadlines, attendance changes nothing, "Other winners' transitions are not simulated". The LOCAL profile text says "The player cannot win a local office yet", which is stale.
- Player surface: `src/presentation/office-transition.ts:199 projectOfficeTransition`, `:336 projectSwearingIn`, `:387 takeOathForHeldOffice`; `resolveTransition` (:~189) covers state legislature, state executive and Congress only. `heldTerm` (:~295) covers state legislature and state executive only. UI is two panels: `src/player/OfficeTransitionPanel.tsx`, `src/player/SwearingInPanel.tsx`, mounted at `PlayerGame.tsx:4477-4510` as sections "Before you take office" and "Swearing-in". They are forms, not scenes. No path exists for a council member, mayor, county officer or President.
- Seating happens in six separate places, each with its own start date:
  - State legislature: `legislative-office-terms.ts:128 datesFromTermProfile` via `commencementInYear` (`state-executive-term-rules.ts:500`), from the term-profile rule row. Right pattern.
  - State executive: `nationwide-world/state-executive-terms.ts:257-261` uses the same `commencementInYear`. Right pattern.
  - Congress: `living-world/congress-turnover.ts:699,777,947,1185` hard-code `${year + 1}-01-03`. Seat windows are in `congress-seats.ts:156 seatTermWindow`.
  - President: `federal-reform.ts:199-200` hard-codes January 20; `presidential-turnover.ts:1115 swearInWinners` writes a national "qualification" record, not `OFFICE_OATH_TAKEN`, so the two oath records differ.
  - Local city and town: `living-world/local-elections.ts:143` ("A winner takes the seat on the day of the count"), seated by `seatTheWinner :1449`. No member-elect period exists.
  - County: `localElectionTermStartHandler :1377` seats on a county calendar date (authored provenance note in the file). The only local office with a transition.
- Repair path `office-entry-repair.ts:12 seatWinnersOwedTheirTerm` (run at `ordinary-life.ts:228`) seats winners a past defect missed. It is a repair, not the flow.
- Not on main: grep finds no outgoing-official scene, no inauguration guest list, no officiant record, no lame-duck behavior. The only "outgoing" lines are `office-transition.ts:311-312`.

## Build steps (one PR each, in this order)

1. **One term-start rule row for every office.** A single function `termStartFor(officeKey, electionDate)` reading each office's commencement from the rule rows (state: existing term profiles; Congress: January 3 as a row, not a literal; President: January 20 as a row; city/town/county: each place's own organization date, ESTIMATED FROM AVERAGE where unknown). Replaces: the `-01-03` literals (`congress-turnover.ts:699,777,947,1185`), `federal-reform.ts:199-200`, and `local-elections.ts:143` seating on count day. Must not: change the existing state rows or add a per-state branch.
2. **Member-elect period for local winners.** Winners keep the new seat in "elected, not yet seated" until step 1's date; the sitting holder serves until then, through the existing seat records (`seatTheWinner`). Replaces: the count-day seating in `localElectionCountHandler` (`local-elections.ts:1163`). Must not: a local-only handler; reuse `localElectionTermStartHandler`'s due-item pattern for every unit.
3. **One oath record and one set of words for every level.** Extend `oath-of-office.ts` so wording comes from the office and level (federal 4 U.S.C. 101 text sourced; state and local from each constitution or charter where researched, else blanket and marked). Presidential `swearInWinners` writes `OFFICE_OATH_TAKEN` too. Replaces: the second oath record in `presidential-turnover.ts:1115`. Must not: a second oath event type.
4. **Who is there, from records.** One function names the officiant (the office's rule row: clerk, judge, Speaker, Chief Justice), the outgoing holder, family, supporters, staff and donors who are real people tied to the winner, and anyone the winner invited. Nobody is invented; each guest has a reason from relationships. Output is a fact packet for `composeGroundedLine`.
5. **The ceremony as a scene.** Replace the two panels with one scene on the term's first day: the player chooses swear or affirm and the object, speaks the words, and the scene shows guests and the outgoing holder's reaction from their own record. Scene rows come from Session 4 (stubbed if unmerged). Replaces: `SwearingInPanel.tsx` and the `swearing-in` section at `PlayerGame.tsx:4494-4510`. A day the player is not the winner (NPC winners) writes the same record with no scene.
6. **Transition period as people.** Extend the services into scenes with the outgoing holder (walk-through of pending items from their real open matters), the clerk or chief of staff, and the transition team for executives (b37 owns who staffs and confirmations; this part only meets them). Attendance changes who knows what, through existing knowledge writers. Replaces: the fixed `executive-outgoing-briefing` text and the per-level `services` arrays in `office-transition.ts:~100-355` (move to rows in `data/content`). Extend `resolveTransition` and `heldTerm` to council, mayor, county officers and President. Must not: a second transition engine.
7. **Outgoing power until the day, then change.** The old holder keeps the office; lame-duck actions they take (orders, appointments, a final vote) are ordinary records and the new holder's scene can mention them. Office powers move at the oath, not before. If the winner has not taken the oath by the rule row's deadline, the seat is treated as the rule says (data row; default holds the office and flags it). Replaces: the `COMMON_NOT_CODED` notes that say the oath changes nothing.
8. **Deaths, withdrawals and vacancies in the gap.** A winner who dies or declines before the term (b19, `presidential-turnover.ts:~137` for the President-elect) passes through the existing vacancy and succession records. Same function for every level.

## Must NOT build

Election night counts and results (b03); filing, primaries, nominations (b34); staff hiring and confirmations (b37); the first sitting and committee seats (b05, b10, b35); budgets (b38); executive orders (b17, Session 23); impeachment or succession (G136, G137); a second oath record; dice; authored speeches or guest lists; a per-state or per-level script; a meter of "transition success".

## Research tables

Repo data first: `data/source/book-of-the-states/` (term starts and inauguration dates for state executives and legislatures), `data/source/constitutional-process/`, `data/research/legislature/` term profiles, `src/simulation/nationwide-world/state-executive-term-rules.ts`, `data/content/` transition rows (to create). Missing numbers, one search each, 10 minutes max, never invent: city, town, county organization dates and oath officiants, state oath wording, territorial and D.C. oath rules, deadlines to take the oath. Estimate wording: "ESTIMATED FROM AVERAGE: <government type> in <region>".

## Done when (played-game proof)

- New game in a random place via `tests/support/random-place.ts` `drawRandomPlace`: the player wins a council seat, is member-elect until that place's date, meets the outgoing member, is sworn on the day, and the sitting member serves until then. Save and reload at each point; same answers.
- Same flow for a territory place and D.C., plus state house, governor, a House seat (January 3) and President (January 20), one code path.
- A winner who dies in the gap triggers the vacancy flow.
- Tests: `term-start-all-offices.test.ts` (every office has a date, nothing unknown), `oath-one-record.test.ts`, `inauguration-scene.test.ts` (3 random places), `transition-outgoing-holder.test.ts`; grep test that `-01-03` literals, count-day seating, `swearInWinners` as a separate oath record and `SwearingInPanel` are gone.

## Proof to post

PR comment per step: random place and seed, the printed term-start date and its rule row, the oath record, the scene's guest list with the relationship reason for each, the delete list per "Replaces:", `npm run typecheck` and changed tests passing.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.

Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building.

Before every pause, push your branch and leave a resume marker: docs/codex/progress/session-<N>.md (what is done, what is next, the exact next command), plus a PROGRESS: note in the PR body.

Open owner questions (none blocking): (1) whether a player who skips the oath scene still gets the seat on the date; (2) how long the member-elect period is for towns that organize the same night. Switches kept: oath-required-for-powers = one constant `OATH_REQUIRED_FOR_POWERS` in `office-transition.ts` (default false, matching today); oath deadlines = one data row per office. If Session 4 has not landed, stub the scene through `INTERFACES.md` section 1; if b37 has not landed, the transition team scene names nobody and says so.
