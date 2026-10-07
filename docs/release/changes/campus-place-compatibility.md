---
id: campus-place-compatibility
impact: patch
section: Fixed
title: Campus pictures require compatible place tags
---

Campus selection now checks region, climate, terrain and size for exact campus
identities and same-state stand-ins as well as regional stand-ins. The room
picker no longer bypasses those checks with an untagged shared quad. An exact
registered institution can use its existing painting when its recorded employer
name and state agree. Other colleges need recorded target tags before they can
borrow a painting; those producer fields are still missing from legacy worlds.
The existing 52 paintings, source identities, hashes and art approval records
are unchanged. This partial fix does not establish ordinary generated campus
attendance or new visual approval.
