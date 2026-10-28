---
id: laws-farmland-protection-money-traced
title: "Farmland protection's money is the cost it changes for the builder it stops, against the control world"
area: laws
lead: laws
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: laws lead, Oct 26
claimed-at:
---

**What.** In the rights-env family's runs on the own-payment checker (PR #5669), protect-farmland-from-development grades wired, but its money is only postings that name the law: $1,000.00 in Prescott, Michigan and $2,000.00 in Uehling, Nebraska, the same in the control world. The builder's applied row carries no amount. So the money the matrix credits is not the law's own: nothing differs between the world with the law and the world without it.

**Rules.** An effect is a read, not a record: the housing engine reads the protection when a builder chooses a site, and the cost it changes is the law's money. Sliding scales and causes: no fixed share; the cost comes from the site the builder could not use.

**Done when.** In a played year (`buildBenchWorld`, every module installed) in a drawn place where a builder plans homes on farmland, the builder's applied row records the cost the protection changed, and `scripts/law-wiring/check.ts` finds that builder's payment different from the control world's, named by journal id with both amounts. **On screen.** Nothing yet.

**Files.** src/core2/modules/housing.ts, src/core2/housing-construction.ts, scripts/law-wiring/check.ts

**Notes.** Laws lead, Oct 26, from the rights-env helper's regrade. Part of `laws-nine-links-rights-env`.
