---
id: people-citizenship-record
title: "People and counted residents have a citizenship record that the immigration-enforcement law reads"
area: people
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "split from laws-stopgap-reach-group-a-missing-record, Oct 16"
---

**What.** Partnering with federal immigration enforcement reaches an estimated count of noncitizen adults by the national share, because people have no citizenship record (SG-GOV-REACH-A-citizenship). Give full people and counted groups a nativity and citizenship fact drawn at generation from the place's own American Community Survey shares (table B05003 by place, built the way `src/core2/nativity.ts` builds officials' nativity from the state table), so the law reaches the named noncitizens and each counted group's noncitizen count. A person's record agrees with their group's.

**Rules.** One model, two tiers: a counted group is read by the same rule as a full person times its count, and a filled-in person matches the group's record. One rule, all 56 places: the shares are place data. No dice: the law decides reach; the seeded draw only decides who exists. Estimate, never UNKNOWN: a place the survey omits takes its state's share, marked ESTIMATED.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) the enforcement-partnership law reaches a named noncitizen resident by person record id and a counted group by group id, the reach total matches the place's survey share within its spread, and SG-GOV-REACH-A-citizenship is resolved; the test in src/core2/law-reach-group-a.test.ts passes.

**Files.** src/core2/nativity.ts, src/core2/data/place-citizenship-2024.json, src/core2/law-reach/group-a-records.ts, src/core2/data/stopgaps.json

**Notes.** Split from laws-stopgap-reach-group-a-missing-record. Officials already carry a nativity fact (PR #4504, identity:nativity); residents do not.
