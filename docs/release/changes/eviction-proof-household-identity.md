---
id: eviction-proof-household-identity
impact: none
section: Fixed
title: Resolve recorded households in the eviction proof fallback
---

The internal proof reader resolves a unique existing household instead of
assuming the first involved event ID is a household. Simulation decisions and
producer records are unchanged.
