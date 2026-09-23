# The 28-day countdown, and why a real date does not fit yet

**Read:** 2026-09-22 on `claude/playtest-cwpd3o`, branched from main at
`1c4992e8`. **Not fixed.** The calendar is built and tested; it is not wired
in, and this record says why.

## What the player sees

Every contest in every town counts down 28 days, whatever the office, the
state or the month. Filing on 4 March and filing on 20 October both produce an
election 28 days later. Measured in all fifteen towns of
`docs/playtest/running-for-office-across-america-2026-09-22.md`.

The governorship, offered on the same screen in the same town, does not do
this. `fileForStateExecutiveOffice` reads the state's own election rule and its
comment says so in as many words: "Never a fixed number of days after filing."
So one route was declining to use a calendar the other route already had.

## The calendar, built

`src/simulation/legislative-election-rules.ts` now computes the real thing, in
the shape `state-executive-term-rules.ts` already established:

- The election is the next November general — first Tuesday after the first
  Monday — never a distance from the filing day.
- The cycle follows the chamber's term, so Ohio's four-year Senate is contested
  every fourth year and its two-year House every second.
- A term length the accepted candidacy pack has a source for is used and
  carries that citation. Nebraska, Alaska and Ohio have one; the other seven
  packs do not and fall to the game's disclosed profile, which says it is the
  game's own rule rather than the state's.
- `basis.election` is `game-profile` for every state without exception,
  because no state's legislative election calendar has been read into this
  repository. A sourced term length must not launder into a sourced calendar.

Six tests in `src/presentation/a-real-election-date.test.ts` hold that, the
last of them specifically that no chamber ever reports a sourced calendar.

## Why it is not wired in

Wiring it into `fileForOffice` fails seven tests, and they are right to fail:

```
campaign-integration.test.ts > resolves it while quiet time passes
campaign-integration.test.ts > a free ordinary choice leaves it pending, then explicit time dispatches it
campaign-integration.test.ts > a free canonical episode choice leaves it pending, then explicit time dispatches it
campaign-integration.test.ts > seats the Lexington winner in Kentucky and opens that legislature after reload
campaign-projection.test.ts  > reaches a result by living the weeks, not by pressing a button
campaign-projection.test.ts  > lets a lost election be a thing that happened, not an ending
campaign-projection.test.ts  > puts the winner in the seat, through the same work records as any job
```

Each of them lives the weeks to election day. With a real calendar the wait is
up to four years of game time, and "reaches a result by living the weeks" is
exactly the behaviour the 28 days was standing in for.

The missing piece is not the calendar. It is the **filing window**. In the real
world you cannot file four years early; filing opens and closes. Every pack in
the game records `filing` as `unknown` — "The game does not have this office's
filing process — no deadline, no filing officer, no primary or nomination
route — so it cannot open one here." So there is nothing to gate filing on, and
without that gate a real election date turns an ordinary campaign into a
four-year wait rather than a season.

The state executive route survives this because it has `regularFieldClosed`
and a field-closing date. The legislative packs have no equivalent.

## What would settle it

`docs/research/requests/state-legislative-seat-calendar-and-field.json` already
asks for the legislative calendar. It needs one more thing, which this record
is the argument for: **when filing opens and closes for a legislative seat**.
With that, the calendar wires in and the campaign is a season again.

Until then the 28 days stays, and the comment at the call site now says it is a
placeholder and points here, rather than reading as a considered choice.

## Not a defect, for the record

The 28 days is not wrong arithmetic; it is a stand-in with no rule behind it,
which is a different thing and is worth keeping separate in the list. Nothing
here is broken for a player today. What is true is that no save's election
date can ever differ from any other save's, which matters for the divergence
work now running in its own thread.
