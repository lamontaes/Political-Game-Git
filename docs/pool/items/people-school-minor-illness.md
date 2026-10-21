---
id: people-school-minor-illness
title: "Children miss school for minor illness, not only serious onsets"
area: people
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Played towns show children attending 99 percent of school days or more (Monroe, Oregon 99.8 percent, Guam 99.3 percent) against NCES average daily non-attendance of 6.5 to 10 percent, because the child's reason to stay home reads careNeedOf, which is zero except for a serious onset or a held chronic condition. The health module has no passing illness (colds, flu, injury) that raises a person's care need for days. Add short episodes to the health module from the person's age, season and household (a sick sibling) so a child's care need rises for a few days, read by school and work absence alike.

**Rules.** No dice: an episode starts from recorded causes (age, season, a sick household member, immunity from earlier episodes), never a monthly chance on one person; real incidence checks totals. One model, two tiers: counted children carry the same episodes times their count.

**Done when.** In a one-year run of the played world (buildBenchWorld, a place drawn from all 56, seed named), the school-age share of days attended falls between 90 and 93.5 percent pooled over at least three drawn places, shown by school attendance records and the episodes that kept children home by record id, in a test beside src/core2/school.test.ts.

**Files.** src/core2/modules/health.ts,src/core2/modules/school.ts,src/core2/data/parameters.json

**Notes.** TODO
