---
id: player-payroll-recorded-contract-fixture
impact: none
---

The payroll comparison fixture uses the canonical recorded compensation flow,
settles its prior native-cadence obligations before a prospective contract
revision, and compares new-contract outcomes separately. It retains prior
payment, tax and dated-cash assertions and the original limits. Source review
and four focused controls passed; the complete file still failed with a
timeout and heap failure, so no full-file runtime pass is claimed.
