---
id: research-core-parameters-sourced-parameters
title: "Research: sourced parameters for the core parameter tables (distance, time, past, speech, corruption, moves)"
area: core
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "collapsed Oct 19, 2026 from core-stopgap-parameters-estimated-behavior, core-stopgap-parameters-estimated-data, core-stopgap-parameters-uncalibrated-time-plan, core-stopgap-parameters-uncalibrated-tunable-2, core-stopgap-parameters-uncalibrated-tunable-3, core-stopgap-parameters-uncalibrated-tunable-4"
claimed-at: 
---

**What.** Apply the sourced rows in docs/research/pool-feeder-oct20/research-core-parameters-sourced-parameters.md to the parameter table(s) and data files for sourced parameters for the core parameter tables (distance, time, past, speech, corruption, moves). Each row already carries a value, a low and high spread, a tag (SOURCED or ESTIMATED) and a citation, so the builder enters them, adds a reader for each research file, and resolves these stopgap rows in src/core2/data/stopgaps.json: SG-P15-distance-by-place, SG-CORE-past-undated-law-age, SG-P8-work-time-reserve, SG-P15-speech-reception, SG-P15-corruption-weights, SG-P15-moves-weights. Rows tagged mechanic name a change the area's builder makes to read the sourced inputs; build the simplest version and register what remains.

Rows:

- `SG-P15-distance-by-place` in src/core2/data/parameters.json: How far a relative lives changes how often they are visited only by whether they are in the household's county (full pull) or elsewhere in the state (0.39 of it, from Pew 2005 daily contact by same or different town). Replacement: Travel time between the two people's places once relatives carry a place, from Census Gazetteer place centroids, with visits ...
- `SG-CORE-past-undated-law-age` in src/core2/data/past/parameters.json: A law the research records only as in force at the opening (a state's policy answers, a law carried back to the start date) is given an enactment date between one and twenty years before day one, fixed by the world's seed. Replacement: Enactment years from the research for each policy answer (NCSL and state code histories), read by the law histo...
- `SG-P8-work-time-reserve` in src/core2/data/parameters.json: Reserves guessed sleep hours and gives waking recovery a separate guessed duration. Replacement: ATUS age/employment primary activity totals and participant durations using compatible crosswalks and observed individual spreads. (parameter rows: src/core2/data/parameters.json:workSleepReserveHours, src/core2/data/parameters.json:workWakingRecoveryHours)
- `SG-P15-speech-reception` in src/core2/data/speech/parameters.json: How much a speech moves listeners and who retells it; retelling reaches only the listener's household. Replacement: Reception calibrated to persuasion experiments by audience and message (Coppock 2023), retelling through friends and the news module, and memory by age (M4-04). (parameter rows: src/core2/data/speech/parameters.json:speechImpulse, src...
- `SG-P15-corruption-weights` in src/core2/data/corruption/parameters.json: How much traits, money pressure and ties weigh in offering, taking and telling about a bribe. Replacement: Weights checked against bribery incidence surveys and public-corruption case counts by office (DOJ Public Integrity Section reports), with audits and the news surfacing records. (parameter rows: src/core2/data/corruption/parameters.json:...
- `SG-P15-moves-weights` in src/core2/data/moves/parameters.json: How strongly each tie holds a person in town and each event pushes them out, and the scale that turns the ACS rate for their age into a monthly pull. Replacement: Weights checked against ACS departures by age and tenure across drawn places in the M1-09 year run, and against the CPS reasons for moving. (parameter rows: src/core2/data/moves/parameters.js...

**Rules.** Research before building: the sourced figures calibrate the totals the proof reports and never decide what one person does. Estimate, never UNKNOWN: any value without a measure keeps its ESTIMATED tag, source and spread. One rule, all 56 places: place values live in data keyed by place code, never named in logic, and the proof draws a random place. No dice: no seeded roll or fixed percentage picks an actor's outcome; causes and records do.

**Done when.** Each row is SOURCED or ESTIMATED in its parameter table with a citation and a spread, the stopgap rows above are resolved in src/core2/data/stopgaps.json (or kept with a reason), the research-data reader guard and the tripwire test pass, and a one-year played world (buildBenchWorld, a place drawn from all 56, seed named) reports each band and where the town landed against it.

**Files.** src/core2/data/corruption/parameters.json, src/core2/data/moves/parameters.json, src/core2/data/parameters.json, src/core2/data/past/parameters.json, src/core2/data/speech/parameters.json, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/core/

**Notes.** Folded from: core-stopgap-parameters-estimated-behavior, core-stopgap-parameters-estimated-data, core-stopgap-parameters-uncalibrated-time-plan, core-stopgap-parameters-uncalibrated-tunable-2, core-stopgap-parameters-uncalibrated-tunable-3, core-stopgap-parameters-uncalibrated-tunable-4. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.

Oct 20 (pool feeder): research done in docs/research/pool-feeder-oct20/research-core-parameters-sourced-parameters.md (6 rows: 2 sourced, 4 estimated, 0 mechanic).
