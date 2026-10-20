---
id: people-stopgap-births-plan-estimated-record
title: "Stopgaps in births-plan (estimated-record): 1 open"
area: people
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/births-plan.ts, kind estimated-record"
claimed-at: 
---

**What.** Give every opening couple a recorded partnership start date from the opening's own partnership model, and delete the estimate in births-plan.ts. Today population.ts writes `startedAt` as today minus (the younger adult's age minus marriageReferenceAge), floored at zero, so any couple whose younger partner is at or under the reference age starts on the opening day, and `partnershipStart` in births-plan.ts then guesses one birth-spacing interval before the first child or the mother's union age. Instead set the start in population.ts from the place's own marital data in opening-partnership.json (the ACS first-marriage and marital-status shares by age already used to decide who is partnered): the couple's duration is the age at first union for the elder partner's cohort capped by the first child's birth (the plan's eldest child) and never later than the day before the opening. The births engine then reads the recorded start, and the SG-PW8-partnership-start branch is deleted.

**Rules.** Replace, never layer: the estimate branch of partnershipStart and its stopgap marker are deleted once every partner link carries its own date. An effect is a read, not a record: the births engine's pacing (births-plan.ts `since`) reads the recorded start. No dice: the date follows the couple's ages, children and the place's marital data; seeded generation of the opening past is allowed because it stays consistent with each person's record. One rule, all 56 places: the marital shares come from the place's data with the state or national fallback, nothing names a place. Estimate, never UNKNOWN: a date from the average of the data is marked ESTIMATED with its source and spread.

**Done when.** In a one-year run of the played world (buildBenchWorld, a place drawn from all 56 with a seed the builder did not choose, both named in the PR body) no couple's partner link has its start on the opening day unless the couple really met within the year, every couple with children started before their eldest child's birth, and the births engine's pacing record for a named couple cites the recorded start id. Tests in src/core2/births-plan.test.ts and src/core2/opening-partnership.test.ts prove it, and SG-PW8-partnership-start is marked resolved in stopgaps.json.

**Files.** src/core2/population.ts, src/core2/births-plan.ts, src/core2/opening-partnership.ts, src/core2/data/opening-partnership.json, src/core2/data/stopgaps.json, src/core2/births-plan.test.ts

**Notes.** First row: When a couple has no dated partner fact (or it is dated the opening day), the partnership start is estimated: one birth-spacing interval before their first child, else the mother reaching the usual age of a first union.

Oct 20 (pool feeder): spec written; the cause is population.ts line 407 (startedAt = yearsBefore(today, max(0, youngest adult age - marriageReferenceAge))), so couples with a young partner collapse to the opening day; the stopgap row's "replacement" (partnerships carry their own recorded start) is a small change in the population builder, not a new engine. A "first-union age" cohort figure may need one sourced row (NSFG or ACS median age at first marriage) in the parameter table.
