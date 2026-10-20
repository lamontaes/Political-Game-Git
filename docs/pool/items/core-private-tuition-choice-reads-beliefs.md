---
id: core-private-tuition-choice-reads-beliefs
title: "A family's faith, its views on schools, the schools nearby and its child's needs enter the yearly private-school choice"
area: people
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after: core-private-tuition-yearly-reenrollment
blocked-on:
milestone:
source: Split from core-stopgap-opening-private-tuition-aggregate-spending by pool feeder Oct 20; implements the owner ruling of Oct 20 (OWNER-DECISIONS.md, private school); supersedes the question in people-school-choice-views-and-nearby
---

**What.** The owner ruled on Oct 20 that beliefs, the schools nearby and a child's needs decide which families choose private school, not money alone. Extend the August enrollment pass that core-private-tuition-yearly-reenrollment adds so each family with children aged 5 to 17 gets a sliding enrollment score instead of a pure cash-per-child rank: affordability (cash per child and household income against the tuition `openingPrivateTuitionAnnualUsd`), faith fit (the adults' recorded faith affiliation against the private school's affiliation, which each generated private school carries from the NCES Private School Survey religious and secular shares), the family's own view on schools (a views-module stance read with `viewOn`), the distance and standing of the public school the child is assigned to in `opening-public-schools.ts` against the private options in town, and the child's own needs (`careNeedOf` in `src/core2/modules/health.ts`). A family enrolls when its score passes what the tuition costs it, and the NCES private share of the town's school-age children checks the town total without ever choosing a family.

**Rules.** No dice: a family's choice is its score from records, never a roll or a quota cut. Sliding scales and causes: faith, views, distance and need each move the score a little at a time, with no threshold that flips a family. One rule, all 56 places: the schools, faiths and distances come from the place's records, and nothing names a state. An effect is a read, not a record: the enrollment must read the faith, views, health and school records of the family, and the finance engine reads the resulting tuition contract. One model, two tiers: a counted family is scored by the same rule times its weight. No hand-written player text: any line a person says about their child's school comes from the English engine. Estimate, never UNKNOWN: a family with no recorded faith or view scores on the place average, marked ESTIMATED with its source.

**Done when.** In a two-year run of buildBenchWorld in a drawn place from all 56 with at least one private school (place and seed named in the PR body, a seed the builder did not choose), two families with equal cash per child but different recorded faith or a child with a recorded care need enroll differently in August, each by its finance contract record id with the score's reasons recorded, the town's private share of school-age children stays within the NCES figure and spread, the cash journal balances, and src/core2/private-tuition-choice.test.ts proves it.

**Files.** src/core2/modules/school.ts, src/core2/opening-private-tuition.ts, src/core2/data/opening-private-tuition.json, src/core2/data/parameters.json, src/core2/private-tuition-choice.test.ts

**Notes.** Split from core-stopgap-opening-private-tuition-aggregate-spending by pool feeder Oct 20; implements the owner ruling of Oct 20 (OWNER-DECISIONS.md, private school); supersedes the question in people-school-choice-views-and-nearby.
