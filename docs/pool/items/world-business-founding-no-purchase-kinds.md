---
id: world-business-founding-no-purchase-kinds
title: "A professional-services business founded in a played world stops the game: No purchase kinds to enter (residents.enterResidentMarket)"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A professional-services business founded on 2026-04-01 by person_84379c678df01275 stopped a 600-day played world with 'No purchase kinds to enter for organization:founded:professional:person_84379c678df01275:2026-04-01 (give financeKinds or a rival)', thrown by enterResidentMarket from business.found. The founding gives the new firm no purchase kinds and no rival to copy. Find which sector row has no financeKinds and give it the kinds its customers buy, or have the founding refuse a firm no one would buy from.

**Rules.** Wire to the world: a firm that sells to residents sells a kind of good the residents engine records, from the sector's own row. Estimate, never UNKNOWN: a missing kind is filled from the sector's real purchase kinds, not skipped. One rule, all 56 places: the check draws its place and names it with the seed.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place, seed named in the PR body) a professional-services founding enters the resident market with at least one purchase kind, named by organization record id, and the candidacy calibration run that found it (CALIBRATION_RUN=1 with the stay-out pull at 3.8, seeds c1 to c6) reaches its count without this error; a test beside src/core2/business tests covers it.

**Files.** src/core2/modules/business.ts, src/core2/modules/residents.ts

**Notes.** TODO
