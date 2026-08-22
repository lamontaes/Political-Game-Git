# Characters

Characters are persistent people with histories, not disposable stat blocks or office-bound avatars.

## Rules

- Every person has a stable ID that survives materialization, career changes, office changes, and time advancement.
- Life can exist before, during, and after politics; a character need never enter politics.
- Character domains may include established facts, history, memories, beliefs, expertise, personality tendencies, goals, relationships, perceptions, reputation, careers, and family.
- Staff and former officeholders use the same persistent-person model as other characters.
- Families may carry history, wealth, relationships, reputation, expectations, enemies, and name recognition across generations.
- Death, retirement, failure, and leaving office change a life; they do not erase it.

## Progressive Detail

A lightweight person contains a stable identity and a small set of established facts. Materialization may add detail but must never:

- replace the ID;
- alter an established fact without an explicit correction record;
- invalidate an existing event or relationship reference;
- invent a biography incompatible with known history.

Materialization is deterministic from stable simulation inputs. Once added, materialized facts are saved as world facts. Canonical events can carry explicit person-fact constraints that reserve a biographical dimension from procedural generation without treating prose as truth. If no compatible detail can be generated, a materializer leaves it unknown or reports a conflict rather than overwriting history.

## Implemented Foundation

Every person stores typed, stable biography facts for birth date, birthplace, dated residences, family relationships, education, and occupation. Facts have semantic keys, stable IDs, structured provenance, and validated date/reference constraints. They are factual records, not memories or claims.

Lightweight people begin with identity, birth, birthplace, and current residence. Deterministic materialization can add compatible education and occupation facts while preserving every established record. Memories, event knowledge, statements, and relationship interactions live in the shared history store and refer back to the same stable person and event IDs.

This is a persistence and querying foundation, not a complete family, career, personality, or autonomous-decision simulation. Generated expertise, tendencies, and goals remain internal synthetic proof data and are not exposed as raw player-facing values.
