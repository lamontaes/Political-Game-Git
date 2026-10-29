---
id: laws-medicaid-repeal-coverage-reopens
title: "After a state repeals the Medicaid expansion, the law reach opens a new coverage payment for a named person a month later (Canton, New York)"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In the mortality proof (src/core2/law-wiring-mortality-web.test.ts, MORTALITY_WEB_SEED=2063c0486f79d5fd, draw 0: Canton, New York, place 3612331), the test repeals us-policy-positions:health-human-services.expand-medicaid-eligibility at every level of the town's chain holding yes, effective the day after the world opens (early February 2025). person_32f7f813f9ab8cd8, aged 56, whose coverage was paid from 2025-02-01, then gets two new obligations opened on 2025-03-03: reach-b:coverage:...expand-medicaid-eligibility:US-NY|person_32f7f813f9ab8cd8:2025-03-03 and its +medicaid-match:US federal share. So payCoverage (src/core2/law-reach/group-b-money.ts) paid the expansion's coverage a month after it was repealed, and it ended only later. The person lives in counted:jurisdiction_9d3a27e47fd6568e, the player's town in that world. The mortality proof now passes over a person still covered on the day it reads; this item finds why the payment reopened.

**Rules.** The chain is the acceptance: a repeal ends the payment it governs on its effective date for every person it reached, by record id, and the journal shows no payment after it. One rule, all 56 places: whatever reopened the payment is fixed for every place, with no place named in code.

**Done when.** In the named world, no coverage obligation for the expansion opens after the repeal's effective date, shown by the person's obligations and their end dates in the PR body; a test beside group-b-money draws a place, repeals the expansion and asserts no new obligation opens after it, naming the place and seed.

**Files.** src/core2/law-reach/group-b-money.ts; src/core2/law-wiring-mortality-web.test.ts

**Notes.** TODO

Oct 29 02:00 UTC (laws session): a second case. MORTALITY_WEB_SEED=m1, draw 0, Greenville, Rhode Island (4431600): after the test repeals the expansion, person_045b0f46b2f66ee9 (61) has coverage obligations reopened on 2025-07-01 and 2025-10-01 (reach-b:coverage:...expand-medicaid-eligibility:US-RI|person_045b0f46b2f66ee9:2025-07-01 and :2025-10-01, each with its +medicaid-match:US share). The person lives in the town itself, so the reopening is not about counted places.
