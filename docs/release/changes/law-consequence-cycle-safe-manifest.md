---
id: law-consequence-cycle-safe-manifest
impact: none
---

Resolve the shared law registration list lazily so manifest modules can refer to law application without triggering an initialization cycle. Keep generated manifest output formatted across empty, single-module and multi-module registries. This infrastructure change does not alter player-visible behavior.
