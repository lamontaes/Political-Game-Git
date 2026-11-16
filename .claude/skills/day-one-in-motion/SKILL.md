---
name: day-one-in-motion
description: >
  The rule that every world opens as a place already running, at every level:
  town, state and federal. Before any module that keeps a record over time
  ships, ask what that record looks like on day 0 and whether a real place
  would have it empty; if not, build the opening stock from the same engine
  that makes the flow, never a hand-filled list. Use when adding or changing
  any module, record table, scene producer, office, body, budget or news
  source, and when a played world's first screens look empty. Not for the
  world's past (the opening past is seeded generation, see the owner's Oct
  rulings) or for timing (speed-work).
---

# Day one is in motion

Owner, Nov 14, 2026: "The town must be in motion on day one." And: "And not just town, but country and state. Remember, it's all one simulation." A new world opens as a place already running, not one that starts from empty and fills as the player waits.

## The question every module answers

Before a module that keeps a record over time ships, answer in the PR body, for the town, the state and the federal level:

1. What does this record look like on day 0 in a world built by `buildBenchWorld`?
2. Would a real place on that date have it empty? If not, the opening stock is missing.
3. If it is missing, **build the opening stock from the engine that makes the flow**: run that same engine for the opening (a warm-up of its own monthly step, or a draw from its own steady state with the place's own figures). Never a hand-filled list, never a number typed for one place (`one-rule-all-places`), never a second writer or a second engine (one engine per mechanic).

A stock the engine already produces on day 0 needs no work; say so with a record id. Opening stock is generation of who and what exists, which the no-dice rule allows; after day 0 nothing is a draw.

## What "in motion" has meant so far

People already out of work on day 0 (the stock, not only the monthly flow); voters already registered; party chairs with ties; officials already giving their yearly address and holding office hours unattended; people with something to say; open vacancies; a ballot that already has filings when a world starts inside a filing window; campaigns with money already raised and set aside. At state and federal level: sessions under way, bills in progress, budgets in force, officeholders mid-term, laws in force with their enactment history. Every state's legislature is seated from day one (`OWNER-DECISIONS.md`, Sept 26 and the Oct ruling that laws work federally).

## The one mechanism: the opening warm-up

A world can be built `warmUpDays` before its start date and run forward to it with the engines' own days (`src/core2/player-warm-up.ts`; `OPENING_WARMUP_DAYS` is 31 and the New game route and the day-zero test use it; tests that build a world without the option are unchanged). It fills the records an engine makes on its first steps. What a place has from longer ago than a month (last year's address, past police months, sitting committees, party chairs, a session in progress, a vacancy) is **not** a longer warm-up: the engine that owns it writes that stock for the past date inside the warm-up window, called from the one warm-up. Rules it keeps: the played person does nothing in the window (it runs the player clock's own day, `runControlledDay`, so no module may choose for them; pinned in `src/core2/player-warm-up.test.ts`, which fails if the hold is removed); the director shows the player nothing from it (`director.whileWarming`); ages and the entrant are read on the start date, not the build date (`cohortsOn`, `openingAgeOn`).

## How it is checked

A skill alone does not hold, so three things enforce it:

- `src/core2/data/opening/day-zero.json` calls each table stock (a real place has it on an ordinary day before anyone watches), flow-only, or unsure. The test of stock: would a real town, state or country have this record on an ordinary day?
- `src/core2/day-zero.test.ts` builds a world with the warm-up at two pinned places (`pinned-tests`; one world covers town, state and federal, since it is one simulation) and fails by name where a stock table has no rows at creation. A still-empty stock table is known-red and names its pool item (never a stopgap id); the list only shrinks, and a known-red table that has rows fails until its mark is removed.
- `tests/guards/day-zero.test.ts` fails when a module id in `src/core2` is not in the file's `modules` list, so a new module cannot ship without answering the question, and when a known-red table is not in `tests/guards/day-zero-baseline.json`.

Measure a table with `node --import tsx scripts/dev-tests/day-zero-year.ts <seed> 365`. It reads at creation and after 1, 31 and 365 days, because an engine's first step seats much of the opening: a table empty at creation and filled a day later is a smaller finding than one empty for a year, but a player can read it before the step runs.

## Traps

- **The opening is traced in dev mode with its source (owner, Nov 16: "track everything at open").** Each thing the opening sets names where it came from. A random draw nobody can explain, or a number the same for every place, is a defect; draw from the world's seeded units keyed by id, never an ad hoc hash.

- A unit test that builds its own small world proves nothing about day 0. Read the table in `buildBenchWorld` (`recordProof` lists every table's row count).
- "It fills in a month" is the bug: the player's first screens, the paper, the first scene and the town meeting all read day 0.
- A level you did not look at is a level that is empty. Look at the state and the country, not only the town.
- **A table that stays empty at a pinned place may be a true zero, and the test says why (Nov 15).** The vacancies row has `zeroAtPlaces` in `day-zero.json` for a place whose warm-up window held no death of a seat holder; `src/core2/day-zero.test.ts` asserts the cause there (none who died held a seat, illnesses in progress), never a bare waiver. Check the cause before writing it: Lewiston's window held two deaths (a cabinet secretary already replaced, a press owner), so "no one died" was false. An opening whose health engine starts from nobody ill (no look-back) cannot have a dated-past death at all.
