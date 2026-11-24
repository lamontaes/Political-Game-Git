# Cadence and summaries

Part of the `speed-work` skill. Until Nov 17, 2026 this was the `cadence-and-summaries` skill; the CTO merged it here when the skills were capped (owner: "Let's go ahead"). What it covered: Picks how often an engine step runs and how long a table is kept: on an event, monthly or yearly, never daily by default (owner, Nov 10). Growing tables fold into summaries; a step that truly must be daily goes in docs/design/daily-register.md, which a guard checks. Use before adding or changing onDay, onAfterDay, a calendar entry or a kept table. Not for timing a year (speed-work) or long saves (heavy-runs).

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
- **A level's monthly work goes on `onMonth` of its office-act kit (Account lead builder, Nov 14).** The office-day module calls each registered kit's `onMonth` on the payday branch (the first of the month), so a yearly act of the world's officials (a governor's address on the state's session date, put on the module calendar for its day) costs one pass a month and no `onDay`; the daily-register guard fails an unlisted `onDay`. Read the person list narrowly there: reading every serving term (230 people) when only the governors matter was the one real cost found.
- **A new kept table needs its register row and a fold (Nov 16, world thread, `jobs.playerApplications`).** Add `| `<module>.<table>` | flat | a row per <thing>, dropped when <it is gone> | 0 / 0 / 0 / 0 | none needed |` under "Kept tables" and make the claim true: drop a row when the thing it holds is filled or withdrawn, in the pass that reads the table. `tests/guards/daily-register.test.ts` fails the `guards` job without the row.
