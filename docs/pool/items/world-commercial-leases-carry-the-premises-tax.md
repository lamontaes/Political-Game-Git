---
id: world-commercial-leases-carry-the-premises-tax
title: "A renting business pays rent to a landlord, and the landlord pays the premises tax"
area: world
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "stopgap cluster 15 part 3 (#9211): the tenant pays the premises tax itself as a stand-in, Nov 14"
claimed-at:
after:
lead: account-lead
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
checked: sonnet 2026-11-14
---

**What.** Today every business pays property tax on its own premises (#9211), valued at 0.4 of a year's sales, whether it owns or rents. A renting business's tax belongs to its landlord, who pays it and passes it on through rent. Give a renting business a lease to a commercial landlord (a person or organization), so the landlord pays the premises tax and the rent carries it. Seen: in a business's books (rent paid, tax paid by its landlord) and in the treasury's property-tax line, in a one-year and a two-year played run.

**Cause.** Found in code: src/core2/modules/employer-taxes.ts (`payPremisesTax`) bills every business from its own cash, and src/core2/modules/business.ts keeps no lease or landlord; the business cost ratios hold occupancy as one share. The stand-in is named in PR #9211's body, and the earlier design item `world-business-premises-record` was dropped.

**Fix.** Design: add a tenure to each business (owns or rents) from the business-cost occupancy share, and a landlord for a renter from the place's commercial owners; the landlord pays `premisesTaxMinor` and the tenant's rent rises by the same amount over the year. Reuse the existing accounts and the property-tax rate in force; no new engine.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, write what was seen in the item and stop.

**Rules.** No dice: tenure follows the business kind's occupancy share and the place's records, not a roll. One rule, all 56 places. Replace, never layer: the tenant-pays stand-in is deleted when the landlord path lands.

**Done when.** A second session, not the builder, replays it on main in a drawn place and seed it names: a renting business's premises tax is paid by its landlord and its rent rose by that amount, with the record ids; the tax total to the collector matches a run without leases within one quarter's rounding; and a second-year run at one place shows businesses open, closures and unpaid premises tax at the end of year 2 (year 1 shows only three billed quarters).

**Waits on.** #9211 folding.

**Files.** src/core2/modules/employer-taxes.ts; src/core2/modules/business.ts; src/core2/data/business/premises-tax.json

**Notes.** Asked for by the Account lead on #9211 so the stand-in is on record as work, not a quiet shortcut.
