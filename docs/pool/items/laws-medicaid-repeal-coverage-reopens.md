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
model: haiku
effort: low
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** After a state repeals the Medicaid expansion, the law reach opens a new coverage payment for a named person a month later. In the mortality proof (src/core2/law-wiring-mortality-web.test.ts, MORTALITY_WEB_SEED=2063c0486f79d5fd, draw 0: Canton, New York, place 3612331) the test repeals the expansion question at every level holding yes, effective the day after the world opens (early February 2025). person_32f7f813f9ab8cd8, aged 56, whose coverage was paid from 2025-02-01, then gets two new obligations opened on 2025-03-03 (the coverage obligation and its medicaid-match federal share), so the expansion's coverage was paid a month after it was repealed and ended only later. A second case: MORTALITY_WEB_SEED=m1, Greenville, Rhode Island (4431600), person_045b0f46b2f66ee9 (61) has obligations reopened on 2025-07-01 and 2025-10-01; the person lives in the town itself, so it is not about counted places. The mortality proof now passes over a person still covered on the day it reads; this item finds why the payment reopened. Seen: a named person's coverage payments, which reopen a month after the state repealed the expansion.

**Cause.** Measured: it does not reproduce on main. `MORTALITY_WEB_SEED=2063c0486f79d5fd npx vitest run src/core2/law-wiring-mortality-web.test.ts` (Canton, New York) and `MORTALITY_WEB_SEED=m1` (Greenville, Rhode Island) both pass, 3 of 3, on main d604b3494b. The test repeals the expansion and reads each covered adult's coverage stretches after it (`stretches`, test line 147). The obligations the item describes no longer exist. The expansion now pays no coverage obligation to an adult: coverage is kept as stretches by person id (`recordCoverage` and `keepStretches`, `src/core2/law-reach/group-b-money.ts` lines 716 and 786). A repeal closes every open stretch the day it is read (`keepStretches` with an empty set), and Medicaid's share of care is paid to the seller when a bill is priced ("No payment to the adult", line 711). No `medicaid-coverage` or `medicaid-match` obligation is opened anywhere in `src/core2`.

**Fix.** Nothing to build. Proposed: the CTO closes the item (`npm run pool -- status laws-medicaid-repeal-coverage-reopens done --by=cto`). The mechanism that reopened obligations was replaced, and the test that found it passes on both of its seeds.

**Time box.** 0.5 hours for one Haiku session, only if the CTO keeps the item.

**Rules.** The chain is the acceptance: a repeal ends the payment it governs on its effective date for every person it reached, by record id, and the journal shows no payment after it. One rule, all 56 places: whatever reopened the payment is fixed for every place, with no place named in code.

**Done when.** The CTO closes the item. If it is kept, a second session runs `src/core2/law-wiring-mortality-web.test.ts` on the two seeds above and one fresh drawn place (named with its seed) and sees, after the repeal, no coverage stretch for any adult that starts after the repeal's effective date, by person and stretch record id.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/law-wiring-mortality-web.test.ts

**Notes.** TODO

Oct 29 02:00 UTC (laws session): a second case. MORTALITY_WEB_SEED=m1, draw 0, Greenville, Rhode Island (4431600): after the test repeals the expansion, person_045b0f46b2f66ee9 (61) has coverage obligations reopened on 2025-07-01 and 2025-10-01 (reach-b:coverage:...expand-medicaid-eligibility:US-RI|person_045b0f46b2f66ee9:2025-07-01 and :2025-10-01, each with its +medicaid-match:US share). The person lives in the town itself, so the reopening is not about counted places.

Nov 11 (cause finder for Fable B): ran the mortality test at both of the item's seeds on main d604b3494b; both pass. Coverage is now kept as stretches that a repeal closes, with no payment obligation to the adult to reopen. I propose the CTO closes the item.
