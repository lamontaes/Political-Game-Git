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

Every person stores typed, stable biography facts for birth date, birthplace, dated residences, family relationships, education, and occupation. This is a closed union of currently supported record shapes because every shape has distinct required fields and validation; it is not a claim that arbitrary future biography belongs in a metadata bag. Family-relationship kinds within that shape use an open semantic namespace and stable content key. Facts have semantic keys, stable IDs, structured provenance, and validated date/reference constraints. They are factual records, not memories or claims.

Lightweight people begin with identity, birth, birthplace, and current residence. Deterministic materialization can add compatible education and occupation facts while preserving every established record. Memories, event knowledge, statements, relationship interactions, mind histories, and decision traces live in the shared history store and refer back to the same stable people, definitions, and source records.

Education and occupation facts carry stable knowledge-subject references selected from data-driven catalog tags. Knowledge and expertise queries may derive categorical familiarity, understanding, expertise, and practical experience from those facts without assigning an ideology or proposition position. Sparse proposition exposures, political beliefs, principles, public positions, commitments, and subject-knowledge records remain in the shared append-oriented history store, so progressive materialization preserves established political history.

The shared mind catalog and append-oriented history now support sparse personality tendencies, personal values, goal lifecycles, event appraisals, explicit perceptions, expiring temporary states, and durable decision explanations. These records are historically mutable through explicit linked records rather than fields generated during person materialization. Personality, values, political principles, proposition beliefs, expertise, memories, appraisals, perceptions, goals, and temporary context remain distinct.

World control is explicit: observer state has no controlled person, while person-control state identifies one stable person. The general decision evaluator can assess either NPC or controlled-person situations, but autonomous application of a major internal choice is rejected for the controlled person. Selecting someone in the diagnostic viewer does not change control.

This foundation is not formative-life gameplay or a complete family, relationship, career, household, resource, health, or autonomous character-development simulation. Development proposals are non-applying, and lightweight-person materialization does not manufacture mind records. See [Mind and Decisions](mind-and-decisions.md).
