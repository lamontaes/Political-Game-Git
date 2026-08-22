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

Relationship state is an append-only sequence of typed interactions: introductions, shared work, shared experiences, support, favors, conflicts, betrayals, commitments, or other contextual episodes. Each record preserves date, people, change, significance, tags, summary, and an optional source event.

Queries can return the full pair history, determine whether people previously worked together, and derive a coarse internal closeness category for contextual questions. The derivation is replaceable and never overwrites its evidence; neither it nor any raw score is shown as a player-facing meter. Asymmetric trust, obligations, autonomous relationship behavior, and knowledge propagation remain future systems.
