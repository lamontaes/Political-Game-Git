# Job 03: remove the 217 dice lines

## Why

The owner's first rule is no dice. The guard (`npm run zero-dice`) blocks new rolls. `scripts/zero-dice-allowlist.json` lists the 217 lines that were already in the code; it is a to-do list, not permission, and it can only shrink. The full list, grouped, is in `refs/dice-217-inventory.md`.

## Lamontae's answers (September 29)

- **Group A, making people and things (72 lines):** looks, names, upbringing, traits, family shape; for example `face-extras.ts` (19) and `people-upbringing.ts` (20). Born, not rolled: looks come from the parents, names from real name records by birth year and place, upbringing from the family's money and home. A seeded pick is allowed only among real options, such as which parent a feature comes from, or which real name among those given that year in that place.
- **Group B, decisions by people, businesses and governments (88 lines):** each becomes the actor deciding from their traits, principles, relationships, money, health, the law in force and the place's conditions, on sliding scales. Real rates check totals.
- **Group C, world events (30 lines):** disasters, deaths, economic eras and shocks, foreign pressure. Causes, not chances:
  - storms and floods follow the place's real hazard record and the season;
  - deaths follow each person's health record;
  - economic eras and price shocks follow a federal law, an energy price change or a war;
  - foreign pressure (oil, grain, foreign demand, arrivals from abroad) starts at a realistic level and moves by shocks caused by events, not a monthly chance.
- **Group D, a state or place named in logic (27 lines):** move the fact into data keyed by place, with one rule for every place.

## Bounded work

1. Do one pull request per group, and split a group by folder if it runs past about 40 lines. Start with group D (the most mechanical), then B, C and A.
2. For each line:
   - replace the draw or fixed share as the group's rule says;
   - keep the world deterministic for a seed;
   - run `npm run zero-dice -- --update` so the line leaves the list;
   - never add a line.
3. Some groups need a fact the game doesn't hold yet, such as a person's health record. Where that's small, add it. Where it isn't, stop and list it under NEEDS LAMONTAE with a recommendation. Don't leave a roll in place quietly.
4. Existing plans to use:
   - **Town employment, the four `laborStatus` rolls and `TOWN_PART_TIME_SHARE`:** job 05 owns them. Leave them to job 05.
   - **Crime:** `crime/producer.ts` and `contract.ts`. A named person commits a crime from their circumstances (money, work, relationships, place), and the arrest goes to prosecutors through `referForProsecution` in `src/simulation/justice/prosecution.ts`. Prosecution's four chances go the same way: the regulator, the prosecutor, the defendant and the judge each decide from their own state.
   - **Town businesses** (`town-businesses.ts:638` and `:685`): a group closes when its members leave or its money runs out, and opens when enough people who share an interest have no group.
   - **Press owners** (`ownership-pack-default.ts`, 9 lines): give each newsroom a money record (staff pay out, subscriptions and ads from its town's households in), and let owners cut, buy or pool from their own books.
   - **Migration** (`migration/review.ts`, 9 lines): a household leaves when its reasons add up (job, rent, family, disaster, schools) on a sliding scale, and goes where its ties and jobs are.

## Checks

- Per pull request: the allowlist count before and after, a 3-year watched world in a random place showing totals still realistic (births, deaths, moves, crime, business openings), and the speed budget.
- The hand-back lists every removed line, with the file and the new rule in plain words.
