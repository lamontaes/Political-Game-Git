# Relationships

A relationship is a history between people, not a single friendship score.

## Rules

- Relationship history may contain favors, betrayals, loyalties, disagreements, introductions, shared experiences, promises, obligations, and third-party connections.
- Relationships may be asymmetric: one person's trust, knowledge, or interpretation need not match the other's.
- Context matters. Cooperation on one issue does not imply universal affinity.
- Geography, institutions, factions, families, and mutual contacts may shape a relationship.
- Witnessed or learned events may affect a third party only when that person plausibly knows about them.
- Internal summaries may help NPC reasoning or UI, but they are derived contextual views and never replace the historical record.
- Relationship changes must be explainable through recorded events, perceptions, or changing circumstances.

## Implemented Foundation

Relationship state is an append-only sequence of typed interactions. Interaction kinds use an open semantic namespace plus stable content key, so mentorship, care, or a new kind of collaboration can be recorded without changing a closed prompt-derived enum. Each record preserves date, people, change, significance, tags, summary, and an optional source event.

Stage 5.1 separates structural life relationships from interaction history. Kinship, active/ended partnership, caregiver-to-recipient responsibility, and household membership have distinct stable identities and chronology. None creates the others by inference: unrelated people may share a household, kin may live apart, partners may separate, and care may be shared across households. Specific favors, conflict, loyalty, and other social episodes still belong in relationship interactions rather than these structural records.

Queries can return the full pair history and derive a coarse internal closeness category for contextual questions. Shared-work lookup now prefers overlapping actual work at the same stable organization; Stage 2 `work:` interactions and textual occupation facts remain compatibility evidence only when canonical Stage 5.1 work is absent. Conflict-sensitive derivation consumes the `conflict:` namespace rather than enumerating only original examples. The derivation is replaceable and never overwrites its evidence; neither it nor any raw score is shown as a player-facing meter.

Stage 4 may use specific interactions as soft decision context or as provenance for a person's explicit perception of someone else. A trusted-person political cue requires both earlier communication and relevant relationship-interaction references; closeness alone is not universal trust and never copies another person's private belief. Source credibility belongs to the recipient's perception, so two people can assess the same source differently.

Development proposals may identify a relationship direction, but they do not append an interaction or apply a relationship change. Full asymmetric trust and obligation histories, autonomous relationship maintenance and decisions, custody, resource transfers, third-party effects, and automatic knowledge propagation remain future systems. See [Core Life](life.md).
