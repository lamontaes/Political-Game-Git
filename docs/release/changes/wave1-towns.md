---
id: wave1-towns
impact: patch
section: Fixed
title: Towns keep enumerated residents when a population survey reports zero
---

Adds verified Census population and demographic inputs for counties, places,
and Island Areas, plus pure population readers and an explicit saved-layer
writer. Concho preserves a positive enumeration when its ACS survey is zero.
Source vintages, suppressed cells, and Island Areas universes remain labeled.

Adds a shared income reader that distinguishes recurring compensation from
actual irregular-pay receipts and recognizes exact biweekly cadence.
The existing town-reference reader uses the new sources and preserves real
annual Census zeros. Household evolution, territory roster integration, and
income consumers follow separately.
