---
id: laws-reach-b-college-tuition
title: "The higher-education line sets the tuition college students' households pay, read by household spending"
area: laws
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: split from laws-reach-b-schools-preschool-tuition by pool feeder Oct 20
---

**What.** The `higherEducation` line in src/core2/data/laws/reach-group-b.json has effect `college-support-level` on 18-to-24-year-olds and nothing charges or changes tuition (stopgap SG-GOV-REACH-B-tuition). Add the smallest college layer the golden path needs: a person aged 18 to 24 is enrolled in a college organization when their household income, grades and traits make it their choice (the enrollment rate by age and income is a check on totals, never a roll), and the household pays a monthly tuition contract to that college, like the private-school tuition contract in src/core2/opening-private-tuition.ts. The state's higher-education support level lowers the in-state tuition by its share; a cut raises it.

**Rules.** An effect is a read: the tuition contract must read the support level in force when it bills. No dice: enrollment follows the person's records (income, schooling, traits) and the tuition follows the law, with real enrollment rates only checking totals. One model, two tiers: counted 18-to-24-year-olds enroll and pay by the same rule as full ones times their count. Estimate, never UNKNOWN: average tuition carries its NCES source and a per-world spread. One rule, all 56 places: the state's public-college tuition is place data. The chain is the acceptance: the support line, tuition, student, household cash and the director's line.

**Done when.** In a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body), a named 19-year-old is enrolled and their household pays a tuition contract, a cut to the higher-education line raises that tuition from its effective date by journal record id, a counted group shows the same, the journal balances, and SG-GOV-REACH-B-tuition is closed; src/core2/law-reach-group-b.test.ts proves it.

**Files.** src/core2/data/laws/reach-group-b.json, src/core2/law-reach/group-b-money.ts, src/core2/opening-private-tuition.ts, src/core2/data/stopgaps.json, src/core2/law-reach-group-b.test.ts

**Notes.** Part 2 of 2 of laws-reach-b-schools-preschool-tuition. The core has no college enrollment today; this item adds only the enrollment and tuition the law needs, not a campus simulation.
