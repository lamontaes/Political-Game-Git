---
id: year-speed-young-generation
impact: patch
section: Changed
title: A town's year runs about 13% faster
---

The play server gives its JavaScript engine a larger young generation, so a played year spends less of its time collecting garbage. The two slowest towns we measure ran 118.5 s and 134.3 s before and 101.7 s and 116.5 s after, with identical money to the cent.
