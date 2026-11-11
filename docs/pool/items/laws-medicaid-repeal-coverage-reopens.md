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

**Cause.** Needs cause. Measured: MORTALITY_WEB_SEED=2063c0486f79d5fd (Canton, New York, 3612331) and MORTALITY_WEB_SEED=m1 (Greenville, Rhode Island, 4431600): coverage obligations reopen after the repeal. The item's old function names have moved; the code is now `recordCoverage` (src/core2/law-reach/group-b-money.ts, line 716) and `medicaidCoverageSpells` (line 959). Not yet looked at: what reopens the obligation a month after the repeal.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: a repeal ends the payment it governs on its effective date for every person it reached, by record id, and the journal shows no payment after it. One rule, all 56 places: whatever reopened the payment is fixed for every place, with no place named in code.

**Done when.** A second session, not the builder, runs src/core2/law-wiring-mortality-web.test.ts at MORTALITY_WEB_SEED=2063c0486f79d5fd (Canton, New York) and MORTALITY_WEB_SEED=m1 (Greenville, Rhode Island), both drawn places. No coverage obligation for the expansion opens after the repeal's effective date, shown by the person's obligations and their end dates in the PR body, and a test beside group-b-money draws a place, repeals the expansion and asserts no new obligation opens after it, naming the place and seed.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/law-wiring-mortality-web.test.ts

**Notes.** TODO

Oct 29 02:00 UTC (laws session): a second case. MORTALITY_WEB_SEED=m1, draw 0, Greenville, Rhode Island (4431600): after the test repeals the expansion, person_045b0f46b2f66ee9 (61) has coverage obligations reopened on 2025-07-01 and 2025-10-01 (reach-b:coverage:...expand-medicaid-eligibility:US-RI|person_045b0f46b2f66ee9:2025-07-01 and :2025-10-01, each with its +medicaid-match:US share). The person lives in the town itself, so the reopening is not about counted places.
