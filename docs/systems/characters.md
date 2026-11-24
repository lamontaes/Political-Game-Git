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

Every person stores typed, stable biography facts for birth date, birthplace, dated residences, family relationships, education, and occupation. This is a closed union of currently supported record shapes because every shape has distinct required fields and validation; it is not a claim that arbitrary future biography belongs in a metadata bag. These `PersonFact` records are now a compatibility/background-summary layer: they retain stable IDs and their existing provenance, but they have no fabricated global append sequence and are not canonical detailed Stage 5 life truth. Birth date remains immutable core identity and birthplace may remain core origin detail. Facts are still factual records rather than memories or claims.

Lightweight people begin with identity, birth, birthplace, and current residence. Deterministic materialization can add compatible education and occupation facts while preserving every established record. Memories, event knowledge, statements, relationship interactions, mind histories, and decision traces live in the shared history store and refer back to the same stable people, definitions, and source records.

Stage 5 adds canonical detailed work, education, non-work organization participation, household/co-residence, kinship, partnership, care, child authority, resource/obligation, dwelling/occupancy/tenure, exceptional-commitment, and load-resolution histories around the same person ID. Canonical sequence-aware history wins when present; education, occupation, residence, and family facts remain immutable biography/expertise fallbacks or summaries rather than competing truth stores. Canonical constructors never create duplicate `PersonFact` records or finance/housing biography fields. Person materialization preserves all existing references and histories exactly and remains nondiegetic: inspecting an unrelated lightweight person does not append history, create balances/debt/housing, or consume another simulation stream.

Education and occupation facts carry stable knowledge-subject references selected from data-driven catalog tags. Knowledge and expertise queries may derive categorical familiarity, understanding, expertise, and practical experience from those facts without assigning an ideology or proposition position. Sparse proposition exposures, political beliefs, principles, public positions, commitments, and subject-knowledge records remain in the shared append-oriented history store, so progressive materialization preserves established political history.

The shared mind catalog and append-oriented history now support sparse personality tendencies, personal values, goal lifecycles, event appraisals, explicit perceptions, expiring temporary states, and durable decision explanations. These records are historically mutable through explicit linked records rather than fields generated during person materialization. Personality, values, political principles, proposition beliefs, expertise, memories, appraisals, perceptions, goals, and temporary context remain distinct.

World control is explicit: observer state has no controlled person, while person-control state identifies one stable person. The general decision evaluator can assess either NPC or controlled-person situations, but autonomous application of a major internal choice is rejected for the controlled person. Selecting someone in the diagnostic viewer does not change control.

Stage 5 supplies bounded formative/adult history construction, personal/household resource and sparse housing history, and meaningful relationship reconnection, but not a banking, credit, property-market, health, autonomous population-finance, or full autonomous character-development simulation. Child authority is structural and does not encode custody litigation or statutory powers. Development proposals remain non-applying, and lightweight-person materialization does not manufacture canonical mind or life history. See [Mind and Decisions](mind-and-decisions.md), [Core Life](life.md), and [Resources and Housing](resources-and-housing.md).

## Generated-person foundation and correctness boundary

Generated worlds use `person-v5` and the accepted `names-v1` starter corpus.
Person IDs, names, DOB, home jurisdiction, and appearance are person-owned;
appearance derives from the canonical person ID, not a chair, visual anchor,
name, or inferred demographic attribute. The compatibility demo still uses
`demo-person-v4` / `demo-names-v4`. PR #18's required-context constructor and
alternate home-jurisdiction seam remain unchanged.

Production selects ages 21–75. The stress profile retains age 18, age 88,
selected ages 22–69 near birthdays, and its explicit 1968–2004 leap-birth-year
cases. DOB construction normalizes the requested month/day to a valid date in
the candidate birth year before calling the calendar validator, then reconciles
the year with the selected age through unchanged `ageOnDate`. A copied February
29 may become February 28 when that birth year is not leap; the preferred
"today/tomorrow/yesterday" anniversary cannot always be literal in that case.
The selected age remains authoritative. Actual leap births remain covered;
canonical February 28 observance in non-leap comparison years is unchanged.
No age is stored as a second source of truth, and no extra RNG draw is consumed.

For the player office, an omitted seed (`/`) preserves the accepted Andre
Collins / Cameron Foster / Julian Reed fixture. Any explicitly supplied seed,
including `stage-6-5-run-a`, takes the generated route. An explicit empty or
whitespace seed retains the fixture adapter's fallback seed text but still uses
generated people. The developer route continues to use generated worlds.
Run B conversation and history, Run C annotations/reviews/draft instructions,
and D-Lite work/calendar prose resolve from canonical person IDs and authored
fixture-role references. Legacy-named semantic keys remain stable; they are not
a name lookup table. Inspecting or presenting people never rewrites them.

The repair changes only previously invalid or age-inconsistent generated DOBs
and the associated birth facts. It does not migrate existing saved people or
rewrite historical records. The normal default fixture and the accepted PR #18
serialized baselines are unchanged. See the
[correctness repair proof](../plans/completed/generated-person-correctness-followup.md).
