---
id: elapsed-week-observer-fixture
impact: none
---

Test-only correction of the elapsed-week campaign fixture; no production
behavior changes.

The weekly-plan fixture first proves that the player clock stops at a confirmed
session, then uses the supported observer clock to advance through the week.
Restoring player control exercises the existing expiry, cancellation, recorded
reason, money, and subsequent-week assertions without changing the clock.
