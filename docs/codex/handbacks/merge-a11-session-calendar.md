# A11: one session calendar, first bounded half

Implementation draft for Claude checking. Nothing in this report is a new
runtime pass, approval, merge, or completion of all ten A11 checks.

## 1. Why-chain

A bill waits for a sitting because its next action belongs to its legislature.
That action needs the body to meet. The body meets on a timetable, with legal
minimum intervals and session limits constraining its work. Previously seven
callers each chose a date. Those choices bottomed out in game-profile numbers,
not a recorded convening decision or researched actual sitting timetable.
The shared reader moves those choices to one explicit calendar row. It does
not supply the missing real-world scheduling decisions.

## 2. Research

Inspected the compiled sources already in this repository. The Congress pack
quotes the Twentieth Amendment's annual January 3 assembly rule; that does not
establish Tuesday/Thursday sittings. The DC procedure requires two readings
with thirteen days intervening; that does not establish a fourteen-day regular
sitting calendar. The municipal procedure carries elapsed or intervening-day
minimums. The regular-session-years data cites Montana Article V section 6,
Nevada Article 4 section 2, North Dakota Article IV section 7, and Texas Article
III section 5 for biennial session years. None of those sources establishes
the old universal three-day institutional step or quarterly council intake.
The retained dates are labeled game profiles rather than promoted to law.

## 3. Revisions

Preserve existing timings while replacing their duplicated date algorithms.
Keep sitting, hearing, budget and intake tasks distinct within a body's row:
a budget preparation date is not evidence of a chamber convening. Keep the
compiled minimum-reading date as a separate constraint, and keep year and
adjournment guards with their existing writers. No rates, draws, powers,
members' decisions or money amounts change.

## 4. What gets built

1. Optional `SessionRule.sittingCalendar` preserves old packs and saves.
2. `nextSessionCalendarDate` reads interval, weekday or annual date rows. It
   refuses absent tasks and invalid intervals/weekdays; it invents no date.
3. The explicit data rows retain existing provisional timings. Congress,
   municipal compiled packs and local game packs attach the appropriate row.
4. This PR migrates Congress, DC, and town/county board sitting schedulers.
5. Team1 owns the other four callers: state seasons, institution/hearing
   cadence, local member intake, and ordinary municipal readings, plus the
   saved-state pack overlay. The unpublished proposed edits for that half are
   preserved separately as a donor, not included in this PR.
6. The new test covers boundaries, missing records, legal date constraints,
   year admission, replacement rows, and actual due-record Save/Continue
   idempotency. Claude must execute it before any pass is claimed.

## 5. Simulated, records, world pieces, checks

- Simulated: existing people and bodies still decide bills; this PR changes
  none of their inputs, ballots or rationales.
- Records: existing future due items keep their transition keys and stable-key
  patterns. Opening a menu creates no new calendar record.
- World pieces: the pack/calendar row and canonical due scheduler exist.
  Actual sitting-calendar research and effective-dated convening decisions
  remain missing. The schema does not grant permission to an unknown body.
- Checks: compare the old date sequence, legal minimum interval, session-year
  refusal, and repeated scheduling after Continue. No unmeasured performance
  or nationwide legal-calendar claim is made.

## 6. Proof run

NOT RUN under the owner rule assigning all checking to Claude. The prepared
test uses seed `a11-one-session-calendar-20261001` to sample a place from all
56 for saved due-record evidence. Its log will name the place and due IDs.
This is calendar bookkeeping, not proof of a member's filing or vote. The
existing complete local-law-clock-parity assertions remain unchanged.

## 7. Worked example

Expected, not measured here: after January 5, 2026, the retained Congress row
selects January 6. Its due item retains the existing sitting transition and
stable key. Saving, continuing and scheduling again should add no duplicate.
The council row still advances a regular sitting fourteen days; a special
posted meeting keeps its already recorded date. Actual legislators' names,
ballots, appropriations and enactments must come from the subsequent watched
run, not this example.

## Seven-calendar ownership inventory

The original references were inspected at main `75a72aca4`:

| Owner | Original calendar               | Original reference                          |
| ----- | ------------------------------- | ------------------------------------------- |
| Team1 | State seasons                   | `governing/governing-calendar.ts:20`        |
| Team1 | Institution and hearing cadence | `governing/legislative-clock.ts:150`        |
| Team1 | Local member intake             | `governing/member-agenda.ts:101`            |
| Merge | Congress weekdays               | `governing/congress-chambers.ts:267`        |
| Merge | DC sittings                     | `dc-council-sittings.ts:61`                 |
| Merge | Local council meetings          | `living-world/local-council-meetings.ts:83` |
| Team1 | Ordinary council readings       | `municipal-ordinance-procedure.ts:377`      |

## Replaces

`SittingCalendar`, `SessionCalendarRecurrence`, `SessionCalendarTask`, and
`nextSessionCalendarDate` replace the private recurrence calculations.
`LEGISLATIVE_SESSION_CALENDARS` replaces the scheduler-local calendar constants
with explicit data. `nextCongressSitting` remains as a delegating public API;
the private weekday algorithm and two fourteen-day profile exports are gone.
Team1's four-path donor retains its original assertions and legal guards.
