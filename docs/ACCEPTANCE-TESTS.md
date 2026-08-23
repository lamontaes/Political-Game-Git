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

The current snapshot format preserves the policy catalog and all political record families exactly through deterministic JSON round trips and the Node-only SQLite repository. Unsupported older envelopes remain rejected until a migration exists.

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

### NOW-035 — Personality tendencies remain sparse

A person may have no personality-tendency records or only a selected tendency and expression. The mind catalog does not create a full vector on every person, and materialization does not populate one.

### NOW-036 — Personal values may conflict

One person may retain simultaneous strong, provenance-bearing personal values that pull in competing directions. Neither is normalized away or converted into an ideology.

### NOW-037 — Persistent goals may conflict

One person may have multiple active goals with competing objectives and priorities. Each retains stable goal identity and an independent append-only lifecycle.

### NOW-038 — Values and political principles remain distinct

A personal value and a political principle with conceptually related labels remain different catalog definitions and history records; changing either leaves the other untouched.

### NOW-039 — Personality does not determine party or ideology

Recording or revising a personality tendency creates no party, ideology, proposition-belief, public-position, or commitment state.

### NOW-040 — One event can receive different appraisals

Given one objective public-criticism event, two involved or informed NPCs can append materially different meanings and interpretations, such as unfair humiliation and useful challenge, without duplicating or modifying the event.

### NOW-041 — An event need not create an appraisal

Recording an event creates no appraisal automatically. A person may have no appraisal, or only low-intensity or neutral meaning, without receiving a forced psychological consequence.

### NOW-042 — Appraisal remains separate from truth and memory

An appraisal may cite an event and compatible memory or event knowledge, but changing or superseding the appraisal changes neither canonical event truth nor either subjective source record.

### NOW-043 — Historical cutoffs prevent future leakage

A subjective-perception or decision evaluation includes only records satisfying both its as-of date and exclusive history-sequence cutoff. Later information, including a later-appended backdated record, cannot contaminate an earlier evaluation.

### NOW-044 — Contradictory perceptions may coexist

One person may retain incompatible, uncertain assertions from different available sources. The subjective projection preserves both rather than resolving them with diagnostic truth or an event-knowledge accuracy classification.

### NOW-045 — Hard constraints are absolute

An option blocked by a hard constraint is unavailable even when decisive soft considerations favor it. A hard constraint is not represented as a large negative preference.

### NOW-046 — Soft considerations may conflict

Supporting and opposing considerations can apply to the same or competing options without making either option unavailable, and both directions remain in the evaluation explanation.

### NOW-047 — A decision trace explains the selected option

A durable consequential trace preserves the evaluated options, applicable considerations, qualitative preferences, uncertainty, bounded variation when used, and the selected outcome.

### NOW-048 — A decision trace explains blocked options

A decision trace identifies every unavailable option and the stable hard-constraint keys and explanations that blocked it, including when no option remains available.

### NOW-049 — Decision evaluation is deterministic

The same world seed, material state, historical cutoff, actor, stable decision context, and options produce the same complete evaluation and stable IDs.

### NOW-050 — Unrelated actors do not perturb a decision

Evaluating another NPC before the target actor does not change the target actor's outcome, trace, or bounded random contribution.

### NOW-051 — Randomness cannot override a constraint

No keyed random contribution is capable of ranking a blocked option or making it selected.

### NOW-052 — Close choices may use bounded randomness

When enabled, only available options already within the close-choice window receive slight deterministic variation. Clearly separated options and evaluations with randomness disabled receive none.

### NOW-053 — Subjective context can produce a plausible non-optimum

An NPC can select an option that would not maximize an omniscient outside observer's outcome because the NPC's own perception, values, goals, relationship context, or uncertainty supports another plausible choice.

### NOW-054 — Controlled-person autonomy is protected

An evaluation may be created for the controlled person and a development proposal remains non-applying and marked as requiring player choice. Autonomous application of a major private-belief choice is rejected atomically. NPC application remains available in observer mode or for a non-controlled person.

### NOW-055 — Communicated spouse advice can affect evaluation

A spouse who is a stable person, has relevant subject expertise, has public communication and relationship history, and is perceived as credible may contribute a provenance-bearing trusted-cue consideration to the recipient's political evaluation. Expertise remains distinct evidence rather than making the cue correct.

### NOW-056 — Trusted advice does not dictate belief

Even a highly credible spouse cue remains one consideration among constraints and conflicting considerations; it does not copy the spouse's belief or guarantee the recipient's outcome.

### NOW-057 — Weak relationship cues have limited or no influence

A cue without the required communication and relationship provenance is excluded. A qualifying cue assessed with low source credibility has less importance than the same cue assessed as highly credible.

### NOW-058 — Encounter may end with no opinion

