# Relationships

Run B confirms that formative friendship, conflict, reconciliation, teacher guidance, and mentoring use ordinary persistent people plus event and relationship-interaction history. There is no friendship entity, universal closeness field, mentor entity, or popularity meter. A later recognition or reaction must be supported by the relevant person’s knowledge, memory, appraisal, or interaction history; raw shared truth alone is insufficient.

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

Stage 5 separates structural life relationships from interaction history. Kinship, active/ended partnership, caregiver-to-recipient responsibility, household membership, and person-or-organization child authority have distinct stable identities and chronology. None creates the others by inference: unrelated people may share a household, kin may live apart, partners may separate, care may be shared across households, and an authority holder need not be the child's caregiver or co-resident. Specific favors, conflict, loyalty, and other social episodes still belong in relationship interactions rather than these structural records.

Queries can return the full pair history and derive a coarse internal closeness category for contextual questions. Shared-work lookup prefers overlapping actual work at the same stable organization; Stage 2 `work:` interactions and textual occupation facts remain compatibility evidence only when canonical Stage 5 work is absent. Stable school-context queries likewise compare organization identity across enrollment and work history rather than school-name text. Conflict-sensitive derivation consumes the `conflict:` namespace rather than enumerating only original examples. The derivation is replaceable and never overwrites its evidence; neither it nor any raw score is shown as a player-facing meter.

Run C adds a bounded meaningful-moment composer for calls/messages, visits/shared activity, support, missed or declined opportunities, and reconnection. A committed moment is still an ordinary contextual event plus relationship interaction and direct participant knowledge, with optional memory, appraisal, and an ordinary life commitment when time use matters. It does not record every routine message. Financial support remains a separate resource flow and can be linked by the surrounding event without becoming relationship truth.

`assessRelationshipContinuity` is a qualitative derived view over the complete interaction history. It can report recent contact, a long gap, reconnection, or tension context together with evidence IDs and last meaningful contact. It stores no number and never deletes or rewrites history. A long period without contact is neither hostility nor relationship expiry; later reconnection can use the full earlier history. A missed opportunity matters only when the opportunity and response were actually recorded, never through an invisible monthly decay tick.

Stage 4 may use specific interactions as soft decision context or as provenance for a person's explicit perception of someone else. A trusted-person political cue requires both earlier communication and relevant relationship-interaction references; closeness alone is not universal trust and never copies another person's private belief. Source credibility belongs to the recipient's perception, so two people can assess the same source differently.

Development proposals may identify a relationship direction, but they do not append an interaction or apply a relationship change. Run A child authority is only a structural effective-dated relationship; detailed custody powers, litigation, visitation, and jurisdiction-specific law remain Stage 7 concerns. Run C supports explicit cross-household support flows but infers no relationship from money. Full asymmetric trust/loyalty behavior, autonomous relationship decisions, third-party propagation, and automatic knowledge propagation remain future systems. See [Core Life](life.md) and [Resources and Housing](resources-and-housing.md).
