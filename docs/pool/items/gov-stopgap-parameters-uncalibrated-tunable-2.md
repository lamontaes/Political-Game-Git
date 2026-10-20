---
id: gov-stopgap-parameters-uncalibrated-tunable-2
title: "Stopgaps in parameters (uncalibrated-tunable): 1 open"
area: gov
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on:
milestone:
after:
size: M
source: "src/core2/data/stopgaps.json, src/core2/data/justice/parameters.json, kind uncalibrated-tunable"
---

**What.** Replace SG-GOV-justice-weights: the TUNABLE weights in src/core2/data/justice/parameters.json (report pulls, evidence strengths, prominence, party and trait weights, the investigate, charge and conviction bars, the defense and plea weights) are first versions. Check them against sourced totals without letting the totals decide any case: put the Public Integrity Section's yearly counts of public-corruption charges and convictions by level of office and the federal plea and trial-conviction shares (Sentencing Commission and BJS) into data/research/justice/corruption-counts-2026.json with citations, scale them to a place's population, and add a calibration test that runs a year of the played world and reports where the charge, plea and conviction counts land against each band. A weight that puts the town outside its band is retuned within its stated spread.

**Rules.** No dice: real rates check yearly totals and never pick one actor's outcome; the engine still decides each case from traits, ties, evidence and the law. Research before building: every band cites publisher, year and unit, and a number from memory is ESTIMATED until fetched. Sliding scales and causes: a bar the data shows as a hard cutoff is a bug to file, not a number to source. Estimate, never UNKNOWN: a weight the data cannot check keeps its TUNABLE tag and its spread, with the reason. One rule, all 56 places: bands scale by population and level of office, and no place is named.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in places drawn from all 56 with seeds the builder did not choose (named in the test output), src/core2/justice-calibration.test.ts reports charges, pleas and convictions per band and the count lands inside each band's spread by corruption case record ids; each weight is SOURCED, ESTIMATED or TUNABLE with its band named, and SG-GOV-justice-weights is resolved in src/core2/data/stopgaps.json.

**Files.** src/core2/data/justice/parameters.json, data/research/justice/corruption-counts-2026.json, src/core2/justice-calibration.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: How much traits, ties, evidence, prominence, party, money and the prosecutor's record weigh at each step from a report to a sentence.

Oct 20 (pool feeder): spec written; this is not the same as research-gov-sourced-parameters (that one folds gov-stopgap-parameters-uncalibrated-tunable and the bribery grade). A single town sees few corruption cases a year, so the test pools several drawn places before comparing to a band.
