---
id: jobs-entry-requirement-by-occupation
title: "Each occupation's typical entry requirement (credential, experience) from BLS Employment Projections ranks first-job applicants"
area: world
kind: research
priority: 2
size: M
status: blocked
claimed-by:
pr:
blocked-on: spec: the item text is an empty TODO shell; the done-when must be written before it can be built (pool-todo-shells-need-spec)
after: jobs-no-openings-in-small-towns
source: added with npm run pool -- add
---

**What.** An opening ranks applicants by experience in its occupation, so a first-time job seeker, including the 18-year-old the player starts as, loses to every applicant with a work history for every opening. Real occupations differ: many ask for no prior experience and no credential. Read each occupation's typical entry requirement from the BLS Employment Projections education and experience table, tag it SOURCED, and let an opening that asks for no experience rank applicants by reliability and referral only. The player would notice that a first job can be won without luck, and so can every other first-time seeker.

**Rules.** No dice: the winner follows the applicant's fit and the opening's requirement, never a roll. One model, two tiers: counted applicants and full people are ranked by the same rule. Research before building: the requirement for each occupation cites its table row, and real rates check totals and never pick one hire. One rule, all 56 places: occupations are data, never a named place.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, a seed the builder did not choose), an opening for a no-experience occupation goes to the applicant ranked by reliability and referral, shown by the position id and the hire's job id, and a jobless 18-year-old player gets an offer within 12 weeks whenever such an opening is open in town, tested in src/core2/jobs-player-offers.test.ts.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/parameters.json, src/core2/data/jobs/

**Notes.** Split from world-player-jobless-no-offers (Oct 19). That item measured four towns: with few openings and about 32 applicants each, the experience term alone decides, and the player has none. It also waits on jobs-no-openings-in-small-towns, because a town that opens four positions a year gives no ranking rule an offer to make.
