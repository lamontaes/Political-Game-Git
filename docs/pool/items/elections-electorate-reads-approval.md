---
id: elections-electorate-reads-approval
title: "The race engine reads presidential approval for the president's party instead of the bare economy term"
area: elections
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
after: gov-president-approval-record
blocked-on:
milestone:
source: split from elections-stopgap-electorate-inputs-missing-data by pool feeder Oct 20
---

**What.** Change raceConditions in src/core2/electorate-inputs.ts so the national mood that moves every voter's choice for the president's party comes from the latest president-approval row, with the economy and the midterm penalty entering through that row's reasons and the measured link between approval and the president's party's vote (research: Gallup approval against midterm seat and vote change; the existing midterm penalty parameter in data/electorate/parameters.json is the estimate it replaces). Delete the economy-only path and the api.stopgap call, and keep the national field's shape so the voters of every race read it as before.

**Rules.** Replace, never layer: nationalEconomyChange stops feeding the mood directly and the stopgap marker is deleted. No dice: the effect on a race follows the approval share and the measured slope, never a roll. Research before building: the approval-to-vote slope is SOURCED or ESTIMATED with its spread in the parameter table. Sliding scales and causes: a small approval change moves the result a few points (owner, Oct 20 on vote swings). An effect is a read, not a record: the race engines (town, world races, ballot counts) read the national mood on election day.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose across an election, a president's party candidate runs worse in the same race with a lower approval row than with a higher one, shown by the approval row id and the race result record id; src/core2/electorate-inputs.test.ts proves it and SG-GOV-electorate-approval is resolved in src/core2/data/stopgaps.json.

**Files.** src/core2/electorate-inputs.ts, src/core2/data/electorate/parameters.json, src/core2/electorate-inputs.test.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): part 2 of 2 of elections-stopgap-electorate-inputs-missing-data.
