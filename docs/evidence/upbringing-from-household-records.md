# Records-based upbringing for summarized lives: watched runs

HOLD: needs CTO design call. On main every adult with a summarized earlier life reads the same sociability, conflict and risk, so everyone gets the opening goal "learning". With this proposal the traits and goals spread across all three places, lives-barebones step 4a passes again, and lasting-favor now gives the right counts.

## What the three places show

### Newfields, New Hampshire (seed records-a, place key 3351300, 10232 adults)

- Goal mix before: {'learning': 10232}; after: {'connection': 1558, 'learning': 5383, 'privacy': 3291}
- sociability before: 0: 10232; after: -1: 3291, 0: 5383, 1: 1558
- conflict before: 0: 10232; after: -1: 1813, 0: 5570, 1: 2849
- risk before: 0: 10232; after: -1: 2708, 0: 2349, 1: 5175

### Aua, American Samoa (seed records-b, place key territory:AS:aua, 10237 adults)

- Goal mix before: {'learning': 10237}; after: {'privacy': 3846, 'connection': 1385, 'learning': 5006}
- sociability before: 0: 10237; after: -1: 3846, 0: 5006, 1: 1385
- conflict before: 0: 10237; after: -1: 2194, 0: 5514, 1: 2529
- risk before: 0: 10237; after: -1: 3318, 0: 2243, 1: 4676

### Andover, Massachusetts (seed records-c, place key 2501430, 10262 adults)

- Goal mix before: {'learning': 10262}; after: {'learning': 4320, 'connection': 1158, 'privacy': 4784}
- sociability before: 0: 10262; after: -1: 4784, 0: 4320, 1: 1158
- conflict before: 0: 10262; after: -1: 2972, 0: 5213, 1: 2077
- risk before: 0: 10262; after: -1: 4466, 0: 3460, 1: 2336

## The tests that stayed red, and why

**lives-barebones step 4a (now passes).** The fixture's worker lives with a spouse, and the first version counted that spouse as the worker's childhood caregiver. Two caregivers read as a well-watched childhood, which gave the worker a cautious risk of -1, and a cautious worker does not look for a job elsewhere. Childhood caregivers now come only from recorded parents or the saved family pattern, never from the household an adult lives in today. With that, the worker's risk is 0 and the offer is made.

**lasting-favor (now answers correctly, still times out).** Before, every neighbor said yes to every ask (80 of 80) because the reliability score added the raw count of caregivers (1 or 2), which is never negative, so everyone read as very reliable. Reliability now centers on about one and a quarter caregivers per child. In Billings, Montana the counts are 70 yes before any favor, 80 after a life-changing favor and 70 after a slight one, which is what the test means. The test still fails its own 30 second limit because the 8 neighbors take 539 seconds. The cost is not the upbringing read, which takes under a millisecond. These neighbors are not in the player's contact list, so their traits are seeded the first time a decision needs them, and each seeding checks the whole world of about 10,000 people (1.2 seconds, 2.9 seconds on a fresh copy). The test answers each ask on a fresh copy, so it pays that for every ask. This is a world-size and seeding cost that exists on main, not something #3049 adds. A fix would seed once per person per world copy, or make the integrity check incremental; both are outside this proposal, so I left them.

**reaching-out-goals (still red).** In that scenario's six lives, the people who ring are the player's kin. Their family records hold almost nothing. There are no siblings in the saved family pattern and no congregation. The household pay reads "unrecorded pay" with no estimate, and only the parent count differs. So the sociability lean works out to exactly zero for everyone and everyone keeps the goal "learning". The test needs someone who rings to be pursuing connection, which needs a real difference among these people. This is a design question for the CTO: when a person's siblings and pay are unrecorded, should the starting value come from the national distribution with a per-world spread (the estimate rule), seeded only among real options? I did not add that, because it is the kind of seeded pick the owner limited to births.

## What the proposal does

Method: three places drawn at random from all 56, each world opened at age 30 with the summarized earlier life, adults only. Before is main; after is this branch. Reproduce with `UPBRINGING_EVIDENCE_OUT=out.json npx vitest run src/simulation/people-upbringing-records.test.ts`.

`recordedLeanFrom` (src/simulation/people-upbringing.ts) adds smooth, unrounded leans to the person's upbringing. `upbringingCoreValueFrom` adds the lean only where no recorded schooling, caregiving or first job speaks to that trait, and still rounds once at the end. Reliability now centers caregivers per child. No dice, no named place. Weights and offsets are PLACEHOLDERS tuned so the three traits spread in these worlds.

Inputs: siblings, congregation count, latest household money band, childhood caregivers per child, school-year moves and a parent's death in childhood.

## Missing links for the design call

- No county education share is in the world data, so schooling is not read from it.
- Congregation count and school-year moves are almost always zero in summarized worlds, so siblings, household pay and caregivers per child carry the spread.
- Still red on main and unrelated to this change: people-traits (A138) and upbringing-read-reuse.
