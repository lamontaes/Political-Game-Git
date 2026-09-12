---
id: next24-a-inline-workspace-proof
impact: none
---

Correct the browser proof's inline-workspace expectation. PlayerGame opens the
existing workspace in place; PlayerOffice's separate fixture route navigates.
Retain the actual click, visible destination and keyboard assertions. Allow the
two multi-stage save/reopen workflows a bounded total budget without changing
their assertion timeouts. No runtime, World, policy or election behavior changes.
