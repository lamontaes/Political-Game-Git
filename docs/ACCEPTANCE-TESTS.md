# Acceptance Tests

## Status Vocabulary

- **AUTOMATED NOW** — executable in the current repository and required to pass.
- **MANUAL NOW** — current viewer smoke check; useful but not a substitute for automated tests.
- **PLANNED LATER** — product acceptance contract for future systems. It is not implemented and must not be reported as passing in this build.

## Automated Now

The current suite is under `src/simulation/*.test.ts` and `src/persistence/*.test.ts` and runs in Vitest's Node environment.

### NOW-001 — Initial-world determinism

Given the same seed and generator version, when two demo worlds are created independently, their complete initial state is identical.

### NOW-002 — Action-sequence determinism

Given identical seeded worlds, when the same ordered advancement and materialization actions are applied, their resulting state and histories are identical.

### NOW-003 — Meaningful seed variation

Given different seeds, generated names or birth dates differ. A changed seed field or ID alone is insufficient. Lexington-Fayette retains the same jurisdiction-definition ID across worlds.

### NOW-004 — Time advancement records history

Given a loaded world, when time advances seven days, the date moves forward exactly seven calendar days and a system history event retains the new occurrence and recording dates.

### NOW-005 — Calendar correctness

Date-only arithmetic crosses month and leap-year boundaries correctly and rejects invalid dates or fractional movement.

### NOW-006 — Materialization preserves established facts

Given a lightweight person, materialization retains ID, generation key, name, birth date, home jurisdiction, every established fact, current world date, and existing history while adding compatible detail. Established fact kinds and explicit canonical-history constraints prevent conflicting procedural background.

### NOW-007 — Materialization is stable

Materialization is idempotent, does not create a fictional historical event, is independent of which person is materialized first, and produces the same detail regardless of the later date on which the person is opened.

### NOW-008 — IDs remain stable

Repeated creation yields the same IDs. Existing world, jurisdiction, person, fact, and event IDs survive time advancement and materialization. Event semantic keys are unique within a world, divergent actions use different keys and IDs, and all IDs in a resulting world are unique.

### NOW-009 — Events retain provenance

Existing events retain stable IDs, simulated timestamps, context, jurisdiction, and involved entity IDs after subsequent actions. Person history selects the same canonical event objects by person ID.

### NOW-010 — Invalid actions are atomic

Invalid time movement, missing entity references, duplicate event keys, contradictory construction facts, and incompatible history constraints throw before state changes. The input world remains structurally unchanged, and world construction defensively copies accepted caller entities.

### NOW-011 — Ambient entropy is absent

World creation, time advancement, and person materialization succeed when `Math.random` and `Date.now` are replaced with throwing functions.

### NOW-012 — Core is headless

In a Node environment without a DOM, the simulation API and full replay demo execute successfully. A source-boundary test and restricted-import lint rule reject React or UI imports from production simulation modules.

### NOW-013 — Rich context distinguishes similar events

Given two events with the same broad category, their separate locations, settings, participants, social pressure, choices, motivations, reactions, visibility, and tags remain independently queryable.

### NOW-014 — Truth survives contradictory claims and inaccurate knowledge

Given a later statement that contradicts an event, the statement is preserved with its provenance and truth relationship while the original event remains unchanged. Another person may hold only an inaccurate told-by version linked to that claim.

### NOW-015 — Memory is subjective and append-oriented

Different people may remember one event with different strength and interpretation. A later reinterpretation explicitly supersedes an earlier memory without deleting or altering either the event or earlier memory.

### NOW-016 — Life-history queries remain durable

Typed and tagged queries answer residence, experience before an age threshold, personal unemployment, a close relationship to someone affected by an event, and prior shared work without parsing prose or special-casing one event category.

### NOW-017 — Minor early events survive decades

Given a contextual teenage event, after forty simulated years its stable ID and original truth record are unchanged and an age-qualified tag query still finds it.

### NOW-018 — Serialization and SQLite preserve the graph

