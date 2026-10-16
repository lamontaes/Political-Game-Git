---
id: world-rent-flows
title: "Rent and mortgage payments go to the housing engine, not outside"
area: world
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
---

**What.** Housing rent and mortgage flows replace the core's stand-in `household.outside-living-costs` payment (`SG-CORE-outside-living-costs`): set `outsideLivingCosts: false` where the housing engine pays, so a landlord or lender is a real payee. Today every renter's rent leaves the town as one outside payment. A household's rent then reaches the landlord who owns the unit, and the lender gets the mortgage payment.

**Rules.** Wire to the world; the chain is the acceptance; every dollar balances.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56) a renter's monthly rent lands in a named landlord's account by journal record id, no outside-living-costs flow remains for that household, and SG-CORE-outside-living-costs is resolved.

**Files.** src/core2/modules/housing.ts, src/core2/residents.ts, src/core2/data/stopgaps.json

**Notes.** core.md line 179 (4), checked Oct 15: stopgap still open.
