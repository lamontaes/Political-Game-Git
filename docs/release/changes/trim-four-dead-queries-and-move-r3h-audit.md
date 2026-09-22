---
id: trim-four-dead-queries-and-move-r3h-audit
impact: none
---

Removes four simulation queries that nothing referenced, not even a test:
`incidentsByKindAt`, `factsNewestFirst`, `hasCampaignCommitment` and
`subjectKnowledgeProfilesForDomain`, plus the one private helper only the last
of them used. It also moves the R3H reconciliation audit, which says of itself
that the simulation never consults it, out of `src/simulation` and into
`scripts/source` beside the script that regenerates its evidence. That evidence
regenerates byte for byte.

An audit counted many more exports as unused. They were deliberately kept:

- The other exports that no production code calls are tested query and
  derivation functions for beliefs, knowledge, goals, incidents and the
  economy. They are the unwired half of systems that are being connected now,
  not leftovers.
- The remaining unreferenced names are input types for exported functions.
- The old mortality scheduler also stays. Saves still carry its plan records,
  the integrity checks validate them, and ten test cases use it as the only
  producer of those records.
