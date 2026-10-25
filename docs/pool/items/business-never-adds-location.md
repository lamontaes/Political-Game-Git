---
id: business-never-adds-location
title: "No business ever opens a second location, and town foundings swing from 3 to 1 to 7 a year"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Cochituate, Massachusetts (key 2514570, seed 93a558a5898ee167fd5c49b69a4183c546da870c3754f7688faeb29392d6d4dc), three played years held 11 foundings and none was a location of an existing business (no founding row names a parent). Openings per year were 3, 1 and 7 against the state's BDS entry range of 8.4% to 11.0% of 30 to 40 businesses. Roadmap M1-08's check fails on both. The founding decision is in business.ts foundings/found; why parents never expand is not yet known.

**Rules.** No dice: a business adds a location because its own books, market room and owner decide it, never a yearly chance; real BDS rates check the totals only.

**Done when.** node --max-old-space-size=8192 --import tsx src/core2/tooling/m1-08-check.ts in Cochituate, Massachusetts (seed above) shows at least one location founding with its parent, market room and cash by record id, and openings inside the BDS range, with the cause of the missing expansions named in the PR body.

**Files.** src/core2/modules/business.ts

**Notes.** TODO
