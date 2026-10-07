# Records-based upbringing for summarized lives: watched runs

HOLD: needs CTO design call. On main every adult with a summarized earlier life reads the same sociability, conflict and risk, so everyone gets the opening goal "learning". With this proposal the traits and goals spread across all three places, as shown below.

On main every adult reads sociability 0, conflict 0 and risk 0, and so every adult gets the opening goal "learning".

## Newfields, New Hampshire (seed records-a, place key 3351300, 10232 adults)

- Goal mix before: {'learning': 10232}; after: {'connection': 1558, 'learning': 5383, 'privacy': 3291}
- sociability before: 0: 10232; after: -1: 3291, 0: 5383, 1: 1558
- conflict before: 0: 10232; after: -1: 1732, 0: 5555, 1: 2945
- risk before: 0: 10232; after: -1: 2531, 0: 6307, 1: 1394

## Aua, American Samoa (seed records-b, place key territory:AS:aua, 10237 adults)

- Goal mix before: {'learning': 10237}; after: {'privacy': 3846, 'connection': 1385, 'learning': 5006}
- sociability before: 0: 10237; after: -1: 3846, 0: 5006, 1: 1385
- conflict before: 0: 10237; after: -1: 2038, 0: 5557, 1: 2642
- risk before: 0: 10237; after: -1: 3049, 0: 5429, 1: 1759

## Andover, Massachusetts (seed records-c, place key 2501430, 10262 adults)

- Goal mix before: {'learning': 10262}; after: {'learning': 4320, 'connection': 1158, 'privacy': 4784}
- sociability before: 0: 10262; after: -1: 4784, 0: 4320, 1: 1158
- conflict before: 0: 10262; after: -1: 2843, 0: 5154, 1: 2265
- risk before: 0: 10262; after: -1: 4149, 0: 5269, 1: 844

## What the proposal does

Method: three places drawn at random from all 56, each world opened at age 30 with the summarized earlier life, adults only. Before is main; after is this branch. Reproduce with `UPBRINGING_EVIDENCE_OUT=out.json npx vitest run src/simulation/people-upbringing-records.test.ts`.

On main the cause is that `readUpbringing` returns no schooling and no first job for a summarized life.

`recordedLeanFrom` (src/simulation/people-upbringing.ts) adds smooth, unrounded leans to `PersonUpbringing.recordedLean`. `upbringingCoreValueFrom` adds the lean only where no recorded schooling, caregiving or first job speaks to that trait, and still rounds once at the end. No dice, no named place. Weights and offsets are PLACEHOLDERS tuned so the three traits center near zero in these worlds.

Inputs: siblings, congregation count, latest household money band, caregivers per child, school-year-move disruption and a parent's death in childhood.

## Missing links for the design call

- No county education share is in the world data, so schooling is not yet read from it; the lean uses household records only.
- Congregation count and school-year moves are almost always zero in summarized worlds (10,217 of 10,232 in Newfields have no congregation), so in practice siblings, household pay and caregivers per child carry the spread.
- Still red after this change: lasting-favor (80 yes before and after) and reaching-out-goals (0 connection callers). tests/lives-barebones.test.ts step 4a goes red (no recorded employer offer), a knock-on of the changed traits. people-traits (A138) and upbringing-read-reuse were already red on main.
