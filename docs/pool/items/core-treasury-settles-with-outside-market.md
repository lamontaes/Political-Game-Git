---
id: core-treasury-settles-with-outside-market
title: "Treasuries and town engines settle with the town's outside market, not the first outside account"
area: core
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: claude/quirky-ride-vrwwz4-city-treasury
pr: #5891
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T14:49:01.043Z
---

**What.** PR #5891 found why a 180-person city (Dickens, Iowa) showed about seven trillion dollars a year of employer flows: the treasury lookup took the first organization in town with an outside account, sorted by id, and a public employer's pay authority sorts before the outside market, so the federal and state monthly outside flows ran through the city. Thirteen other engines found the outside the same way. This bounded item is that lookup fix; the broader balance acceptance stays open in core-city-treasury-trillions-dickens, which waits on the M0-08 check's opening-timing fix.

**Rules.** Wire to the world: every dollar moves between real accounts on the one balanced writer, and a city's payments match its budget. One rule, all 56 places: the lookup reads the place's outside market from its records, for any drawn place.

**Done when.** In Dickens, Iowa and two places drawn from all 56, named with seeds, each public employer's yearly outside flows stay inside its government's adopted budget, named by budget record id; a test playing two drawn places asserts the treasury's outside account is the outside market and fails with the old lookup; core-city-treasury-trillions-dickens stays open for the closures balance line.

**Files.** src/core2/opening-outside-market.ts, src/core2/budgets-treasury.ts, src/core2/treasury-outside-account.test.ts

**Notes.** TODO
