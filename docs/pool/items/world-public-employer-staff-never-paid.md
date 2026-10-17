---
id: world-public-employer-staff-never-paid
title: "Staff of the opening's State Offices employer (and a few other public employers) are never paid: the employer holds no cash and no pay link"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/public-staff-never-paid
pr: #4984
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T21:43:26.865Z
---

**What.** In the played world (`buildBenchWorld`, two-level, 120 days from the start) some people on a public employer's payroll are never paid. Found by `src/bench/dev-why.test.ts` (seed `4b22c467924caecf`, La Liga, Puerto Rico, Jan 20 to May 20, 2025): the first worker with a job and an itemized ledger is `person_688586e39370083b`, an office clerk at "Puerto Rico State Offices in La Liga" (`organization_62f157e3f7d6d4ca`, 4 jobs). Their weekly work rollups ask for $475 a week and record `paidMinor` 0; their ledger holds only eight `accounts.transfer` debits on Feb 1 (the opening cash going to living costs) and ends at $0. The employer holds $0, has no `publicPayAuthority`, and its commitments carry no `publicPayAuthorityId`; the world has no pay authority on any organization and no entry in `publicPayTreasuries`. Other employers do pay (`person_688585e393700688` at a roofing firm has 16 `work-payroll` receipts and withholding). Across La Liga, Montrose (Mississippi) and Chatham (Illinois), organizations with open jobs and no outgoing money at all after 120 days: State Offices (4, 1 and 1 jobs), Neighbors United, the Fire Department, the Post Office, Public Schools, the Village (Chatham), Campaign Works and an electric cooperative. Most state workers sit at the state's treasury organization and are paid; these are the ones the opening puts on a separate employer organization. Find why those employers get neither cash nor a pay link (`src/core2/population.ts` links an employer only when its saved profile carries a government identity, `opening-public-pay.ts`; the county account is the only one built from a recorded identity in `opening-public-owner.ts`), and link each to the government that pays it.

**Rules.** No employer name grants authority: link from a recorded government identity. The treasury pays the wage (`gov-public-payroll-wire`). One model, two tiers: counted workers at the same employers follow the same rule. One rule, all 56 places.

**Done when.** In a one-year run of the played world in a drawn place and a seed the builder did not choose, every full person with an open job at a public employer has a payroll receipt in each pay period, shown by person and receipt ids for the State Offices clerk above and one worker at each other employer listed; `dev-why.test.ts` picks any worker with a job and finds a `pay` row.

**Files.** src/core2/population.ts, src/core2/opening-public-pay.ts, src/core2/opening-public-owner.ts

**Notes.** `dev-why.test.ts` now picks a worker who has been paid, so it stays green while this is open. `paidMinor` in the work rollups reads 0 for paid private workers too (payroll posts through another path), so do not use it to find unpaid workers; read the cash journal.
