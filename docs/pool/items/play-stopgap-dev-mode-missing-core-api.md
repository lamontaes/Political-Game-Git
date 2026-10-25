---
id: play-stopgap-dev-mode-missing-core-api
title: "Stopgaps in dev-mode (missing-core-api): 1 open"
area: play
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/bench/dev-mode.ts, kind missing-core-api"
after:
claimed-at:
---

**What.** Dev mode's `reach(lawId)` in src/bench/dev-mode.ts scans the raw tables of the laws module and the two law-reach stores for rows that carry the law's id and guesses full and counted people from whichever field it finds, so a law effect that leaves no row naming it is invisible. Add one core function, `lawReachCount(api, lawId)` in src/core2/law-reach/host.ts next to `reachOn` and `reachedBy`, that returns the reach of one law across both tiers: reach A rows (named persons, organizations, seats, and counted groups through their `count`), reach B `people` rows and its `groups` rows (`reached` of `of`), and the laws module's `raises` (a full job's holder, or a counted job's wage-flow headcount). It returns record ids, the set of full people, and a counted head count with the group total it is out of. Then make `DevMode.reach` call it and delete the table-scanning loop and the stopgap marker.

**Rules.** Replace, never layer: the scanning loop in dev-mode.ts is deleted when the core function replaces it. One model, two tiers: the count sums full people and counted groups by the same reach records, never full people only. An effect is a read, not a record: a law with a handler of none shows reach zero, which is the defect laws-enacted-law-reaches-nobody files, not something dev mode hides. Ask why: each counted number names the reach record that produced it. Dev mode's Trace is the ultimate trace: the returned record ids are what Trace clicks through.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), enact a wage-floor law through `DevMode.setLaw` and read `DevMode.reach`: the result lists the reach-record and raise-record ids, a full-person count and a counted count with its group total that match the laws module's raises and the counted job's wage flow, and src/bench/dev-mode.test.ts and a new src/core2/law-reach/law-reach-count.test.ts prove it and the row is resolved in stopgaps.json.

**Files.** src/core2/law-reach/host.ts, src/bench/dev-mode.ts, src/bench/dev-mode.test.ts, src/core2/law-reach/law-reach-count.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: Dev mode's count of who a law reached reads only the law-effects, law-reach and law raise records that name the law: full people by id, counted people where a record names one or carries a count. A law's effect that leav

Oct 20 (pool feeder): spec written; the count function the row waits for does not exist, but every record it needs does (reach A `count`, reach B `groups`, laws `raises`), so this is buildable now as a read over them. Related: laws-enacted-law-reaches-nobody.
