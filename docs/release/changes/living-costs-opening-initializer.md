---
id: living-costs-opening-initializer
impact: none
---

Extract the existing living-cost flow writer into a pure opening initializer.
It records the same charge at the world's current date without a payment.
Existing flows remain unchanged, and a missing flow in an old save starts now.
Settlement retains its existing first-call and monthly behavior. The opening
and clock callers are separate changes requiring their owners' approval.