An NPC who has encountered a proposition can select no opinion or defer. Applying either outcome records the consequential reasoning trace but creates no private-belief record.

### NOW-059 — Expertise can coexist with uncertainty

A highly expert NPC may select defer, conflict, or another uncertain belief outcome; expertise does not supply a correct answer or force conviction.

### NOW-060 — Low knowledge can coexist with strong belief

An NPC with little subject knowledge may still form a strong private position when other subjective considerations support it. The result does not manufacture expertise.

### NOW-061 — A strong value does not map directly to policy

Recording a defining or central value creates no proposition belief. The value affects a political evaluation only through an explicit, provenance-bearing consideration in that decision context.

### NOW-062 — Different histories can produce different beliefs

Two otherwise similar NPCs with similar broad principles can evaluate the same proposition differently when their appraisals, knowledge, goals, or trusted relationships differ, while both outcomes remain deterministic for their own contexts.

### NOW-063 — Autonomous belief application stays append-only

Applying an NPC political-belief proposal first records its durable decision trace and then appends a new private belief or a compatible explicit supersession. It never rewrites the earlier belief.

### NOW-064 — Autonomous formation does not overwrite speech

Applying a private-belief proposal leaves every public-position record unchanged and separately queryable.

### NOW-065 — Autonomous formation does not overwrite commitments

Applying a private-belief proposal leaves every campaign-commitment record unchanged and separately queryable.

### NOW-066 — Personality can be reconstructed as of a date

A historical personality query returns the applicable tendency records through its date and append-sequence cutoff and cannot return a later superseding expression.

### NOW-067 — Values can be reconstructed as of a date

A historical value query returns the applicable value records through its date and append-sequence cutoff and cannot return a later change.

### NOW-068 — Goals can be reconstructed as of a date

A historical goal query returns the state available at its cutoff rather than a later completion, failure, abandonment, or replacement.

### NOW-069 — Appraisals remain historically reconstructable

A query for one person's appraisal of an event at an earlier cutoff returns the then-current interpretation rather than a later superseding reinterpretation.

### NOW-070 — Temporary state expires correctly

A temporary state is active only during its half-open effective interval. It is present in an in-range subjective projection, absent at the end date and afterward, and remains inspectable as history.

### NOW-071 — Snapshot save and reload preserve Stage 4 state

Creating and reloading a versioned snapshot preserves the mind catalog, control state, every Stage 4 record family, contiguous append sequence, decision evaluation details, and frozen source snapshots exactly.

### NOW-072 — JSON serialization preserves Stage 4 state

Deterministic JSON encoding and decoding round-trip the complete Stage 4 world graph exactly and reject an unsupported envelope version.

### NOW-073 — SQLite preserves the Stage 4 snapshot boundary

The Node-only SQLite repository saves, loads, lists, and replaces worlds containing Stage 4 records without moving the driver or platform dependency into the pure simulation.

### NOW-074 — Decisions execute headlessly

The general evaluator, subjective projection, and political adapter run in Vitest's Node environment without React, DOM, browser, or graphical dependencies.

### NOW-075 — The decision core has no runtime AI service

Production simulation imports and package dependencies contain no LLM, remote model, network, or external AI runtime required for mind or decision evaluation.

### NOW-076 — Stage 4 replay remains deterministic

Replaying the same seed and ordered Stage 1–4 actions produces identical complete worlds, IDs, history sequence, decision traces, and serialized snapshots.

### NOW-077 — Mind and decision integrity rejects invalid graphs

Runtime transitions and snapshot loading reject missing people or catalog definitions, invalid chronology or categorical values, non-linear supersession, impossible goal transitions, unavailable or forward source references, self-sourced third-party cues, missing communication or relationship provenance, invalid temporary intervals or cutoffs, stale durable evaluations, incomplete or mismatched source-snapshot references, invalid control references, and out-of-order history families.

### NOW-078 — Earlier stages remain regression-protected

All Stage 1–3 deterministic generation, biography, event/history, query, political-state, serialization, SQLite, and boundary tests remain green without weakening their assertions.

### NOW-079 — Open taxonomies survive an adversarial content comb

Valid namespaced cases absent from the design examples—including an extended cousin relationship, a coordinating event facilitator, strategic mentorship, co-led work, a community-assembly cue, an appointment subject, a comparative-deliberation reason, and constituent-testimony decision provenance—pass transition/load integrity. Namespace-aware experience and shared-work queries still produce their intended behavior.

### NOW-080 — Open categories retain semantic guardrails

Runtime decision evaluation rejects an unnamespaced subject. Every non-context decision consideration source requires at least one resolvable source reference, while an honestly labeled contextual premise may remain source-record-free. Open content keys therefore do not become arbitrary strings or provenance-free metadata.

### NOW-081 — Autonomous formation preserves belief dimensions

