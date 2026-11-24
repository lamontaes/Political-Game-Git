---
id: laws-medicaid-repeal-coverage-reopens
title: "After a state repeals the Medicaid expansion, the law reach opens a new coverage payment for a named person a month later (Canton, New York)"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** After a state repeals the Medicaid expansion, the law reach opens a new coverage payment for a named person a month later. In the mortality proof (src/core2/law-wiring-mortality-web.test.ts, MORTALITY_WEB_SEED=2063c0486f79d5fd, draw 0: Canton, New York, place 3612331) the test repeals the expansion question at every level holding yes, effective the day after the world opens (early February 2025). person_32f7f813f9ab8cd8, aged 56, whose coverage was paid from 2025-02-01, then gets two new obligations opened on 2025-03-03 (the coverage obligation and its medicaid-match federal share), so the expansion's coverage was paid a month after it was repealed and ended only later. A second case: MORTALITY_WEB_SEED=m1, Greenville, Rhode Island (4431600), person_045b0f46b2f66ee9 (61) has obligations reopened on 2025-07-01 and 2025-10-01; the person lives in the town itself, so it is not about counted places. The mortality proof now passes over a person still covered on the day it reads; this item finds why the payment reopened. Seen: a named person's coverage payments, which reopen a month after the state repealed the expansion.

**Cause.** Measured: Canton, New York (3612331), `MORTALITY_WEB_SEED=2063c0486f79d5fd npx vitest run src/core2/law-wiring-mortality-web.test.ts -t "coverage-to-mortality-55-64"` on the train at df168042e6, with a temporary print in `recordCoverage` (src/core2/law-reach/group-b-money.ts, not committed) of every call: the day, the law row, whether the expansion was in force and how many people it covered. On the train nothing reopens. In the world where the test repeals the expansion, `recordCoverage` runs on the opening day and on February 1 with the starting law in force (1,087 and 1,084 covered), then once on February 7, the day of the repeal, with the law off and nobody covered, and never again in the months that world is played. `keepStretches`, the only writer of a coverage stretch, is called only from `recordCoverage`, so a stretch closed that day cannot open again. In the twin with no repeal the same call runs on the 1st of every month to March 2026 with 1,037 to 1,087 covered. The item's reopened "obligations" belong to an older design: coverage is kept as stretches by person id now, with no payment to the adult (the comment on `recordCoverage`), so those two records can no longer be written. The test passes at that seed (1 of 1, 997 seconds).

**Fix.** Nothing to build on the train. Close this item as dropped: both seeds in What were replayed and neither reopens (the second is in Notes).

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: a repeal ends the payment it governs on its effective date for every person it reached, by record id, and the journal shows no payment after it. One rule, all 56 places: whatever reopened the payment is fixed for every place, with no place named in code.

**Done when.** A second session, not the builder, runs src/core2/law-wiring-mortality-web.test.ts at MORTALITY_WEB_SEED=2063c0486f79d5fd (Canton, New York) and MORTALITY_WEB_SEED=m1 (Greenville, Rhode Island), both drawn places. No coverage obligation for the expansion opens after the repeal's effective date, shown by the person's obligations and their end dates in the PR body, and a test beside group-b-money draws a place, repeals the expansion and asserts no new obligation opens after it, naming the place and seed.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/law-wiring-mortality-web.test.ts

**Notes.** Nov 15 (Fable B, train at df168042e6): the same command with MORTALITY_WEB_SEED=m1 (Greenville, Rhode Island, 4431600) and the same temporary print. In the world where the test repeals the expansion, `recordCoverage` runs on the opening day and on February 1 with the starting law in force (197 covered), once on February 7, the day of the repeal, with the law off and nobody covered, and never again. In the twin with no repeal it runs on the 1st of every month to March 2026. person_045b0f46b2f66ee9 is among the covered in both worlds before the repeal. So neither of the two cases in What reopens on the train. The status is left for the lead to set.

Oct 29 02:00 UTC (laws session): a second case. MORTALITY_WEB_SEED=m1, draw 0, Greenville, Rhode Island (4431600): after the test repeals the expansion, person_045b0f46b2f66ee9 (61) has coverage obligations reopened on 2025-07-01 and 2025-10-01 (reach-b:coverage:...expand-medicaid-eligibility:US-RI|person_045b0f46b2f66ee9:2025-07-01 and :2025-10-01, each with its +medicaid-match:US share). The person lives in the town itself, so the reopening is not about counted places.
