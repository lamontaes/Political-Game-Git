# Not everything every day, and summaries are automatic (owner, Nov 10, 2026)

Every role follows this file. The skill `cadence-and-summaries` says how to apply it; the guard `daily-register` holds it.

The owner's words (Nov 10, about 10:02 p.m. ET, relayed by the CTO on #7365, Nov 11 03:03 UTC): "make it a project requirement that not everything is tracked every day, and that summaries are automatic, and that if something does need to be tracked more often, then it's specifically written and it's reasoned through by the coordinator or you. So that way this stops happening, because we obviously know the cause and it keeps happening."

It carries out the speed rulings already in force: a country's year in under two minutes in every year, and "old records fold into summaries once play no longer reads them" (`OWNER-DECISIONS.md`, Oct 30 01:55; `AGENTS.md`, "Speed").

## The rule

1. **Nothing runs or is kept every day by default.** Each engine step and each record names its cadence: on an event (the day something changed, found from an index or a dated calendar entry), monthly, or yearly.
2. **Old records fold into summaries automatically**, keeping only what play reads. A table that keeps a row per event names the fold that bounds it and the window each of its readers reads. A table that keeps a row per thing (a person, a seat, a household) says so.
3. **Anything that must run or be kept daily is written into one register**, `docs/design/daily-register.md`. Each entry says what it is, why it must be daily, what the player sees from it, and its cost per year. It is approved by name by the coordinator (Fable B) or the CTO, on the pull request that adds it.
4. **The guard** (`npm run guards -- daily-register`) builds a world and fails when an engine has a daily step (`onDay` or `onAfterDay` on a module or an office kit) or a kept table that the register does not list, or when an entry that is not approved by name is not one of the entries main held on Nov 11.
5. **The entries main held on Nov 11 are marked "not yet approved".** They are the speed lead's list of cuts: each cut moves a step to its real cadence or folds a table, and its pull request removes the entry or brings it for approval. The baseline of unapproved entries only shrinks.

## What counts

- **A daily step** is a module's `onDay` or `onAfterDay`, an office kit's `onDay` or `onAfterDay`, or the kernel's own day work (`runDay` and `compactDay` in `src/core2/life.ts`). A daily step that does its work only on a dated day (the first of the month, a payday, election day) is registered with that cadence, and the guard still lists it so the check is written down.
- **A kept table** is what dev mode's records proof sees (`src/bench/dev-proof.ts`): each core field, each module table, and each world part.
- **Growing** means the table's rows rise with the years played. Measure it with `npm run speed:year -- --seed <s> --out <file>` over four years, which writes records per table each year.

## Who approves

The coordinator (Fable B) or the CTO approves a daily entry by name on its pull request, and the entry records who and when. Nobody approves their own entry. A table that keeps a row per thing, or that names its fold, needs no approval, only the line that says so.
