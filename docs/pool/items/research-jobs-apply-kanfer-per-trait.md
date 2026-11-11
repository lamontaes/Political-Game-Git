---
id: research-jobs-apply-kanfer-per-trait
title: "Job applications weigh temperament at Kanfer et al.'s per-trait job-search sizes"
area: people
kind: research
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
standard: 2
model: sonnet
effort: low
root: none
lead: traits
after:
checked: fable 2026-11-10
---

**What.** The jobs.apply decision keeps the general trait weight of 1 because only the abstract of Kanfer, Wanberg and Kantrowitz 2001 (Journal of Applied Psychology 86(5), a meta-analysis of job search and employment) was read, and it gives the range of correlations across all antecedents, not each trait's. The paper's tables give each Big Five trait's population correlation with job search behavior, and the Notes below already hold the Table 2 cells. Record the rows in data/research/trait-effect-sizes.json with quotes, and fit the weight to them on played years.

**Cause.** Found in code: data/content/trait-decision-gaps.json lists `jobs.apply` at the general weight, and traitWeightJobsApply in src/core2/data/parameters.json is TUNABLE at 1; only the abstract of Kanfer, Wanberg and Kantrowitz 2001 was read.

**Fix.** Copy the paper's Table 2 rows (each Big Five trait's corrected correlation with job search behavior, with k, N and interval) into data/research/trait-effect-sizes.json with quotes, set traitWeightJobsApply per trait in src/core2/data/parameters.json as ESTIMATED from them with its spread, and remove the jobs.apply gap row.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: research calibrates and never decides one seeker's outcome; quote the table cells from a fetched copy of the paper. No dice: temperament weighs the decision, a draw never does. One rule, all 56 places: fit on places drawn from all 56, seeds named.

**Done when.** A second session plays a year in two drawn places (seeds named in the PR) and sees, by record id, that the more extraverted and more conscientious thirds of working-age adults apply for jobs more often than the less extraverted and less conscientious thirds, in the direction of the paper's rows; the ratio is reported next to the study's and is not a pass mark. data/research/trait-effect-sizes.json carries jobs.apply rows for each trait with the quoted table cells, traitWeightJobsApply is ESTIMATED from them with its spread, the jobs.apply gap row is removed, and src/core2/money-traits.traits.test.ts passes.

**Waits on.** Nothing.

**Files.** data/research/trait-effect-sizes.json, src/core2/data/parameters.json, data/content/trait-decision-gaps.json, src/core2/money-traits.traits.test.ts

**Notes.** Found Oct 26 by the traits lead's research helper, from the author-hosted copy (https://carlsonschool.umn.edu/sites/carlsonschool.umn.edu/files/2018-10/kanfer_wanberg_kantrowitz_2001.pdf), Table 2, p. 845, job search behavior, corrected correlation rc with k, N and 95% interval: extraversion .46 (k 7, N 1,733, .43 to .50; observed r .34); conscientiousness .38 (k 11, N 5,433, .36 to .40; r .30); openness .27 (k 4, N 1,099, .21 to .32; r .19); agreeableness .15 (k 4, N 1,099, .10 to .21; r .11); neuroticism -.07 (k 14, N 2,603, -.11 to -.03; r -.05). Credibility intervals are wide (extraversion -.25 to .83). Table 3, p. 846, employment status: conscientiousness .13 (k 5, N 2,534) and neuroticism -.09 (k 9, N 2,681) only. The rows with quotes are in the traits lead's scratch file research-three-papers.md; copy them into data/research/trait-effect-sizes.json when building this item. Zimmerman 2008, Cheng et al. 2020 and Brady et al. 1999 could not be fetched (publisher 403s).

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have fitted the job-search trait weights to one study; precision no player sees.
