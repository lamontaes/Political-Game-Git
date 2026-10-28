---
id: gov-open-mayor-seat-draws-nobody
title: "An open mayor's seat in Las Marías, Puerto Rico drew no candidate: the open-seat pull leaves its closest resident 0.61 short"
area: gov
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Las Marías, Puerto Rico (place key 7243788, played-world seed af75ac5bc0432b7543b5e8329d08609652a33621, place seed a5ba2b1aa09538020871ce98ccb97cba0b21cdf24fcf9ead2755b323b6d92da0), the mayor person_d0977204ea898639 decided on 2025-06-12 not to stand again (decision contest:seat:municipio:72083:executive:0:2025-11-04:person_d0977204ea898639, stand again -0.56). All 190 residents asked weighed it as an open seat, and none ran: the closest, person_efddf3f89b58dd7c, was 0.61 short. So M0-13's 'every race has someone on the ballot' reads 1 of 13 races empty. Raising candidacyOpenSeatWeight from 0.5 to 1.2 fills it with one candidate, but candidacy.test.ts holds an open seat with nobody running yet under 2 percent of a town's adults, and at 1.2 it draws 124 of 973. Two causes to read first: the countywide reach term (-0.5) applies to a municipio's own mayor although the municipio is the town, and Puerto Rico's mayoral races are partisan while the party backing term reaches only state and federal races.

**Rules.** No dice: who runs comes from their record, the seat and the parties' records, never a roll. One rule, all 56 places: whatever applies to a municipio applies to every county-equivalent that is also its town, from data. Never loosen candidacy.test.ts's bound; recalibrate against it.

**Done when.** In buildBenchWorld in Las Marías, Puerto Rico (place key 7243788, played-world seed af75ac5bc0432b7543b5e8329d08609652a33621), M0-13's 'every race has someone on the ballot' is alive with the mayor's filing named by record id, candidacy.test.ts passes unchanged, and two more drawn places show the same check alive or unobserved with their seeds named.

**Files.** src/core2/modules/candidacy.ts, src/core2/data/candidacy/parameters.json

**Notes.** TODO

No longer reproduces on main (Claude worker, Oct 27). `GOLDEN_PATH_SEED=af75ac5bc0432b7543b5e8329d08609652a33621 GOLDEN_PATH_PLACE_KEY=7243788 node --max-old-space-size=6000 --expose-gc --import tsx --test-reporter=spec tests/golden-path/played-world.node-test.ts` (Las Marías, Puerto Rico): 21 passed, 0 failed; "a named challenger runs: 4 named challengers in 13 races" and "every race has someone on the ballot: all 13 races had someone on the ballot". `src/core2/candidacy.test.ts` passes unchanged. The same two checks were also alive on fresh seeds huntx1 (Enigma, Georgia) and huntx2 (Brookings, South Dakota). The open-seat weights were not changed by me, so something merged after the item was filed fills the mayor's seat; I did not find which. Left open for the CTO or a merger to close as done-by-main; no code change was needed.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built (done by main).
