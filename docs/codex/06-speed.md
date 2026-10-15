# Job 06: speed

## Why

Build 18 timed South Fork, Pennsylvania (seed `b18-f375512c`, 30-day steps, one run alone on the machine) on two versions of main:

| Year | Main 44a93cfe8 | Main b51254452 |
| ---- | -------------- | -------------- |
| 1    | 16.3 s         | 18.3 s         |
| 7    | 102.3 s        | 146.1 s        |
| 9    | 88.0 s         | 280.6 s        |

The later main added legislative nominees and vote counts, and seated all 100 senators. The jump from year 7 on is new, and its cause hasn't been measured.

Lamontae's diagnosis: systems apply everything to everyone every day. Whole-world scans on each step grow with history.

## Work

1. **A timing script.** Add `npm run speed:years -- --seed S --years N [--place GEOID]`. It prints seconds per year and a world fingerprint per year (SHA-256 of the saved world), so a speedup can prove the world stayed identical.
2. **Profile year 9 on current main** with `node --cpu-prof`. Record the top inclusive and self-time functions in the hand-back. Start with the new work in the later range above: legislative nominees and vote counts, and seating 100 senators. Other known costs, from the year-7 profile:
   - garbage collection, 9.0 s;
   - Congress turnover, 6.6 s (`src/simulation/living-world/congress-turnover.ts`);
   - state legislature turnover, 6.2 s (`src/simulation/nationwide-world/state-legislature-turnover.ts`);
   - copying history lists as they grow, 5.8 s (`appendedList` in `src/simulation/history-index.ts`);
   - `migrateLegacyLegislativeSeats`, 1.8 s (`src/simulation/legislative-office-terms.ts`).
3. **Fix the pattern, not one call site.** Wherever a step scans a whole history list, or every person, every day, replace it with an index (`growingIndex`, `recordById` or `recordsWithFieldValue` from `src/simulation/history-index.ts`) or a per-world cache, or make it run only on the day something relevant changed.
   - Keep every answer and its order the same, and prove it with identical per-year fingerprints for ten years.
   - Build 18's history-list step 2 is approved: hold a day's new records and write each history list once per day.
4. **The speed rule.** Add to `AGENTS.md` under the standing rules, and to the local gate: every change runs `npm run speed:years -- --years 3` against main, and fails if any year is more than 20% slower.
5. **Also fix undated "latest record" reads.** Any code that reads a seat's or a person's newest record during a long step, without a date, can cite a record from after the day it is deciding. Build 26 found and fixed one in `congress-turnover.ts`.

## Target

A tenth game year no slower than twice the first, measured alone on the machine, with fingerprints identical to before.
