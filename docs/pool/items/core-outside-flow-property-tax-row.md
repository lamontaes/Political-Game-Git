---
id: core-outside-flow-property-tax-row
title: "Outside-flow catalog has no row for property tax paid to an outside government"
area: core
kind: bug
priority: 1
status: blocked
claimed-by:
pr:
blocked-on: core-outside-flow-catalog-rows
milestone:
source: "closure proof on seed 4e24294a4208d1d8 (Vaitogi, American Samoa), Oct 15"
---

**What.** `scripts/core2-year/closures.mjs` check 6 lists `accounts.transfer property-tax` (31,968 entries over a year, owed $8,104,133 net) as an unmatched flow: housing-property-tax pays homeowners' tax to a government whose account is outside the town. #4410's catalog rows (`core-outside-flow-catalog-rows`) cover price, entrant, counted-arrival, mover-departure, counsel, federal-borrowing and treasury, but not this one. Add the row (`matchedBy: transfer-under-law`) once #4410 is on main.

**Rules.** One rule, all 56 places; the chain is the acceptance. The catalog rejects plugs; this is a real recorded exchange (a law-set tax, `housing-property-tax.ts`), so it is matched, not a plug.

**Done when.** The closure check on the same seed and place lists no unmatched `property-tax` flow; the only red left is `SG-GOV-outside-revenue-monthly`.

**Files.** src/core2/data/outside-flows.json

**Notes.** Found while doing `core-outside-flow-provenance-gate` (my first PR #4421 duplicated #4410's rows and is closed). Gate stays red on the revenue stand-in until `gov-stopgap-budgets-faked-mechanic` replaces it.
