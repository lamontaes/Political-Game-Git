---
name: cadence-and-summaries
description: >
  The rule that nothing in Our Civic Duty runs or is kept every day by default
  (owner, Nov 10): how to pick an engine step's cadence (on an event, monthly,
  yearly), how a table that grows with history folds into a summary, and how
  to write an entry in the daily register (docs/design/daily-register.md) when
  something truly must be daily, with the guard that checks it. Read it before
  adding or changing any engine step (onDay, onAfterDay, a calendar entry) or
  any kept table. Not for timing a year (speed-work) or running long saves
  (heavy-runs).
---

# Cadence and summaries

The rule is `.agents/rules/cadence-and-summaries.md` (owner, Nov 10: "not everything is tracked every day, and... summaries are automatic, and... if something does need to be tracked more often, then it's specifically written and it's reasoned through"). The guard is `npm run guards -- daily-register` (`tests/guards/daily-register.test.ts`). The register is `docs/design/daily-register.md`.

## Before you add a step

Ask what the step reads and when that changes. Pick the first cadence that fits:

1. **On an event.** The step runs on the day something it reads changed: a law in force, a hire, a sale, a filing, a birthday. Find that day from an index, or schedule it on the engine's calendar (`moduleCalendar(...).schedule({ key, date, kind, ... })` in `src/core2/module-calendar.ts`, handled by the module's `onCalendarWork`). Never scan everyone to find who changed.
2. **Monthly or yearly.** Bills, rents, budgets, reviews and counts that settle on a period run on the calendar date of that period, not as a daily check of "is it the first today?" over the whole world.
3. **Daily**, only when a person the player can meet acts or decides that day and the player can see it the same day, and then only for those people (the player, their household and circle, people in focus, officials). Write the register entry.

The counted population is read with the same rule as a full person times its count (owner, Oct 14). Moving a step to its cadence never changes what a person, business or official decides, and never adds a seeded roll.

## Before you add a table

Say which kind it is, in the register's table list:

- **A row per thing** (a person, a household, a seat, a business): it is bounded by the world's size. Write `per thing` and what the thing is.
- **A row per event** (a heard fact, a vote, a receipt, a log line): it grows with the years. Name its fold: the function that drops or summarizes old rows, and the window each reader reads. Readers' windows are agreed with their owners (`speed-work`, "Fold what grows"). A table that grows with no fold is a defect.
- If it grows and you cannot fold it yet, write it as `grows` with the reason and bring it for approval. Only the entries main held on Nov 11 may stay unapproved.

## Writing a register entry

One line per entry in the matching section, with these columns: the id the guard prints, the cadence, why it must be daily or why it grows, what the player sees from it, the cost per year (seconds from a CPU profile of an election year, or rows added per year from `speed:year --out`), and the approval (`approved: <Fable B or CTO>, <date>, #<pr>`). The guard prints the line to paste for any step or table it does not find.

- The cost comes from a profile of year 4 (`scripts/speed-years/profile-year.ts`), read by inclusive time under the module's `onDay` or `onAfterDay`. Say which place and seed.
- Nobody approves their own entry. Ask the coordinator or the CTO on the pull request; say why it must be daily in one sentence.

## Removing an entry

A speed cut that moves a step off the day, or folds a table, deletes or changes its register line in the same pull request, and the PR body names the entry. The baseline of unapproved entries (`tests/guards/daily-register-baseline.json`) only shrinks: delete the id from it in the same change.

## Traps

- A module whose `onDay` returns at once on most days still runs a call a day and is still listed. Move its dated work onto the calendar, then drop the `onDay` and its entry.
- An inclusive profile share is not a saving (`speed-work`): time the cut with alternating pairs before you call it one.
- A table that looks flat in January can hold November's rows that a three-month window has not yet dropped. Compare the same month across years.