Two applied autonomous proposals may select the same support position while retaining different conviction, salience, and flexibility. Tentative support/opposition requires tentative conviction, but neither the selected side nor conviction silently determines salience or flexibility.

### NOW-082 — No-opinion readiness is not mislabeled risk

The political adapter's default reason for leaving a proposition unresolved is recorded as `context:opinion-readiness`. Applying that outcome records the durable decision trace without creating a private-belief record, provided the person actually encountered the proposition.

### NOW-083 — Architecture rules audit prior stages

The permanent Architecture Integrity Audit classifies affected Stage 1–4 categories, records confirmed/corrected/deferred/superseded dispositions, and treats earlier completion as no exemption. The audit records the future effective-rule-consumption contract without implementing mutable law or future institutions in Stage 4.

### NOW-084 — Organization identity survives changing profiles and detail

An organization retains one deterministic stable ID while effective-dated name, open classification, and location profiles change. Promoting it from lightweight to detailed preserves every prior profile/reference, and JSON reload preserves the complete history.

### NOW-085 — Multiple kinds of work coexist

One person may simultaneously hold paid organizational work, unpaid volunteer work, and independent self-directed work. Each has a separate stable relationship and role, and `Person` has no single current-career field.

### NOW-086 — Expected work is not current work

A future expected engagement is queryable and serializable before its start but is absent from active-work and life-load results. It becomes active only through a dated transition at or after its expected start.

### NOW-087 — Work lifecycle preserves history

Promotion, temporary leave, return, ending, and movement to another organization append status or role records. As-of queries return the prior role/status, and ending one relationship does not end another.

### NOW-088 — Stable organization identity establishes shared work

Two people with overlapping actual work at the same organization are recognized as former coworkers through the organization ID. Coincident employer text cannot override canonical work identities.

### NOW-089 — Households do not imply family

Unrelated people may be co-residents in one household without creating kinship, partnership, or care. Kin remain related while living in different households.

### NOW-090 — Households move without changing identity

Effective-dated household location history returns the former jurisdiction at an earlier cutoff and the new jurisdiction later while retaining the same household and memberships. A household record does not contain a dwelling ID.

### NOW-091 — Multi-residence is valid but duplicate primary residence is not

A person may have simultaneous primary plus secondary/shared membership when the chronology is valid. Starting another overlapping primary membership is rejected.

### NOW-092 — Partnership is independently historical

Partnership creation and ending are queryable without manufacturing kinship, co-residence, or care and without deleting earlier partnership history.

### NOW-093 — Care may be shared and cross-household

Multiple caregivers can have separate active responsibility records for the same recipient while living elsewhere. An open care classification absent from the initial examples passes validation without an engine branch.

### NOW-094 — Time demand preserves concurrency and attention

Equal expected-hour care profiles with mostly-concurrent/low-attention versus mostly-exclusive/continuous-attention context produce different exclusive-equivalent load. The source profiles and materially different contexts remain inspectable.

### NOW-095 — Rigidity and location create coordination pressure

Adding rigid, non-interruptible, location-constrained demand changes qualitative coordination pressure even when another commitment is flexible. Game logic consumes the dimensions rather than storing decorative labels.

### NOW-096 — Pushing has a delayed tradeoff

A first short push under high load can raise immediate output and create fatigue. Repeating the push while fatigue is active reduces the immediate benefit and future capacity.

### NOW-097 — Recovery can restore capacity

An explicit recovery period after reducing active demand can clear the derived fatigue and restore future capacity. Fatigue is an ordinary Stage 4 temporary-state record linked to its life-load resolution, not a second meter.

### NOW-098 — Life history obeys date and sequence cutoffs

A backdated organization/work record appended later is absent from an earlier exclusive-sequence cutoff and present at the current frontier. Expected future work is available from its record date but not active before its start.

### NOW-099 — Life derivation is deterministic and order-independent

The same semantic work/care/commitment inputs produce identical load assessment and history regardless of unrelated organization insertion order. Progressive person or organization detail promotion preserves established life history.

### NOW-100 — Life integrity rejects impossible graphs

Runtime transitions and snapshot loading reject dangling organization/person/jurisdiction references, pre-birth life records, invalid expected/active work chronology, invalid lifecycle or supersession transitions, out-of-order history, invalid taxonomy/provenance, overlapping primary residence, and a stored load result that does not match deterministic derivation.

### NOW-101 — Stage 5 persists headlessly

World schema 7 and snapshot format 6 round-trip every organization, work, education, participation, household, kinship, partnership, care, child-authority, commitment, load-resolution, life-source, and fatigue record exactly through deterministic JSON and the Node-only SQLite repository. The simulation and its Stage 5 tests import no React, DOM, browser, or SQLite runtime.

### NOW-102 — Real career diversity uses general records

