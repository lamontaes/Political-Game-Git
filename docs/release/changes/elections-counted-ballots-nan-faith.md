---
id: elections-counted-ballots-nan-faith
impact: none
---

Counted ballots store a missing faith or degree as null instead of NaN; play reads both as no profile, so only bookkeeping-on runs (tests, the bench) change: they no longer stop at an election.
