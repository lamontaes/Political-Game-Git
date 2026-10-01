---
id: a112-recorded-town-counts
impact: patch
section: Fixed
title: Town election counts reuse saved candidate support
---

Town counts no longer draw turnout or candidate support. They use the existing
profile turnout midpoint where no saved turnout rate exists, and read the
candidates' recorded official views and favors. Other election rules remain
unchanged.