Patterns represented by Feleti Teo, Elvira Nabiullina, Droupadi Murmu, Njoki Ndung'u, Tammy Duckworth, junior judicial careers, and citizen legislators fit combinations of ordinary organizations, work relationships, role/status histories, commitments, and care/time demand. No named person or career receives a special-case type or branch.

### NOW-103 — Stage 5.1 remains bounded

The implementation adds no formative-age content, adult career content/progression, finance, housing/property, relationship-maintenance gameplay, campaign, election, political-office, government, legislation, hourly calendar, polished UI, or player-facing raw personality/relationship/load number.

### NOW-104 — Child authority remains structurally independent

A parent living elsewhere may retain kinship and authority while a grandparent provides care and co-residence. A relative guardian may hold authority without a fake partnership or household relationship. An agency organization may hold authority while a separate foster or kin caregiver supplies daily care. Every dimension is independently queryable and none is inferred from another.

### NOW-105 — Education transfer preserves stable organization history

A student's transfer from School A to School B appends lifecycle history for two stable enrollments. Date-and-sequence queries reconstruct both, and a later School A rename preserves the same organization ID while its historical profile resolves to the earlier name.

### NOW-106 — Shared-school context uses identity, not name text

A teacher's work relationship and a former student's canonical enrollment establish earlier shared-school context through the same stable organization ID. They may later become coworkers or political allies without losing that history.

### NOW-107 — Participation remains distinct from education and work

A student may participate in debate at a school and belong to a separate church youth group without either becoming employment. Genuine volunteer service that functions as actual work remains a `WorkRelationship`; meaningful recurring participation load reuses a life commitment rather than a duplicate scheduler.

### NOW-108 — Expected and backdated records obey both cutoffs

A planned education record remains inactive until an explicit dated activation. A later-appended record with an earlier effective date is absent through an earlier exclusive-sequence cutoff and cannot become a perception or decision source there.

### NOW-109 — Materialization remains nondiegetic

Materializing an unrelated lightweight NPC preserves `history.nextSequence`, appends no in-world life history, and does not perturb unrelated deterministic RNG or history.

### NOW-110 — Legacy facts remain compatible but noncanonical

Existing education, occupation, residence, and family `PersonFact` records preserve their IDs and values through Run A JSON persistence. They receive no fabricated append sequence, do not override corresponding canonical Stage 5 histories, and are not duplicated by canonical constructors.

### NOW-111 — Open Run A taxonomies retain guardrails

Valid namespaced education, participation, and authority keys not named by the initial examples pass normal validation without an engine branch. Malformed or unnamespaced keys are rejected. Jurisdiction references remain stable IDs and an open non-state jurisdiction kind remains valid.

### NOW-112 — Eligibility is an injected future-rule consumer

An eligibility provider can deterministically return allowed or blocked decisions with validated structured reason keys for an actor, action, date, jurisdiction, and context. The life entity embeds neither a universal age threshold nor a jurisdiction law table.

### NOW-113 — Canonical life evidence is a historically available typed source

A Stage 4 perception, appraisal provenance, or decision may cite an actor-involved canonical Run A record through a validated closed record-family reference only when that record precedes both cutoff dimensions. Forward, later-appended, missing, or other-person-only references are rejected. Durable decision traces freeze the life evidence label and content actually used.

### NOW-114 — Run A persistence is exact

Deterministic JSON and Node-only SQLite save/load/list/replace preserve every Run A stable root, lifecycle record, append sequence, provenance object, and typed Stage 4 life-source reference exactly.

### NOW-115 — Run A integrity rejects impossible graphs

Runtime transitions and snapshot loading reject dangling education organizations, dangling person or organization authority holders, impossible participation chronology, invalid lifecycle changes, malformed open keys, and noncontiguous global sequence across the expanded history families.

### NOW-116 — No duplicate truth appears

Creating canonical education, participation, or authority records does not silently create a `PersonFact`, `WorkRelationship`, household membership, kinship, partnership, care responsibility, or other unrelated relationship.

### NOW-117 — Run A remains bounded

Stage 5 remains in progress. Run A adds no playable childhood or adult progression, resource or housing system, relationship-maintenance gameplay, generalized Stage 6 event engine, Stage 7 law or territory content, campaigns, elections, legislation, or polished/player-facing UI.

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
- The mind profile is explicitly labeled developer-only and shows separate personality-tendency, personal-value, goal, appraisal, perception, temporary-state, and recent decision-trace histories.
- Appraisal rows show the objective event separately from the person's meaning, and subjective perception is not presented as omniscient truth.
- Temporary states identify active or expired status; decision traces use qualitative option, blocker, consideration, source, and bounded-variation descriptions rather than raw scores or random values.
- Political beliefs formed through the adapter resolve their durable reasoning trace without exposing another person's private belief as a communication source.
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
