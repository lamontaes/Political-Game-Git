---
id: primary-dwelling-query
title: Share the primary dwelling query
impact: none
section: Changed
---

The existing primary occupancy and matching active tenure lookup now lives in `primaryDwellingOf(world, personId)` in resource-queries.ts. The town ward address reader uses that query and keeps its roster address and household fallback behavior.

Replaces: the inline primary dwelling lookup in town-wards.ts homePosition. Existing occupancy, tenure and household readers remain the sources. No housing records, addresses, ward calculations or plural housing inventories change.

New export: primaryDwellingOf. Other callers require a separate semantics-preserving migration. This source change does not claim completion of all primary-home callers.
