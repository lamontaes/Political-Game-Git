---
id: world-rent-flows
title: "Rent and mortgage payments go to the housing engine, not outside"
area: world
kind: wiring
priority: 2
size: M
status: done
claimed-by: claude/rent-flows-stopgap-text
pr: #4872
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at: 2026-10-17T05:11:21.625Z
---

**What.** Housing rent and mortgage flows replace the core's stand-in `household.outside-living-costs` payment (`SG-CORE-outside-living-costs`): set `outsideLivingCosts: false` where the housing engine pays, so a landlord or lender is a real payee. Today every renter's rent leaves the town as one outside payment. A household's rent then reaches the landlord who owns the unit, and the lender gets the mortgage payment.

**Rules.** Wire to the world; the chain is the acceptance; every dollar balances.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56) a renter's monthly rent lands in a named landlord's account by journal record id, no outside-living-costs flow remains for that household, and SG-CORE-outside-living-costs is resolved.

**Files.** src/core2/modules/housing.ts, src/core2/residents.ts, src/core2/data/stopgaps.json

**Notes.** core.md line 179 (4), checked Oct 15: stopgap still open.

Checked Oct 16 on main (bench world, Rush Valley, Utah, seed rent1, place 4965240): already built for rent and mortgages. Counted renters' `household.rent` flows pay a recorded landlord organization (`organization:landlord:...`); `household-purchase` contracts and `household.mortgage` flows pay the bank (`housing-mortgages.ts` gives a loan to the outside market only when the bank's room runs out); and `residents.ts` subtracts every bound household contract from a household's assigned living cost before anything is paid outside. What `household.outside-living-costs` still pays outside is the part of the CEX basket not bought from a local seller; that is the outside-spending model (location-quotient leakage), a different item, and SG-CORE-outside-living-costs stays open for it. Nothing left to build here as written; recommend the CTO sets this one done and the stopgap's replacement text names only the outside-spending model.
