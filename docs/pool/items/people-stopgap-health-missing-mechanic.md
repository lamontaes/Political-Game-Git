---
id: people-stopgap-health-missing-mechanic
title: "Stopgaps in health (missing-mechanic): 1 open"
area: people
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/health.json, kind missing-mechanic"
after: people-health-conditions-begin,people-health-injury
---

**What.** This is the roll-up for the health stopgap SG-P10-health-minimal-port: core2 runs only the opening chronic conditions, serious-illness onset and the mortality rule, while conditions beginning during life, coverage, poverty onset causes, injuries and births are absent. Births already run in births-plan.ts, and coverage, premiums and medical bills are separate pool items (people-coverage-record-monthly-pass, people-coverage-counted, world-medical-spending-categories, missing-engine-health-coverage-and-medical-spending). The remaining mechanics are split into people-health-conditions-begin and people-health-injury. Nothing is built under this id; when both parts are done the row is marked resolved.

**Rules.** Never close a row by deleting it: SG-P10-health-minimal-port is marked resolved with what replaced it. Replace, never layer: the minimal-port note in health.json is deleted when both parts land. Build only what the golden path needs: a full old-core health port is not carried over. An effect is a read, not a record: each part is proved by another engine reading what it wrote.

**Done when.** Both parts are done and a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose) shows conditions beginning and injuries happening, each read by the jobs or mortality engine by record id, proved by src/core2/health-onset.test.ts and src/core2/health-injury.test.ts, with the stopgap row resolved in src/core2/data/stopgaps.json.

**Files.** src/core2/modules/health.ts, src/core2/data/health.json, src/core2/data/stopgaps.json

**Notes.** First row: Only the opening chronic conditions, the serious-illness onset and the death of the Ruling 29/38/39 mortality rule run in core2; conditions beginning during life, coverage, poverty onset causes, injuries and births are a

Oct 20 (pool feeder): spec written; the "no core2 health engine" blocker is stale: health.ts exists with condition holdings, onset and mortality; the missing pieces were split into two bounded items.