Versioned JSON serialization round-trips the complete world exactly and rejects unsupported or tampered envelopes. The SQLite repository saves, loads, lists, and replaces validated snapshots without introducing a browser or SQLite dependency into the simulation package.

### NOW-019 — Unusual combinations are not normalized

One person may simultaneously support collective bargaining, an abortion restriction, a clean-electricity standard, concealed carry, increased defense readiness, and universal public health coverage. No ideology or party bundle rewrites those proposition-specific records.

### NOW-020 — No opinion is a real sparse state

No proposition-exposure or private-belief record represents never encountered. A proposition-exposure record without a belief represents encountered with no formed view. Both remain distinct from explicit uncertainty, conflict, tentative conviction, low salience, and a withheld public position. Subject familiarity remains a separate knowledge dimension.

### NOW-021 — Related propositions may diverge

Two propositions in one issue retain their own stable parameters and may have opposing private positions without either position being copied to the other.

### NOW-022 — Private belief, public position, and commitment remain distinct

One proposition may have a supportive private belief, a public claim of being undecided, and a campaign pledge to oppose it. All three histories remain independently queryable and none overwrites another.

### NOW-023 — Belief and principle change history is append-only

A later private belief or principle record may supersede a compatible earlier record, preserving both dates, categorical dimensions, reason, trusted cue or evidence provenance, and stable IDs.

### NOW-024 — Principles do not synthesize positions

A person may endorse broad, potentially competing principles without receiving any new proposition belief.

### NOW-025 — Knowledge and conviction are independent

Deep subject familiarity and specialist expertise may coexist with an uncertain proposition belief. Minimal understanding and no expertise may coexist with a strong, firm belief.

### NOW-026 — Factual history supports expertise without ideology

Materialized education facts separately support categorical understanding/expertise, while occupation facts support practical experience/expertise. Their data-driven subject references create no political beliefs, ideology, or generated personality values.

### NOW-027 — Experiences are context, not automatic political causes

Recording a life event does not change any belief. A later authored belief may cite that immutable event as relevant context, and the event and link remain queryable after forty simulated years.

### NOW-028 — Political state remains sparse at catalog scale

A shared catalog containing more than two thousand propositions does not add blank belief fields to people. A person with three formed beliefs stores three belief records, and a domain query returns those sparse records without constructing a catalog-wide person vector.

### NOW-029 — Political records persist through JSON and SQLite

Snapshot format 3 preserves the policy catalog and all political record families exactly through deterministic JSON round trips and the Node-only SQLite repository. Unsupported older envelopes remain rejected until a migration exists.

### NOW-030 — Political actions replay deterministically

Given the same seed and ordered explicit political record operations, complete worlds, stable IDs, append sequence, and serialized snapshots are identical.

### NOW-031 — Belief changes expose dates and perceived provenance

Typed queries return the dated record for each actual private-position transition. Formation can resolve prior proposition exposure, biography, experienced events, memories, event knowledge, claims, relationship interactions, and subject knowledge; a canonical event the person neither experienced nor knew is rejected as omniscient context.

### NOW-032 — Knowledge assessments can be revised

A later explicitly superseding subject-knowledge record may revise an earlier categorical assessment downward or upward while preserving both records and the supporting factual biography. The latest explicit assessment, rather than a permanent maximum, is authoritative for the current profile.

### NOW-033 — History integrity rejects impossible provenance and ordering

Transitions and snapshot loading reject memories without direct event involvement or prior person-specific event knowledge, backdated memory supersession, self-sourced explicitly third-party provenance, incompatible statement/commitment source events, cross-record formation or source references that point forward in global append sequence even on the same date, unknown discriminators, invalid categorical values, and any history family stored out of append-sequence order.

### NOW-034 — Date-aware encounter queries survive historical backfill

When an older proposition exposure is appended after a later-dated public position or commitment, the opinion-state query still identifies the record with the latest effective date. A historical `throughDate` query returns only evidence available by that date, with append sequence breaking same-day ties.

## Manual Now

