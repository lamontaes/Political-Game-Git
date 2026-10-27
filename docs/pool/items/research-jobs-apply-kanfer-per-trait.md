---
id: research-jobs-apply-kanfer-per-trait
title: "Job applications weigh temperament at Kanfer et al.'s per-trait job-search sizes"
area: people
kind: research
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The jobs.apply decision keeps the general trait weight of 1 because only the abstract of Kanfer, Wanberg and Kantrowitz 2001 (Journal of Applied Psychology 86(5), a meta-analysis of job search and employment) was read, and it gives the range of correlations across all antecedents, not each trait's. The paper's tables give each Big Five trait's population correlation with job search behavior. Read them from the paper, record the rows in data/research/trait-effect-sizes.json with quotes, and fit the weight to them on played years.

**Rules.** Research calibrates; it never decides one seeker's outcome. Quote the table cells from a fetched copy of the paper. One rule, all 56 places: fit on places drawn from all 56, seeds named.

**Done when.** data/research/trait-effect-sizes.json carries jobs.apply rows for each trait with the quoted table cells; traitWeightJobsApply is ESTIMATED from them with its spread; in two drawn places' played years, seeds named, the net odds of applying between the thirds of lean sit within a factor of 1.5 of the study's; the jobs.apply gap row is removed and the money trait test passes.

**Files.** data/research/trait-effect-sizes.json, src/core2/data/parameters.json, data/content/trait-decision-gaps.json, src/core2/money-traits.traits.test.ts

**Notes.** Found Oct 26 by the traits lead's research helper, from the author-hosted copy (https://carlsonschool.umn.edu/sites/carlsonschool.umn.edu/files/2018-10/kanfer_wanberg_kantrowitz_2001.pdf), Table 2, p. 845, job search behavior, corrected correlation rc with k, N and 95% interval: extraversion .46 (k 7, N 1,733, .43 to .50; observed r .34); conscientiousness .38 (k 11, N 5,433, .36 to .40; r .30); openness .27 (k 4, N 1,099, .21 to .32; r .19); agreeableness .15 (k 4, N 1,099, .10 to .21; r .11); neuroticism -.07 (k 14, N 2,603, -.11 to -.03; r -.05). Credibility intervals are wide (extraversion -.25 to .83). Table 3, p. 846, employment status: conscientiousness .13 (k 5, N 2,534) and neuroticism -.09 (k 9, N 2,681) only. The rows with quotes are in the traits lead's scratch file research-three-papers.md; copy them into data/research/trait-effect-sizes.json when building this item. Zimmerman 2008, Cheng et al. 2020 and Brady et al. 1999 could not be fetched (publisher 403s).
