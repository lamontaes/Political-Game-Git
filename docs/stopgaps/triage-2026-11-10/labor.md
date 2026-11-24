# Labor stand-ins, checked Nov 10, 2026

Register: `src/core2/data/stopgaps/labor.json`. 13 open rows were checked (3 other rows were already resolved and are untouched). Each row got the owner's test of Nov 10: where does the player see or feel it on the golden path or in something he has ruled?

**Totals:** kept 2 (1 the player sees, 1 waiting on the crime system), dropped 9, borderline 2 (closed as dropped, listed below for the owner).

**Still true:** still faked 12, partly replaced 1 (SG-LABOR-regional-job-town-roles, now dropped), already replaced 0, could not tell 0.

**New pool items:** 0. The four items first filed were deleted under the owner's test. Reuse check: the one kept build row, turnover, is covered by the live item core-country-tier-town-joins-its-state-part-5-delete-the-fixed-layoff-pace.

| Stand-in                                       | Where the player sees it                                                                             | Verdict                               | Still true?     | What closes it               | Pool item                                                                         | Size   | In plain words                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------- | --------------- | ---------------------------- | --------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| SG-LABOR-turnover-fixed-rate                   | Layoffs, hiring and the town's out-of-work count on the paper, journal and Metrics; people lose jobs | kept                                  | still faked     | code                         | core-country-tier-town-joins-its-state-part-5-delete-the-fixed-layoff-pace (live) | large  | Town workers lose their jobs at a steady national pace instead of because their employer's sales fell. |
| SG-LABOR-ban-the-box-proof-fixture-convictions | Nowhere (test only)                                                                                  | waits on the crime system             | still faked     | code, after the crime system | none                                                                              | medium | The ban-the-box test writes convictions by hand because ordinary crime does not yet produce them.      |
| SG-LABOR-counted-partner-proxy                 | Nowhere; a guess inside the town's work share                                                        | dropped: too in depth (owner, Nov 10) | still faked     | none                         | none                                                                              | medium | For people we only count, who is married and who is a mother is guessed from ages.                     |
| SG-LABOR-no-legal-status                       | Nowhere beyond a small shift in a town's work count                                                  | dropped: too in depth (owner, Nov 10) | still faked     | none                         | none                                                                              | small  | Immigration enforcement hits workers by a work status drawn at the national share.                     |
| SG-LABOR-person-exposure                       | Nowhere; effects would show decades later                                                            | dropped: too in depth (owner, Nov 10) | still faked     | none                         | none                                                                              | large  | Childhood air, teachers and neighborhoods do not change adult pay.                                     |
| SG-LABOR-pretrial-employment                   | Nowhere; courts come after early access                                                              | dropped: too in depth (owner, Nov 10) | still faked     | none                         | none                                                                              | medium | Someone held before trial gets a fixed push away from formal work.                                     |
| SG-LABOR-participation-scale                   | Nowhere; a size inside the work share                                                                | dropped: too in depth (owner, Nov 10) | still faked     | none                         | none                                                                              | small  | The effect of being a mother or married on who works is not fitted to research.                        |
| SG-LABOR-regional-job-town-roles               | Nowhere; the pay of one out-of-town job                                                              | dropped: too in depth (owner, Nov 10) | partly replaced | none                         | none                                                                              | small  | Someone who finds work outside town is paid by the nearest town role, not their own kind of work.      |
| SG-LABOR-find-age-estimated                    | Nowhere; a curve inside job finding                                                                  | dropped: too in depth (owner, Nov 10) | still faked     | none                         | none                                                                              | small  | How much slower older people find work is one guessed curve.                                           |
| SG-LABOR-opening-band-ratios-town-mix          | Nowhere; the opening count of job seekers                                                            | dropped: too in depth (owner, Nov 10) | still faked     | none                         | none                                                                              | small  | A town older than its county opens at the county's out-of-work rate.                                   |
| SG-LABOR-vacancy-size-uniform                  | Nowhere; how long an opening waits                                                                   | dropped: too in depth (owner, Nov 10) | still faked     | none                         | none                                                                              | small  | A job opening waits by industry only, not by the firm's size.                                          |
| SG-LABOR-unsized-links                         | A broadband, transit or incentive ordinance he passes would move no jobs                             | borderline, dropped                   | still faked     | none                         | none                                                                              | medium | Four policy effects on jobs have no researched size, so none moves anyone's work.                      |
| SG-LABOR-record-bias-public-only               | The ban-the-box ordinance he can propose reaches only public employers                               | borderline, dropped                   | still faked     | none                         | none                                                                              | medium | The conviction penalty and its ban reach only public employers and named people.                       |

## Evidence

- SG-LABOR-counted-partner-proxy: src/core2/jobs-web.ts:68-76 (`factsOf`), :172 (`countedFacts`); counts keep kin pairs with no kind.
- SG-LABOR-no-legal-status: src/core2/jobs-web.ts:258-272 (`authorizationMeasure`); src/core2/citizenship.ts:31 (`isUnauthorized`); parameters.json:5623 national share.
- SG-LABOR-person-exposure: src/core2/jobs-web.ts:399; outcome-web-labor-waiting.test.ts:23-27; no reader found by grep.
- SG-LABOR-unsized-links: src/core2/jobs-web.ts:400; outcome-web-labor-waiting.test.ts:29-34.
- SG-LABOR-pretrial-employment: src/core2/jobs-web.ts:347-364 (`detentionShift`); counted members return zero. Courts after early access (ROADMAP Oct 10).
- SG-LABOR-participation-scale: src/core2/jobs-web.ts:308, :327; only the older-work term is fitted (pool item web-calibrate-labor-participation, done).
- SG-LABOR-regional-job-town-roles: src/core2/modules/jobs.ts:2496-2510 (`hireRegional`); `lastJob` (jobs.ts:184) read only when no town role is found.
- SG-LABOR-turnover-fixed-rate: src/core2/modules/jobs.ts:2296-2298 (`reviewTurnover`) still runs; the small-town flat line is measured in the register row.
- SG-LABOR-find-age-estimated: src/core2/past-work.ts:340-349; parameters.json:7181.
- SG-LABOR-opening-band-ratios-town-mix: src/core2/modules/jobs.ts:719-735 (`bandQuotas`).
- SG-LABOR-vacancy-size-uniform: src/core2/modules/jobs.ts:3054-3077 (`vacancyDays`).
- SG-LABOR-ban-the-box-proof-fixture-convictions: src/core2/jobs-record-bias.test.ts:149, :172 write fixture measures; no marker with this id in src or scripts. Belongs to the one crime system (OWNER-DECISIONS Oct 27; SG-CORE-crime-offenders).
- SG-LABOR-record-bias-public-only: src/core2/jobs-record-bias.ts:29-52 (`recordBiasAt`); data/research/executive/ban-the-box-public-hiring-2025-01.json holds `coversPrivate`, unread.

## Borderline, for the owner

- SG-LABOR-unsized-links: if he passes a broadband, transit or incentive ordinance, it will not move jobs until someone finds a size for each effect.
- SG-LABOR-record-bias-public-only: a ban-the-box ordinance he proposes in a state that also covers private employers will still leave private employers free to rank people with records last.

## Questions for the owner

None.