- Creating or reloading the demo shows the active seed, stable world ID, simulated date, Lexington-Fayette placeholder, and six generated people.
- Advancing time changes the date, records events, and updates the status message.
- Selecting a person does not change world state.
- Materializing a person preserves established facts and shows stored generated biography detail without raw personality values.
- The person timeline combines typed biography and canonical events; memories and relationship interactions remain separately labeled.
- Event details show timestamps, structured context, visibility, tags, participants, stable ID, and resolvable involved entities.
- Known-by rows show per-person believed content and provenance; claims show audience and relationship to truth.
- Relationship history shows explainable episodes and no raw relationship meter.
- Proposition exposures, private beliefs, public positions, campaign commitments, principles, complete knowledge/expertise histories, and resolved provenance appear in separate diagnostic sections without raw ideology or personality numbers.
- The placeholder warning remains visible and does not imply sourced officeholders, rules, or institutions.
- Seed, reload, advance, person selection, materialization, and event detail controls are keyboard reachable with visible focus.

## Planned Later

### LATER-003 — Legislation does not expose persuasion-point grinding

Given a legislative negotiation, normal gameplay does not expose a persuasion-point target, deterministic support threshold, or repeatable generic action loop that guarantees passage.

### LATER-004 — Substantive objections may require proposal changes

Given an actor with a substantive objection, persuasion alone need not resolve it; an amendment, removed provision, added safeguard, changed circumstance, or accepted failure may be required.

### LATER-005 — Changing provisions changes support for understandable reasons

Given a bill revision, affected actors may change support for reasons traceable to provisions, beliefs, goals, relationships, information, constituencies, incentives, and procedure.

### LATER-006 — Easy legislation can remain easy

Given broad agreement and favorable procedure, legislation may pass with little intervention; the game does not manufacture busywork merely to lengthen play.

### LATER-007 — Difficult legislation can require significant meaningful gameplay

Given substantive conflict or procedural difficulty, progress may require negotiation, amendments, coalition work, agenda control, timing, staff, or acceptance of failure rather than clerical repetition.

### LATER-008 — NPCs autonomously build careers in Observer Mode

Given no player character, NPCs autonomously enter, change, lose, and leave careers under the same simulation systems used in player games.

### LATER-009 — Lightweight NPCs can become important without contradictory retroactive biography

Given a lightweight NPC with established facts, later high-resolution activation can add relevant detail without contradicting biography, relationships, or history.

### LATER-010 — Adviser quality changes information and delegation without omniscience

Given advisers of different ability, expertise, incentives, and relationships, their reports and delegation differ in usefulness and reliability, but none reveals guaranteed truth.

### LATER-011 — Polling is uncertain and never exposes true electorate support

Given an election, polls expose estimates shaped by sampling, timing, method, nonresponse, turnout assumptions, and bounded randomness; they never expose true underlying support directly.

### LATER-012 — Political action remains distinct from belief, speech, and promise

Given concrete political gameplay behavior, actual actions receive proposition/provision-aware historical classification and remain distinct from the already implemented private belief, public position, and campaign commitment histories.

### LATER-013 — Geographic reputation remains differentiated

Given a character known in multiple places, familiarity, reputation, coalition support, and appeal may differ by geography rather than collapsing into one global value.

### LATER-014 — Third-party political memory affects later relationships

Given an event between two people that a third person witnesses or plausibly learns about, that knowledge can later affect the third person's choices or relationship without implying omniscience.

### LATER-015 — A returning player can reconstruct important context

Given a player returning after an absence, a briefing and archive can reconstruct important people, commitments, conflicts, changes, and unfinished matters from durable history.

### LATER-016 — Long-run person and place histories are explainable

Given a long-running save, a player can trace how important people, places, parties, coalitions, and institutions reached their current state.

### LATER-017 — Workload changes with responsibility and political intensity

Given increased responsibility or political intensity, the player faces more competing consequential demands and delegation decisions, not merely more routine clicks.

### LATER-018 — Losing an election does not end the character's life

Given a player character who loses an election, the world and character continue with civilian, staff, appointed, future electoral, family, or other available life paths; there is no generic game over.
