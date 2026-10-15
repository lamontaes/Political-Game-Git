# Job 13: every policy topic has laws a government can pass

## Why

Lamontae asked on September 29 why rail is only federal. The catalog has 187 policy topics, but only 80 have any law question a legislature, council or Congress can act on. The other 107 have none. The list, by area, is in `refs/topics-without-laws.txt`.

For example, the state topic "Rail: freight and intercity passenger rail, crossings and corridors" exists, but no state can pass a rail law. Only Congress's "Expand passenger rail" exists. Airports and ports, water and sewer, zoning, building codes, ethics and disclosure, prisons, unemployment insurance, public health, forestry and cybersecurity are the same.

The breadth of what governments can do is the backbone of the game (owner rule: never narrow the legislation backbone).

## Work, by area, one pull request per area

For each topic without a law question:

1. **Research real bills first.** Find what state legislatures, city and county councils and Congress actually passed or seriously debated from 2020 to 2026 on the topic. Use NCSL, state legislature sites, Congress.gov, and city council records. Pick the 2 to 4 recurring questions that real governments decide.

   For state rail, that likely means:
   - funding state-supported Amtrak corridors (routes under 750 miles, which states pay for under PRIIA section 209);
   - a high-speed rail authority and bond;
   - short-line freight rail tax credits;
   - grade-crossing safety money.

   Local rail likely means:
   - a sales tax for light rail or commuter rail, put to voters;
   - transit-oriented zoning near stations.

2. **Add each question at the right level** (federal, state or local; some are all three), following the catalog's existing pattern in `src/simulation/policy-pack-*.ts`. Each question gets:
   - bill terms: amounts, phase-in and sunset, written by the sponsor from their views;
   - its starting law in every place, from `data/research/laws/starting-law-2026.json`'s approach;
   - a sized effect path, so it counts as wired (`src/simulation/governing/law-effect-paths.ts`) and moves money, people or places, with a watched-world test as job 01 does.
3. **Officeholders' principles must cover the new questions**, so members file and vote on them.
4. The unwired-laws guard must stay at zero unwired questions: every new question arrives wired.

## Checks

- Per area: the questions added, the real bills they mirror (with links), and a 5-year watched world in a random place showing at least one of the new laws filed, voted and, where it passed, moving something.
- The speed budget applies.
