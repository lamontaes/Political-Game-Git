# Acceptance Tests

## Status Vocabulary

- **AUTOMATED NOW** — executable in the current repository and required to pass.
- **MANUAL NOW** — current player and developer viewer smoke checks; useful but not a substitute for automated tests.
- **PLANNED LATER** — product acceptance contract for future systems. It is not implemented and must not be reported as passing in this build.

## Automated Now

The current semantic suite is under `src/simulation/*.test.ts`,
`src/persistence/*.test.ts`, and `src/presentation/*.test.ts` and runs in
Vitest's Node environment. Run A browser proof is under `tests/e2e/` and runs
with Playwright Chromium.

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

Current world schema 15 and snapshot format 14 round-trip every organization, work, education, participation, household, kinship, partnership, care, child-authority, commitment, load-resolution, resource, obligation, dwelling, occupancy, tenure, life-source, fatigue/resource-pressure, generated-provenance, metric/observation/causal/effect/due/policy, incident/state/transition-plan, vitality/capacity, and evidence/discovery record exactly through deterministic JSON and the Node-only SQLite repository. Production simulation modules import no React, DOM, browser, or SQLite runtime.

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

### NOW-118 — One canonical character-history production path

Played, quick-generated, and manual/authored history plans use the same canonical transitions. They produce ordinary life/event/subjective record families rather than a biography blob, duplicate `PersonFact`, alternate event store, or privileged mutation path. Generated provenance is deterministic and distinct from manual authorship; event-backed consequences preserve simulated-event provenance.

### NOW-119 — Formative play is sparse, social, and subjective

Birth through 17 resolves through the 0–7, 8–12, and 13–17 pacing bands and a bounded set of consequential scenes, not weekly turns. Peer, teacher, mentor, friend/conflict, household move, school, activity, civic, teen-work, and future-preparation content creates ordinary stable people, organizations, structural life records, events, interactions, knowledge, memories, and appraisals where warranted. A lone choice never writes adult personality; repeated history may only produce an existing non-applying development proposal.

### NOW-120 — Adult paths compose shared life primitives

Apprenticeship composes canonical training enrollment, paid work, mentor interaction, commitment, and completed enrollment state. Civilian work and Guard/Reserve service can coexist; activation temporarily inactivates rather than destroys civilian work, and return resumes it. A PCS relocation changes ordinary household location history, including an open OCONUS location fixture, without a foreign-government system.

### NOW-121 — Run B eligibility, determinism, persistence, and scope hold

Teen work asks the injected eligibility provider; a block returns structured reasons and writes no forbidden work truth. Quick generation is deterministic and unaffected by unrelated materialization. JSON and SQLite preserve generated history, bounded context people, provenance, global sequence, and references exactly. Run B adds no Run C finance/housing, Stage 6 generalized event engine, Stage 7 law/territory/institution content, foreign-government simulation, or polished UI.

### NOW-122 — Work compensation produces exact actual income

A paid work relationship has effective exact amount/cadence terms. Explicitly resolving a pay period appends a source-organization-to-person outcome and changes tracked liquid position by the integer minor-unit amount. Terms are selected at the settled period start, so a December period paid after a January raise still uses December terms; a terms change inside one period is rejected until prorating exists. A raise preserves prior historical terms, later periods use the new amount, concurrent jobs retain distinct flows, unpaid work cannot acquire monetary compensation, and expected future pay remains inactive until explicitly activated and resolved.

### NOW-123 — Expected flows and actual outcomes remain distinct

An arrangement and its cadence do not imply payment. Completed, partial, missed, and blocked outcomes preserve attempted and transferred amounts plus structured reasons. One flow cannot commit a duplicate or overlapping inclusive settlement period, and corrupted persisted duplicates fail integrity. Only the committed transferred amount changes tracked positions, with equal debit/credit where both endpoints are tracked; automatic cadence posting and arbitrary balance mutation do not exist.

### NOW-124 — Equal salary can produce unequal practical capacity

Two people with equal salary outcomes but different housing, support, and debt obligations receive materially different structured affordability results. The query preserves active same-currency obligation buckets by exact cadence and uses only the caller's stated comparable cadence bucket to explain available, strained, or blocked capacity; it never fabricates a weekly-plus-monthly money total. The result uses exact liquid evidence and active obligation IDs, not a wealth, financial-health, or credit score.

### NOW-125 — Obligations and debt constrain without a banking simulator

A stable major obligation remains separate from its flow terms and actual payment outcomes. Optional debt principal is reduced only by committed linked payments and cannot be overpaid. Outstanding obligations constrain affordability without accounts, purchase ledgers, interest products, amortization tables, credit reports, or bankruptcy procedure.

### NOW-126 — Financial support does not invent structural relationships

A person can support another person in a different household. Care may justify a separate cost/obligation, but creating, paying, changing, or ending it does not create or end household membership, kinship, partnership, care responsibility, or child authority.

### NOW-127 — Housing identities and movement remain separated

One stable household can rent dwelling A, move while hosted in dwelling B, and later occupy and own dwelling C. Historical occupancy and tenure remain queryable. A household member may reside without tenure; an owner may remain a nonresident; and moving neither recreates the household nor transfers ownership.

### NOW-128 — Assigned and multiple housing use general primitives

Institutional or military assignment uses ordinary dwelling, occupancy, and tenure records rather than a special ontology. Simultaneous secondary/shared residence remains valid without permitting overlapping primary occupancy or imposing a one-dwelling/one-household assumption.

### NOW-129 — Relationship effort is causal history, not upkeep points

A meaningful call/visit/support/reconnection can append ordinary time, event, interaction, knowledge, memory, and appraisal records. A meaningful missed opportunity is later evidence because an opportunity and response existed, not because a timer decremented. No `relationshipMaintenance`, closeness, or monthly decay field is canonical.

### NOW-130 — Long inactivity does not erase a relationship

People may reconnect after years. The derived qualitative continuity view uses earlier shared history plus the new episode; a long gap does not delete the relationship or automatically become hostility, and the projection is not persisted as truth.

### NOW-131 — Concrete resource pressure enters Stage 4 through evidence

An actor-relevant missed/blocked/partial major outcome may support direct knowledge, an appraisal, a bounded temporary `life:resource-pressure` state, an explicit perception, and decision-source snapshots. The path uses typed provenance and creates no universal financial-stress, happiness, wellbeing, or personality score.

### NOW-132 — Run C life sources obey actor, date, and append sequence

Resource and housing life-source references resolve only when the record exists, involves the actor directly or through an available household membership, and precedes both cutoff dimensions. A later-appended backdated outcome or occupancy cannot enter an earlier perception or decision solely because its effective date is old.

### NOW-133 — Run C uses open taxonomies with structural integrity

Unprompted valid resource basis/cadence/restriction, obligation, dwelling classification, occupancy, and tenure keys pass ordinary validation without named branches; malformed keys fail. Runtime and load integrity reject dangling entities, invalid chronology/lifecycle, unsafe money, overdraft, and noncontiguous history. Stable jurisdiction identity remains open and territory-compatible.

### NOW-134 — Character-history convergence and materialization neutrality continue

Played, quick-generated, and authored plans delegate resource and housing transitions to the same canonical writers and persist no resolver-only stable-key fields or biography blob. Inspecting/materializing an unrelated lightweight person creates no money, debt, housing, or relationship history and does not advance global sequence. Canonical Run C construction creates no duplicate `PersonFact` or structural relationship truth.

### NOW-135 — Run C persistence is exact and Stage 5 is continuous

Deterministic JSON and Node-only SQLite save/load/list/replace preserve exact money, every Run C root/state/outcome, global sequence, provenance, links, and typed source; duplicate/overlapping settlement periods in corrupted deserialized history fail integrity. The current maximum cross-system integration gate is the continuous Stage 5 scenario plus SQLite round-trip coverage: it composes quick-generated formative household/care/authority, school/peers/activities, adult training/work, partnership, compensation, resource position, housing obligation/payment, a missed housing outcome, dwelling/occupancy/tenure, typed knowledge/appraisal/temporary-state/perception/decision evidence, cutoff safety, and reconnection through stable IDs and canonical histories. All pre-Run-C tests remain meaningful.

### NOW-136 — Exact non-money quantities retain units and precision

Equivalent safe-integer rational values normalize to one reduced numerator/positive-denominator form with a validated open namespaced unit. Compatible addition/subtraction/comparison is exact; malformed denominator/unit, incompatible-unit arithmetic, noncanonical loaded values, and unsafe intermediate/final arithmetic fail instead of rounding. JSON round-trip loses no precision, and Stage 5 exact money remains a distinct metric-value variant with currency identity.

### NOW-137 — Metric definitions, scopes, and periods prevent false global values

The deterministic world-metric catalog validates stable IDs/keys, open domain/tags, quantity-or-money kind, expected unit, stock/flow/rate/index nature, point/interval requirement, optional denominator, and aggregation limitation. State always names a stable jurisdiction plus optional open segment. Point and interval periods remain explicit and chronological; no 50-state list, one-field-per-metric world schema, unscoped global value, unsupported-jurisdiction observation, implicit zero, or display-string parsing exists.

### NOW-138 — Canonical metric truth is append-oriented and cutoff-safe

One exact metric/scope/period admits one initial canonical state. Any correction explicitly supersedes the latest exact match, preserves the earlier record, and cannot be recorded before its predecessor; crossing metric/scope/period is rejected. Same-day correction ordering remains sequence-safe. Exact-period and most-recent-period queries apply recording date plus exclusive sequence, so a later-appended backdated correction is absent from an earlier cutoff and an old corrected period does not become the newest reference period; legitimate late backfill of a different scope or period remains valid.

### NOW-139 — Observation sources, vintages, and uncertainty remain separate from truth

Independent source series may publish different exact estimates for the same truth. Revisions remain in the same metric/scope/period/series, explicitly supersede the prior vintage, cannot be recorded before that predecessor, and become latest only after release/recording/sequence availability. Same-day revision ordering remains sequence-safe. Range and margin-of-error uncertainty require compatible units/currency, ordered bounds, nonnegative margin, and optional exact share confidence. State never fabricates observation; observation never creates or mutates state; all-series queries return competing sources rather than arbitrarily selecting one.

### NOW-140 — Statistics are not omniscient

Committing truth or an observation creates no person knowledge. An explicit ordinary public-release event may involve the observation, after which an existing public-record `EventKnowledgeRecord` can teach one person while another remains unaware. Historical cutoffs before the release/knowledge append sequence expose neither later evidence nor subjective access. No statistics-specific knowledge store or media system exists.

### NOW-141 — One future-transition mechanism is authoritative over time

Scheduling creates one stable due identity and scheduled history with a future date, open transition key, stable canonical references, jurisdiction/provenance, and no opaque payload, recurrence, closure, formula, or copied domain truth. The closed state vocabulary is runtime- and load-validated. A saved world with a latest scheduled item due on its current date is valid pending work, while one strictly before the current date is invalid. `advanceWorld` selects due-today and later crossed items, resolves them by due date then creation sequence through injected deterministic handlers before advancing past their due date, appends one resolved/blocked/cancelled terminal state and optional ordinary outcome event, never reruns terminal items, and preserves prior no-due behavior. Handlers can use canonical validating writers to append truth, ordinary outcomes, and later follow-on schedules without a privileged write path.

### NOW-142 — Due transition failure is atomic and inspectable

Past/impossible scheduling, missing references, malformed keys/status, invalid terminal chronology, rewriting existing scheduler history, and invalid outcome links fail integrity. Every due-today/crossed transition key is preflighted; an unknown or throwing handler returns no partial durable world. The original immutable input remains exact. Loaded due-today work is recoverable through the next authoritative advance, while corrupted strictly overdue, unknown-status, or supersession histories fail the permanent integrity gate.

### NOW-143 — Stage 6 Run A persists and extends the permanent maximum-current gate

At the accepted Run A checkpoint, world schema 10, generator `demo-world-v10`, snapshot format 9, and materializer 4 preserved the metric catalog, exact quantities/money, state corrections, observation sources/vintages/uncertainty, due identity/state, global sequence, provenance, and references through deterministic JSON and Node-only SQLite save/load/list/replace. The continuous character retained jurisdictional metric truth, a differing public observation, explicit one-person knowledge, and an exactly-once future transition with one linked ordinary outcome event while retaining formative, education, work, household/care, resources/housing, relationship, appraisal, temporary-state, perception, and decision history. Later runs extend rather than replace this gate.

### NOW-144 — Causal identity and ancestry remain distinct from occurrences

An ordinary `HistoricalEvent` can source a stable append-oriented causal process without becoming a duplicate narrative event. One root can fan into multiple effect activations; a downstream process can cite an earlier causal parent; distinct-root queries deduplicate correlated branches; and independent roots remain separate even when they target the same metric. Missing/forward/self/cyclic ancestry is rejected.

### NOW-145 — Exact response mechanisms preserve phase and dimensional meaning

Linear and bounded nonlinear activations use exact rational factors and typed quantity/money magnitude bases. A point activation phases at its target point rather than a later evaluation date: a January point remains zero for a February-onset effect even when evaluated in March. An interval total stores its exact calibrated interval and cannot apply unchanged to a different month, quarter, or year. Its causal phase is the documented earlier inclusive midpoint of the target interval, so wholly pre-onset and post-expiry intervals are zero while overlap behavior is deterministic. Tests prove exact partial ramps, maturity, threshold blocking, target bounds, append-sequence deterministic same-date order, and fractional-minor-unit rejection. Wrong target kind/unit/currency, missing/malformed/incompatible magnitude basis, invalid timing, and unsafe arithmetic are rejected; no formula language or opaque callback is serialized.

### NOW-146 — Effect activation does not silently mutate metric truth

Creating a causal process or activation changes no metric state and grants no person knowledge. Explicit evaluation starts from a named historically available baseline, returns every period-compatible contribution and distinct root, and preserves independent provenance. The deliberate result writer uses `recordWorldMetricState`, explicitly supersedes latest same-period truth, and cites baseline plus contributing activation IDs. Advancing time alone creates no economy record.

### NOW-147 — Labor identities are coherent and derived

Same-scope/same-point resident, labor-force, and employed counts derive unemployed population and exact unemployment share. Missing inputs or a zero denominator return explicit unavailable state rather than a fabricated zero. Negative counts, labor force above residents, and employment above labor force fail. Unemployed count/rate definitions reject independent canonical writes.

### NOW-148 — Nominal income, cost, and aggregate proxies remain bounded

An unchanged nominal aggregate-income record plus a changed cost-level record produces a changed exact purchasing-power projection retaining both source IDs without mutating income. Missing/nonpositive/incompatible inputs do not fabricate results. Consumption demand, output activity, labor income, and housing pressure remain typed aggregate metric records and create no people, organizations, firms, goods, markets, or hidden tick.

### NOW-149 — Fiscal continuity derives balance from exact sources

Government revenue/outlays are exact same-period money flows and government debt is a separate exact point stock. Fiscal balance derives revenue minus outlays and retains both source-state IDs. Different currencies, periods, or scopes fail, and the derived fiscal-balance definition cannot be independently written. No government account, appropriation, tax statute, agency budget, debt instrument, campaign finance, or organization accounting is created.

### NOW-150 — Run B history is cutoff-safe, non-omniscient, and persistent

Effective/recording date plus exclusive global sequence gates every causal/effect query; later-appended backfill is absent from earlier sequence views. Causal/economic truth becomes subjective only through the existing observation → ordinary release event → person knowledge bridge. At the accepted Run B checkpoint, world schema 11, metric catalog v2, causal catalog v1, generator `demo-world-v11`, snapshot 10, and materializer 4 preserved definitions, ancestry, activations, exact contributions/source references, and evaluated metric truth through deterministic JSON and Node-only SQLite save/load/list/replace.

### NOW-151 — The permanent maximum-current gate includes causal economy

The continuous Stage 5 life/resource/housing/relationship/Stage-4 scenario retains Run A quantitative observation and future-transition behavior, then adds an ordinary root occurrence, one root fanning into output and housing effects, an independent second root affecting output, explicit canonical aggregate evaluation, a differing public observation known only by the chosen person, root deduplication, historical before/after cutoffs, exactly-once due resolution, and exact JSON round-trip. Run C extends this same gate rather than replacing it; Run D incidents, Run E mortality/evidence, Stage 7+, and UI remain absent.

### NOW-152 — Quantitative policy operations are exact and typed

One stable alternative owns typed set-level, absolute-change, relative-change, share-of-baseline, cap, and floor operations plus an optional typed trigger. Each operation names one primitive metric, exact scope, compatible point/interval period, and exact quantity or integer-minor-unit money value. Unit, value-kind, currency, period, malformed-key, fractional-minor-unit, and unsafe-arithmetic mismatches fail; no proposition parsing or expression language exists.

### NOW-153 — Baselines and estimates are frozen historical evidence

An immutable baseline revision preserves exact expected value, source frontier, assumptions, uncertainty, provenance, predecessor, and global sequence. An estimate cites the exact revision and freezes its baseline-versus-alternative consequences. Later actual truth, later revisions, or later-appended backfill do not rewrite the estimate and remain absent from earlier exclusive-sequence views.

### NOW-154 — Projection and implementation are different actions

Creating an alternative, operation, baseline, implementation profile, or estimate creates no effect activation and mutates no metric truth. An explicit allowed/triggered realization creates one actual causal child whose sole parent/source lineage is the frozen estimate and compatible exact operation-derived Run B effect activations; blocked or untriggered attempts create none. A stale estimate cannot be scheduled or realized, and an alternative cannot apply a second full/partial effect. Canonical resulting metric truth is committed only through the existing Run B evaluator/writer.

### NOW-155 — Implementation preserves five independent constraints

Authority, funding, administrative capacity, enforcement/compliance, and uptake/participation remain five separately evidenced exact factors. The bounded aggregate is their exact product. Authority denial blocks realization; limited funding or capacity produces a partial result without becoming a universal feasibility score or institutional-law claim.

### NOW-156 — Policy magnitude remains degree-sensitive and bounded

Behavioral tests distinguish 0.1%, 10%, and absurd-scale proposals using exact arithmetic. Explicit caps and implementation factors bound consequences where authored, unsafe arithmetic fails, and different magnitudes do not collapse to identical flavor text or a binary support flag.

### NOW-157 — Distribution is explicit and territory-compatible

Multi-jurisdiction policy is represented by separate operations over stable jurisdiction/open-segment scopes. An unprompted valid jurisdiction/segment key works without an engine branch, while malformed keys fail. No national magic allocation, 50-state enum, uniform sub-state hierarchy, or territory-specific content is introduced.

### NOW-158 — Policy knowledge and decisions remain actor-specific

A policy estimate becomes available to one actor only through an ordinary review event and that person's provenance-bearing event knowledge. The decision adapter consumes only that explicit knowledge plus actor-supplied interpretation and existing subjective sources. One informed actor can choose the smaller of two alternatives without granting another person knowledge or writing a universal ideology, opinion, or feasibility score.

### NOW-159 — Delayed policy uses the one future-transition mechanism

A delayed realization schedules exactly one typed Run A due item for one current estimate, due at the earliest operation start with a shared jurisdiction only when all operations share it, and resolves exactly once through the ordinary handler/terminal lifecycle. Duplicate, stale, pending-after-realization, and creation-frontier-impossible policy due records fail integrity: at the due record's own sequence, its estimate must be current and an effect-producing estimate must not follow an earlier full/partial realization of its alternative. A schedule that was valid when created remains historical evidence if later superseded or precluded by an already-implemented alternative; it terminally cancels at the frontier with a typed reason and creates no substitute/second effect. It adds no recurrence, second scheduler, hidden policy tick, or automatic metric mutation. Point and interval consequences retain Run B's exact magnitude-basis and phasing rules.

### NOW-160 — Run C persists and extends the permanent maximum-current gate

World schema 12, generator `demo-world-v12`, metric catalog v2, causal catalog v1, snapshot 11, and materializer 4 preserve all six policy families, exact values, sources, causal/effect links, due references, actor knowledge, provenance, and global sequence through deterministic JSON and Node-only SQLite save/load/list/replace. The permanent scenario carries one continuous Stage 5 life through Run A observations/due work, Run B causal economy, and two Run C alternatives; the informed actor selects the smaller one, exactly linked realization fans into correlated effects once, later canonical output is queryable, old cutoffs remain safe, and JSON round-trip is exact. Run D, Run E, Stage 7+, and UI remain absent.

### NOW-161 — Incidents are explicit, exact, causal, and non-omniscient

Possible incidents remain catalog definitions rather than history. Explicit cutoff-aware evaluation reports typed metric/event/incident-state prerequisite and blocker evidence, exact bounded likelihood and modifier evidence, a non-consuming keyed integer RNG draw for probabilistic incidents, and independent exact exposure/vulnerability/resilience inputs with the documented impact share. Missing required truth is unavailable and cannot fire an incident. A committed or loaded occurrence reconstructs its complete evaluation through the same core at its exact stored cutoff; drift in likelihood, rule/modifier sources, RNG, risk factors, consequence scaling, or outcome rejects. A committed occurrence writes ordinary onset/phase events, one durable incident/root/state history, and exactly linked Run B effects; a policy and an incident may affect the same metric with distinct roots. Incident truth creates no person knowledge. Wrong definitions, snapshots, shares, root/event/effect links, state supersession, or phase events reject through write/load integrity.

### NOW-162 — Incident follow-ons reuse authoritative time exactly once

One incident transition plan schedules one ordinary future due item with exact plan/date/scope/provenance references only while the plan's active source state still equals the active state at due-item creation. A normal due handler writes one meaningful phase event and one superseding state, then terminally resolves. Duplicate or fabricated generic due work, unavailable plan references, terminal-at-creation plans, source-state drift at creation, and corrupt JSON reject. A once-valid follow-on made obsolete by later resolved/advanced incident history terminally cancels with a typed reason so `advanceWorld` can cross the due frontier. JSON and Node-only SQLite preserve pending and terminal incident history exactly; the permanent cross-system scenario retains Stage 5 life/resources/Stage 4 decisions, Run A metric/due history, Run B effects, Run C policy realization, and a separately rooted actor-initiated incident with a resolved typed follow-on.

### NOW-163 — Mortality is exact, annual, explicit, and materialization-bounded

Versioned mortality tables contain strictly ordered explicit integer ages and canonical bounded exact shares; unsupported ages reject rather than interpolate. Only an explicit writer may schedule a future birthday check for a materialized living person. One domain plan maps to exactly one Run A due item, one person/year identity, and one active check; generic bypasses, duplicate plans/items, wrong birthdays, probabilities, tables, provenance, or creation frontiers reject. February 29 uses February 28 in non-leap years. No time advancement path scans people or performs daily mortality.

### NOW-164 — Keyed mortality, death, and obsolete work are reconstructible

The same seed, person, table, year/date, and age reconstruct the same integer draw and result despite unrelated RNG use. Exact zero survives and schedules exactly one next birthday when that same table supports the next age; exact one dies once and schedules none. Death links one ordinary `person.died` event, one durable death record, and one result exactly. A separately caused earlier death makes a once-valid pending check terminally cancel rather than produce a result or deadlock time. A persisted handler checkpoint resumes without rerolling, duplicating a result, or duplicating follow-on work. Birth, death occurrence, and exclusive sequence make `isPersonAliveAt` backfill-safe while the deceased person's identity and historical graph remain queryable.

### NOW-165 — Functional capacity uses append-only history and one actor gate

A living person defaults to capable, may become limited or incapacitated, and may later recover through exactly superseding ordinary capacity-change history. Cutoff queries preserve earlier status and reject post-death changes or corrupted chains. The common eligibility boundary blocks deceased and incapacitated actors with structured reasons; limited status is not universally blocked. Actor-initiated incidents use the same gate, while ordinary historical references about deceased people remain valid.

### NOW-166 — Objective evidence exists separately from discovery and knowledge

An event/incident-linked artifact persists its open kind, created/recorded chronology, canonical sources, public/restricted/private/sealed metadata, provenance, and sequence while granting zero knowledge. Explicit discovery writes one exact private ordinary event, one person/artifact discovery, and one direct event-knowledge record for only that person. Another person and the artifact's source event remain unknown. Malformed sources, access, chronology, identities, event/knowledge links, duplicates, pre-birth/deceased discovery, and date-plus-sequence leakage reject.

### NOW-167 — Run E persists and completes the permanent Stage 6 integration gate

World schema 15, generator `demo-world-v15`, snapshot 14, vitality catalog v1, and all Run E families round-trip exactly through JSON and Node-only SQLite save/load/list/replace. The permanent scenario is one continuous Stage 5→Run E history: life/resources/relationships and Stage 4 subjectivity; Run A truth, observation, and due work; Run B causal economy; Run C policy; Run D incident/follow-on; capacity and recovery; objective evidence discovered by one person; deterministic mortality and death; continued relationship/resource/history identity after death; and no automatic estate transfer. Deterministic demo replay and the production simulation dependency boundary remain intact. Stage 6.5 presentation composes this truth without changing its semantics; Stage 7 institutions/law remain absent.

### NOW-168 — Run A defaults to a genuine player-facing office scene

The normal browser entry point loads the deterministic political-office scene,
not only the diagnostic dashboard. The warm environmental composition remains
primary while the live bottom-left civic plaque, mixed-density right pins, and
contextual surfaces remain restrained. The diagnostic viewer remains reachable
at `?view=developer`.

### NOW-169 — The dossier is an independently tested epistemic projection

The Run A selector returns qualitative personally-known, institutionally
accessible, publicly discoverable, reported, inferred/uncertain, and unknown
fields. It shows name, role, known age, an accurately named birthplace or
residence when supported (otherwise unknown hometown), relationship/read, three
known facts, recent interaction, and unresolved context without numeric meters.
`homeJurisdictionId` alone never supplies a hometown. The fixture contains a
canonical private-belief rationale that is absent from both the projection and
browser DOM.

### NOW-170 — Person interaction is immediate and mutually exclusive

Activating the in-scene person opens the anchored contextual action menu with
Inspect directly available. Inspect replaces the menu with the subjective Your
Read panel; the action menu is not left underneath or alongside it. Close and
Escape return to the scene.

### NOW-171 — Permanent shell behavior is bounded and dark

The bottom-left time/date/location plaque is clickable, has no disclosure
arrow, and opens navigation upward. There is at most one submenu cascade and
its computed background is not white. The right tray rests mostly small, the
current briefing may be normal, a deterministic fixture can be expanded, and a
manual pin size survives other inspectorial actions and later automatic sizing.

### NOW-172 — Civic learning requires an explicit learned action

Opening the committee-referral explanation changes no learned state. The
explicit Mark as learned button and Shift + left click add the allowlisted
concept to versioned browser storage without changing simulation time. The
resting marker then disappears, persistence survives reload, and the learned
reference remains accessible from navigation. Malformed or unknown persisted
concepts are ignored.

### NOW-173 — Run A inspection cannot advance simulation time

The presentation reducer preserves its simulation-date and action-sequence
snapshots across person selection, Inspect, dossier close, navigation, submenu,
pin sizing, civic help, and learned-state actions. Browser tests confirm the
rendered date remains `2026-01-05` and action sequence remains zero through the
same flows. No Stage 6 transition is changed or invoked.

### NOW-174 — Scene placement and core input paths are valid

The seated-person layout keeps the scene-placement anchor distinct from its
compatible character pose/configuration and accepts only bounded scale,
floor-plane contact, a chair-contained physical footprint, nonintersecting desk
footprint, and lower-body desk-occlusion metadata. Invalid floating, scale, and
desk-intersection cases reject semantically. These metadata assertions are
deterministic safeguards, not proof of actual CSS-rendered geometry. The person,
action menu, Inspect,
dossier close, civic learning, pin, navigation, and submenu use semantic
controls with visible focus and keyboard activation.

### NOW-175 — Deterministic fixtures and browser failure evidence exist

Named URL fixtures reproduce normal, person-menu, dossier, civic-learning,
mixed-pins, navigation, and submenu states. Playwright verifies the default
surface, shell, epistemic filtering, time invariant, learning persistence,
keyboard path, and manual pin sizing. Failed tests retain traces and screenshots
plus console/error output, and CI uploads available failure evidence.

### NOW-176 — Run B has a real multi-person scene and direct Talk entry

The deterministic office contains the controlled player perspective plus Andre
Collins and Julian Reed as active NPCs at separate valid visual-estimate scene
anchors. Both are visibly readable. Activating either person opens the existing
immediate menu with Talk directly alongside Inspect and Pin person. Reed is an
actual listener/participant in committed turns, not decoration.

### NOW-177 — Addressee, audibility, and physical presence remain distinct

One session can switch Collins, Reed, and Everyone without restarting. Normal,
Quiet, and Private are a separate closed presentation control. Explicit bounded
room data identifies physical presence, active participation, eligible
addressees, and reasonable listeners. Normal and Quiet resolve different
listener sets for a single addressee. The occupied office disables Private with
a natural nearby-person explanation; a separate deterministic two-person
context proves a genuine private turn without distance acoustics. A pending NPC
may respond only when that NPC belongs to the current resolved listener set.
Quiet-to-Reed therefore preserves an unheard Collins contribution without a
response or canonical consequence; switching that same state to Normal may
resolve and consume it exactly once.

### NOW-178 — Conversation presentation keeps the office primary

Talk opens a compact nonmodal lower-screen strip containing only current
addressee, audibility, hearing context, current NPC dialogue, relevant intent
choices, transcript, collapse, and close controls. Both NPCs, the scene,
bottom-left cluster, and right pins remain visible and usable. Selected state is
clear without portraits, wheels, ears, cones, outlines, or targeting rings.
Keyboard focus moves from the person menu into the intent controls and every
control has semantic labels and selected-state communication.

### NOW-179 — Ephemeral conversation actions cannot mutate World

Opening/closing, switching addressee, switching audibility, opening/closing the
transcript, and collapsing/resuming preserve the exact serialized World,
`currentDate`, `actionSequence`, and history frontier. Conversation state stores
no canonical beliefs, claims, knowledge, perceptions, relationship records, or
decision traces.

### NOW-180 — A committed turn composes existing same-date canonical history

A valid substantive turn returns a new immutable World plus bounded semantic
and player-facing results. Where an NPC genuinely decides, evaluation is NPC
only and its durable trace is recorded immediately before the turn event. The
adapter then composes an ordinary event, unknown-truth claim, direct presence
knowledge, claim-linked told-by knowledge, heard-claim perception, and only
meaningful qualitative relationship history. Event participants and listeners
match resolved room semantics. No `overheard` knowledge source, formal public
position, campaign commitment, or private-belief rewrite is introduced.

### NOW-181 — Conversation identity, ordering, and replay are deterministic

Stable session identity derives from World, scene, starting history frontier,
and ordered participants; each committed turn adds a positive local ordinal.
Duplicate turn submission is rejected before a new write. Identical World,
session, addressee, audibility, and intent reproduce the same semantic result,
dialogue, canonical history, and serialized snapshot. Malformed sessions/turns
fail without mutating input.

### NOW-182 — Conversation keeps canonical time unchanged and protects controlled-person autonomy

Every turn record uses the current `IsoDate`; `World.currentDate` remains
unchanged, `World.currentMoment` remains unchanged, and same-day causal order is
global history sequence. `World.actionSequence` remains unchanged. Room
validation and the existing autonomous-application guard prevent the controlled
person from becoming the NPC decision actor.

### NOW-183 — Hidden state and internal decision mechanics remain absent

Available intents derive from bounded shared/known office context. Hidden
private-belief text, decision scores/ranks/random contributions, source
snapshots, relationship points, probabilities, stable IDs, canonical debug
fields, and warnings about future memory remain absent from player dialogue,
transcript, ordinary visible DOM, and accessibility text. Runtime remains
network-independent and uses deterministic authored phrase families rather than
an LLM.

### NOW-184 — Contextual identity and listening remain natural

Character identification appears only on hover or keyboard focus, stays
visually attached just above the character, and remains clear of the bottom-left
shell. The label is suppressed whenever the action menu, Your Read panel, or
conversation already makes identity explicit. The listening intent is labeled
`Listen`; its transcript action is `(You listen.)`, never a quoted player line.
Listen availability derives from fixture-specific pending contributions rather
than a count of earlier Listen turns. Collins and Reed may contribute in
sequence where both have something relevant pending, but only when the pending
speaker is in the current resolved listener set. An unheard pending contribution
is preserved and Listen is unavailable in that hearing context, preventing
ineligible or repeat empty history. When the queue is empty, one Listen may
record a settled-room state without an NPC claim or fabricated speech; further
empty Listen commits reject before history changes. A later spoken player
action may create a new legitimate pending contribution and make Listen
available again.

### NOW-185 — Existing pins generalize explicitly to both scene NPCs

Collins and Reed each map to one deterministic person pin in the existing right
rail. Repeated pinning cannot duplicate either. Activating a pin opens explicit
Compact, Standard, and Expanded actions; manual choice remains authoritative
over automatic sizing. Each person pin exposes an accessible Unpin action that
removes only that person and stale manual size. Re-pin works, while the current
briefing and unrelated pins remain intact. Every pin action is presentation-only
and time/history-neutral.

### NOW-186 — Fixture identity, problem context, and dialogue are coherent

The compact conversation context and opening exchange identify `You — Cameron
Foster`; establish that three Lexington tenants sought constituent-services
help, the county could not process the first two referrals because a required
proof-of-income form was missing, Reed is checking the third referral, and
Collins is deciding whether to back a staff document checklist; and use
contextual intent labels. The active box does not rely on an unexplained
`referral gap` shorthand. A bounded progression record preserves these subject
facts, Collins's condition, Reed's promise, the latest proposition, pending
contributions, and phase when switching Collins → Reed → Everyone → an
individual. Representative requests commit, defer, or condition an answer
according to outcome; identical state/intent reproduces the same progression
and line.

### NOW-188 — Active conversation and history fit one game-like box

At the normal desktop acceptance viewport, active conversation has no internal
vertical scrollbar: `scrollHeight <= clientHeight`, and the current beat,
choices, audibility, addressee, and essential controls are simultaneously
visible. Opening history changes the same box into a bounded one-turn page with
Previous, Next, and Back to conversation controls. History does not append
beneath active play or make active interaction scroll-dependent.

### NOW-187 — Temporary menus dismiss without discarding substantive work

Clicking elsewhere in the scene or pressing Escape closes the navigation
flyout, floating pin controls, and immediate person-action menu. Clicking within
those controls remains usable. The rule does not click-away-close conversation
or another surface where doing so could silently discard a substantive choice.

### NOW-189 — A physical working draft opens as a scene-native document

The existing office desk contains one visibly paper-like Transit Access Pilot
working draft. Pointer or keyboard activation opens readable numbered legal text
as ordinary DOM content while retaining office edges, people, right pins, and
the bottom-left shell. The paper identifies itself as an office working draft,
not introduced and not enacted; no legislation dashboard or generated text
raster replaces the scene.

### NOW-190 — The quantitative provision maps explicitly to accepted policy semantics

The stable Section 3 provision and exact amount selection map directly to two
deterministic prepared policy alternatives and operations. Both target the
existing government-outlay metric, Lexington jurisdiction, explicit
`transit.pilot-eligible-riders` segment, and twelve-month pilot period. Their
exact $8,000,000 and $4,000,000 magnitudes produce different existing-policy
estimates without parsing legal text, calculating consequences in React,
changing metric truth, or creating actual effects.

### NOW-191 — Legal text, staff annotation, and comparison remain distinct

Collins's attributed staff annotation is separate from the legal text. Clean
copy hides the note without changing one legal word. Pointer and keyboard can
select the exact amount phrase and open a restrained anchored action menu. The
prepared comparison uses clear strike/insert markup and is preview only:
opening, closing, or navigating it preserves the active variant, serialized
World, date, action sequence, history, policy realization, effects, and metrics.

### NOW-192 — Staff projections respect actor-specific knowledge

Before Cameron reviews Collins's note, the player projection and DOM omit
modeled consequences. Reviewing it appends ordinary policy-analysis review and
knowledge records for Cameron, then exposes only the explicitly known
$8,000,000 and $4,000,000 analyses with author, provenance, target scope, and
forecast qualification. A separate unreviewed sensitivity estimate and its
internal text remain absent. Collins's own analysis knowledge does not transfer
automatically to Cameron.

### NOW-193 — Legislative discussion reuses the accepted conversation engine

Ask Collins opens the Run B conversation strip with the legislative working
draft and selected Section 3 as its subject. Collins is the bounded addressee;
Reed is a Normal listener derived from the same room semantics. Committing the
authored response uses existing event, unknown-truth claim, direct/told-by
knowledge, and heard-claim perception writers, grounded in Collins's exact
analysis knowledge. No second dialogue state machine, runtime model call,
emergency-rent casework copy, or fabricated relationship consequence is added.

### NOW-194 — Selecting a working version records drafting history, not law

`Use $4,000,000 version as office working draft` records exactly one stable,
same-date `office.working-draft-revised` event linking the player,
jurisdiction, both alternatives, and both operations. The paper projects its
active version from that exact event. Duplicate submission rejects before a
write. Date, action sequence, realization count, effect count, and metric count
remain unchanged, and the UI never describes the instruction as passage,
appropriation, enactment, or implementation.

### NOW-195 — Run C is deterministic, scoped, valid, and serializable

Identical fixture and action inputs reproduce stable document/provision/
selection IDs, policy links, projections, conversation output, revision event,
and serialized snapshot. Integrity accepts the expected graph and rejects
malformed operation magnitude, direction, currency, alternative linkage, or
provision target scope. The accepted world and snapshot versions remain
unchanged and no `src/simulation/` implementation file changes.

### NOW-196 — Run C composes with accepted office play

After closing the document or committing the working revision, the ordinary
office remains usable. Collins and Reed, pins, navigation, dossier, and the Run B
emergency-rent conversation still follow their accepted flows. Focused Run A,
Run B, and Run C semantic tests plus the executable browser suite cover pointer,
keyboard, geometry, knowledge gating, conversation reuse, revision neutrality,
post-return interaction, and deterministic reload.

### NOW-197 — Human-play document presentation stays authentic and state-correct

The selected quantitative phrase has a restrained underline/highlight plus
pointer and keyboard focus behavior, with no generated `review` word or other
explanatory text contaminating the legal sentence. Opening the document changes
only the existing bottom-left shell's presentation modifier: its visible
time/date/location context occupies materially less area and does not intersect
the paper at the normal desktop viewport; closing the document restores the
accepted Run A shell.

Before the office instruction, paper, annotation, analysis, comparison, actions,
accessible names, and DOM identify $8,000,000 as current and $4,000,000 as the
prepared narrower revision. After the single canonical revision event, those
surfaces identify $4,000,000 as current and $8,000,000 as the earlier office
version; none retain the stale inverse labels. The correction changes no stable
document identity, policy record, analysis-knowledge gate, conversation
semantics, history write, realization, effect, metric, date, or action sequence.

### NOW-198 — Canonical sub-day time is valid, consistent, and replayable

World owns an integer-minute `SimulationMoment` with date, zone identity, and
explicit offset. Invalid dates/minutes/zones/offsets and a `currentDate` mismatch
fail integrity. Differently zoned equal instants compare correctly. Snapshot 14
round-trips schema 15 moment, agenda, and work state exactly. Whole-day
advancement preserves local minute/zone/offset.

### NOW-199 — Exact minute advancement composes with date-level future work

Crossing midnight updates `currentMoment.date` and `currentDate` together and
resolves crossed `FutureDueItem` frontiers exactly once. Exact work/activity
outcomes resolve chronologically with deterministic same-time ties and cannot
complete twice. History sequence and action sequence are not treated as clocks.

### NOW-200 — Scheduled activities have real intervals, conflicts, and travel

Activity/state IDs and duration/order are deterministic. Shared-participant
overlap is rejected. A fixed activity cannot move. A valid bounded flexible
reschedule succeeds; an invalid move returns the exact unchanged World. The
fixture's authored 20-minute travel interval prevents an impossible activity
from running through the off-site transition.

### NOW-201 — Work/Pending groups derive from canonical work semantics

Needs you requires controlled-person action/decision. Waiting on others has a
real waiting person/blocker and exposes no false completion action. Staff
handling is genuinely assigned to another person without a player requirement.
Completed/ready follows lifecycle. No canonical bucket or player-facing
progress percentage exists. Work retains source and focus provenance through
assignment/completion.

### NOW-202 — Staff can progress while the player is occupied

Collins's authored 50-minute analysis advances while the player attends the
separate 9:30–10:15 briefing and reaches ready for review at exactly 10:00. The
player's clock reaches 10:15 and the briefing completes once. A delegated
90-minute meeting brief advances only through Collins's free elapsed intervals
and remains in Staff handling when incomplete.

### NOW-203 — Planning inspection is time-neutral and epistemic

Opening Calendar, opening Work/Pending, and inspecting an activity change
neither moment nor history. Private Reed schedule/work roots exist in World but
remain absent from agenda/work projections and the browser DOM. Meaningful
activity duration is disclosed before its canonical transition.

### NOW-204 — Calendar and Work/Pending are browser-proven planning surfaces

At the normal desktop viewport, Playwright proves five day columns, a vertical
time scale, canonical current marker, duration-proportional 45/75-minute event
geometry, four distinct restrained event states, anchored detail with week
retention, persistent valid movement, atomic travel-conflict rejection,
derived work groups, delegation, visible time advance, parallel staff return,
real-context routing, and return to the office.

### NOW-205 — D-Lite remains deterministic and composes with Runs A–C

The 27-test focused D-Lite suite proves identical World plus identical
scheduling/action input yields identical results and malformed time/work graphs
fail. The full 463-test Vitest suite, focused Run A/B/C suites, and browser
return paths preserve people, pins, conversation, and the Transit Access Pilot
working document. No Stage 7/8/9 or Lexington Slice E semantics are present.

### NOW-206 — Player-facing elapsed time equals the canonical transition

At 9:10, the briefing confirmation states a 20-minute wait, 45-minute
briefing, and 65 total elapsed minutes before activation. The canonical result
is exactly 10:15, and semantic plus browser tests bind the disclosure to that
same projection and transition.

### NOW-207 — Unresolved player commitments cannot be skipped silently

Generic minute advancement may reach an unresolved activity's start but cannot
cross it; rejection returns the exact input World. Performing a later selected
activity also returns the exact input World when an earlier unresolved player
commitment or travel block remains. No missed/late state is inferred.

### NOW-208 — Canonical zones and offsets remain mutually valid through DST

Moment construction rejects both unsupported `Fake/Zone` and a local
date/minute paired with the wrong zone offset. Whole-day movement preserves the
local clock while resolving the target-date New York offset. Exact 60-minute
moves across spring-forward and fall-back preserve exact elapsed time while
deriving the correct resulting date, local minute, and offset.

### NOW-209 — The shell rests compactly and opens through equivalent input paths

At 1440×900 the bottom-left shell rests below 200×70 pixels, below one percent
of viewport area, and at no more than 0.8 opacity. Pointer approach through the
invisible proximity zone, hover, keyboard focus, and click/touch open state
expand it to 230–280×58–70 pixels and restore readable opacity without restoring
the old full plate. Rest shows the complete compact label `Lexington, KY`; the
full office context appears in expanded and accessible state. Reduced motion
removes the transition, and document entry retains the stronger existing
no-overlap proof.

### NOW-210 — Pinned means deliberate removable references

The next scheduled commitment is a separate projection and updates from the
completed briefing to the real flexible draft block. Pinned contains only
person references, every item exposes Unpin, and each person can be re-pinned
from their real scene context. The static briefing and unsupported District
Notes pins are absent.

At 1440×900 and 1200×720, closed navigation leaves a compact next-commitment
status attached to the time/location shell and any deliberate user pins on a
separate lower reference shelf. Open navigation contains only Calendar,
Work/Pending, Places, Civic Reference, and the development route. It contains no
pin or status card. Shell expansion reveals the canonical commitment title,
time, and location without truncating the date or location; activating the
status opens that exact Calendar activity. The flyout, status, pin, and pin
controls have non-overlapping geometry with both characters and the two
scene-native document surfaces at both viewports. Calendar/document modes show
no ordinary-scene pin or commitment companion surface.

### NOW-211 — Manual pin sizing is one complete reducer action

Selecting Compact, Standard, or Expanded writes the manual size and clears the
active pin menu in the same reducer result. Browser proof confirms one-click
dismissal, persistence through later presentation actions, and manual
precedence over automatic sizing.

### NOW-212 — The representative D-Lite day continues through later commitments

Starting at 9:10, deterministic semantic and browser proof delegates the
community-meeting brief, attends the 9:30–10:15 briefing, works the
10:30–11:30 flexible block, travels from 1:40–2:00, and attends the
2:00–3:15 community meeting. Each confirmation discloses canonical wait,
duration, total elapsed time, and resulting moment with an activity-appropriate
verb. Activity status, current moment, Next Commitment, and Work/Pending
rederive after every returned World; the final next commitment is the 3:30
tentative call. The briefing cannot repeat, a premature meeting attempt cannot
skip earlier commitments, and a second blocked attempt at 11:30 cannot skip
travel. Both rejected actions retain object identity and exact serialized
World, and browser time/history attributes remain unchanged.

## Manual Now

The visual statements below are independent human acceptance checks. They are
not established by the semantic rectangle assertions or by Codex's own
implementation-time browser inspection.

- The default browser result is a warm, restrained, semi-illustrated office
  fixture rather than a top-bar dashboard.
- A first-time player reading only the active conversation box can answer: the
  county could not process two emergency-rent referrals because each lacked a
  required proof-of-income form; this legislative office is involved through
  constituent services; Reed is checking the third referral for the same
  missing form; Collins is deciding whether to back a staff document checklist;
  and the player is choosing whether and how to ask for those next steps.
- The person is visibly seated behind the desk with the desk occluding only the
  lower body; there is no chair/desk intersection, floating, or scale break.
- The bottom-left plaque and right tray follow the four user-supplied Run A
  visual references without baking dynamic text or UI into raster imagery.
- Person menu, dossier, civic popover, navigation, dark submenu, mixed pins, and
  learned/reference states remain readable while the scene stays substantially
  visible.
- The compact Run B conversation strip keeps both NPCs, scene context,
  bottom-left cluster, and pins substantially visible; addressee remains clear
  and Private unavailability reads naturally.
- Contextual character labels remain attached above the relevant person, never
  drift onto the foreground chair or shell, and disappear when another open
  surface already identifies that person.
- Pin controls remain a small floating treatment; Collins and Reed can each be
  pinned, explicitly resized, unpinned, and re-pinned without displacing the
  separate canonical next-commitment status.
- The ordinary conversation header establishes Cameron Foster as `You` and the
  emergency-rent/shared-intake-checklist question without becoming a large
  exposition panel.
- Active conversation requires no internal vertical scrolling at the normal
  desktop viewport; paged history reuses the same bounded box.
- The Transit Access Pilot draft reads as a real paper working document on the
  desk, not a floating dashboard tile, bill-management application, or dossier.
- The focused working document remains comfortably readable while office
  context, people, pins, and the shell still frame it.
- The amount selection, Collins annotation, clean-copy state, prepared
  strike/insert comparison, and committed $4,000,000 working version are
  visually distinct without making legal text resemble a game board.
- Calendar reads as a restrained office week with days horizontal and time
  vertical; event lengths, current-time marker, travel, flexible, tentative,
  and confirmed treatments remain legible without resembling a generic SaaS
  calendar.
- The anchored event detail leaves the week understandable, states the real
  time cost before attendance, and explains travel conflict rejection in
  ordinary language.
- Work/Pending reads as a deliberately opened catch-up surface centered on what
  needs Cameron, with dependency, ownership, returned work, and routes to real
  context understandable without raw engine fields or dashboard pressure.
- Collins and Reed remain at plausible separate anchors with no
  person/furniture intersection, floating, scale break, or incorrect foreground
  occlusion.
- The player surface has no white submenu cards, generated microtext, permanent
  numeric relationship/support display, or Stage 7 workspace.
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

## Generated-person current-main correctness regressions

- A deterministic 78,000-case production/stress matrix independently replays the
  selected profile age and checks valid DOBs, exact canonical age, applicable
  bounds, and exact Person replay. Dates include February 27/28/29 and March 1
  in leap and non-leap comparison years, plus December 31 / January 1. Coverage
  asserts both leap/non-leap birth years and actual leap-day births. Four pinned
  regression cases cover invalid copied leap dates and the selected-age-73
  normalization disagreement. `ageOnDate` and Stage 6 calendar semantics stay
  unchanged.
- The no-seed D-Lite serialized World preserves the accepted PR #18 hash.
  Existing generic-constructor, Synthetic Tidal Basin, alternate home-jurisdiction,
  seeded replay, baseline, JSON, and SQLite proofs remain required.
- Run B/C/D-Lite tests verify role-dependent options, dialogue, continuation,
  history, annotations, reviews, drafting instructions, calendar descriptions,
  work titles, blockers, and delegation use actual canonical people. Default
  Andre Collins / Julian Reed wording remains covered by the existing suites.
- Normal-route browser proof walks `/`, alpha, beta, alpha replay, and explicit
  `/?seed=stage-6-5-run-a`. It compares visible IDs/names to the generated
  constructor independently of the fixture router, checks dossier age and
  role-dependent prose across conversation/history, document/analysis, work,
  delegation, and calendar, and compares alpha identities and text exactly on
  replay. Pointer and keyboard activation are exercised. The explicit legacy-
  named seed also agrees with the developer route's generated person-v5/names-v1
  semantics. No New Game button or visual redesign is required.

## Stage 6.5 Post-D-Lite Visual Integration — Implemented

### VISUAL-001 — Only released manifest art reaches the player runtime

Given the office visual configuration, every image resolves through the existing
art manifest and renders only when generation, QA, and runtime-release states
are all approved/released with a valid file, hash, and provenance record.
Missing, unreleased, or incompatible assets fail closed.

### VISUAL-002 — Person owns appearance identity; anchors own only pose and geometry

Character visual recipes resolve deterministically from the canonical person's
owned appearance identity (`PersonAppearance.seed`) and the anchor's required
`poseFamily`. Scene anchors declare physical constraints (pose, contact, scale,
depth, occlusion, hitboxes) but do not own person identity. Reordering recipes
or people in a fixture does not alter identity assignment; swapping anchors
preserves person-owned identity while updating pose. A person lacking an
approved recipe for the requested pose fails closed to the fallback placeholder
path without mutating the person, world, or adopting another's appearance.

### VISUAL-003 — Production art preserves semantic play

At 1440×900 and 1200×720, the approved environment and alpha characters replace
placeholder scenery/anatomy, remain accessibility-hidden and pointer-
transparent, align with their semantic hitboxes, use same-plate desk/chair
occlusion, and keep both person controls, dossiers, pins, conversation, Transit
Access Pilot, Calendar, and Work/Pending operable.

The environment renders from the deterministic 2048×1144 runtime derivative,
with no CSS filter, and one released transparent furniture mask supplies
foreground depth. The environment, mask, character rasters, declared roots,
semantic hitboxes, and scene documents share one uniform virtual-scene camera
transform. Neither a second room layer nor a legacy rectangular clip is
present. The obsolete synthetic placeholder caption is absent.

### VISUAL-004 — Packet 76 preprocessing is reproducible

Given either exact approved green-field source, deterministic extraction creates
the recorded runtime SHA-256 repeatedly while the raw source hash remains exact.
No generation, redraw, or opaque anatomy repaint occurs.

Given the exact Prompt 30 source, deterministic office-plate derivation creates
the recorded 2048×1144 runtime and furniture-mask hashes repeatedly, records
269,313 foreground pixels, and leaves the 1024×572 approved bytes unchanged.

The Prompt 30 room resolves from the ordinary `council-staff-office` family.
PNG transparency QA decodes actual pixels: an all-opaque RGBA PNG fails an
actual-transparency requirement, while any alpha below 255 confirms it. The
derived A01/B01 sprites retain their exact hashes and pass this pixel proof.

### VISUAL-005 — Banked presentation cleanup remains bounded

At rest the shell shows a nontruncated compact date; its full date remains in the
expanded/accessibility state. Full workspaces cause a stronger but discoverable
shell retreat. Zero deliberate pins leave no prominent empty-state residue,
the artificial office/desk strip is absent, and workspace content does not
intersect the status/pin rail.

### VISUAL-006 — Responsive camera geometry is shared and measurable

For each required viewport from 1280×720 through 7680×2160 and each DPR in
1, 1.25, and 2, the pure transform proof preserves the 1024:572 scene aspect,
keeps scale X equal to scale Y, contains the safe and essential rectangles,
aligns character roots and source-aspect rasters, and physically aligns camera
offsets. Live Chromium repeats all 13 viewport classes and exercises people,
pins, navigation, Calendar, Work/Pending, and the working document. Live DPR
proof repeats mask/environment alignment at 1, 1.25, and 2.

The camera uses ordinary aspect-preserving cover and a bounded 12:5 aperture
for super-ultrawide displays. Environment, foreground mask, characters,
hitboxes, and scene documents share that one transform. Viewport-space UI does
not inherit the raster transform. Exact safe-area evidence is recorded in
[Responsive Office Virtual Scene](systems/responsive-office-scene.md).

Project art authority is established externally via `PG-E02 CLEAN` (5568×3008
master source), ensuring no further upscaling is needed for final office
production. Historical Prompt 30 and A01/B01 assets serve as development test
fixtures; final characters compose from modular components under D-053.

### VISUAL-007 — Modular components pass the one art gate with a structural contract

A `character-component` manifest asset validates through the existing
approval, QA, hash, provenance, and runtime-release checks and additionally
must declare a modular kind, family, catalog generation, integer layer, canvas
that matches its real raster, and kind-specific rig or attachment metadata.
Validation rejects duplicate IDs, non-modular declarations, invalid layers or
canvases, unknown body/head/pose/orientation families, non-uniform family
compatibility, missing roots or origins, duplicate anchors, anchors a reachable
body does not declare, dangling or misordered hair pairs, released fronts
paired with unreleased backs, and ledger membership or signature mismatches,
each with a named error. The production manifest validates with the empty
bootstrap catalog.

### VISUAL-008 — Identity is person-owned, pose-independent, and frozen by generation

Resolving the same appearance seed, recipe version, and catalog generation
yields the same identity and context. Identity is identical across poses;
context changes with pose and omits slots with no art for that pose without
changing identity. A body family with no art for a pose fails closed with no
components and a null projection. Incompatible head, hair, and garment
families are never selected. Release state changes only the `released` flag.
After a later generation adds hairstyles, garments, and accessories, every
identity pinned to the earlier generation reproduces exactly, while an unpinned
resolve at the new generation may legitimately differ; a rewritten or smuggled
past generation fails validation, and a drifted established identity is
rejected by reproduction.

### VISUAL-009 — Attachment anchors are metadata and stay distinct from scene and root anchors

The body component owns the pelvis-hip-center root and named attachment
anchors; layer projection places each component's declared origin exactly on
its declared anchor in body-canvas units, sizes it by canvas ratio, orders
layers by integer draw order with no shared layer, and draws a paired hair-back
behind the body. Resolution and projection never mutate the person, appearance,
or `World`, and the module imports no React, DOM, Vite, Node, or ambient
entropy — only the simulation's `SeededRng` and `stableHash`.

### VISUAL-010 — The appearance pin survives save, reload, and catalog growth

A person created with a catalog generation records it on the person-owned
appearance; a person created without one records nothing. The pin never
changes the appearance seed. World integrity rejects a non-positive or
non-integer pin. The pin round-trips through the JSON snapshot codec and the
SQLite repository and replays identically from the same seed. A pinned or
legacy (unpinned) person resolves the same identity, recipe key, and layer
list against a library grown to a later generation, while a person pinned to
the new generation may resolve new families and fails closed on unreleased
art.

### VISUAL-011 — Four modular characters render through one compositor and reload unchanged

At `?view=character-proof`, four generated people render as complete modular
characters with distinct recipe keys, at least five loaded image layers each,
DOM order equal to ascending draw order, and no missing-layer placeholders.
The reuse table shows one body used by all four, two or more heads, two or
more hairstyles, and two or more tops. The head layer sits at the top of and
centered on the body layer; the top layer sits inside the body. The first
person renders again seated in a second scene with the same recipe key. The
developer toggle shows four root markers, sixteen attachment markers, and four
distinct scene-anchor markers as DOM overlays, and hides them again. Saving
and reloading restores the same world ID, recipe keys, and layer asset IDs
from browser storage; clearing returns a fresh world with the same recipes.
The authored office path still renders A01 and B01 with no modular character
present.

### LEG-001 — Institutional rules come from data and stay internally coherent

Every registered rule pack validates: chamber count matches its declared
structure, the chamber order covers every chamber, the origin chamber permits
introduction, each chamber has at least one floor stage with a resolved passage
threshold, committee memberships are positive, a unicameral pack marks
inter-chamber transit not applicable, a bicameral pack describes it, and a
joint-session override counts against the combined membership of every chamber.
Each pack cites at least one official instrument.

### LEG-002 — Unknown, not-applicable, and a resolved negative stay distinct

Nebraska's inter-chamber transit is not applicable. Kentucky's gubernatorial
inaction outcome is unknown. Kentucky's guarantee of a committee hearing is
known and false, while Nebraska's is known and true. Requiring an unknown rule
and requiring a not-applicable rule raise different errors, and the player
surface reports each in plain language rather than as an absence.

### LEG-003 — Vote thresholds resolve against the right denominator and rounding

A majority of thirty-eight elected members is twenty and of one hundred is
fifty-one. Three-fifths of forty-nine is thirty. Two-thirds of sixty is forty
and three-quarters of sixty is forty-five. A vote counted against presence
fails when the record does not represent presence, and a vote counted against a
joint sitting fails outside one.

### LEG-004 — A measure's position is derived, and illegal steps are refused

Where a bill sits is replayed from its append-only actions against its rule
pack. Taking a floor vote before referral, presenting before enrollment, or
recording enactment without a signature or override each fail with a message
naming the measure's current position. A member cannot vote twice on one
question, presence cannot be smaller than the members who acted, and a vote
cannot record more members than are eligible.

### LEG-005 — Bicameral, unicameral, and joint-session routes genuinely differ

In Kentucky a bill clears one floor stage, transmits to the Senate, is referred
and reported again, and a veto is reconsidered separately in each chamber at a
majority of elected members. In Nebraska the same engine runs three separate
constitutional floor stages, offers no transmittal at all, and reconsiders a
veto at three-fifths of forty-nine. In Alaska the veto goes to one joint
sitting of sixty, at three-quarters for an appropriation; supplying per-chamber
forums there is refused.

### LEG-006 — A committee hearing runs on the world clock

Scheduling a hearing creates a future-due item; the hearing is recorded only
when ordinary time advancement reaches its date, and the recorded action
carries that date. Where a chamber guarantees every referred bill a hearing,
reporting before the hearing is refused.

### LEG-007 — The legislative record is durable and replayable

A measure's actions, referrals, committee actions, amendments, votes,
dispositions, and enactment round-trip exactly through the snapshot codec and
the SQLite repository, and the derived position and vote records are identical
after reload. The same scenario and the same member decisions replay to an
identical world. Every action references an ordinary historical event tagged
`legislation`.

### LEG-008 — The player is told where the bill is and what they can do

At `?view=legislation` the surface states where the bill stands, what just
happened, who decides next, what happens next, and what the next vote takes, in
plain language. It lists the steps the player can take, the timing that
matters, and what the rules genuinely do not settle. The vote record is
available but does not greet the player. Nothing on the surface uses internal
vocabulary. The office shell offers a way in.

### LEG-009 — An impossible history is refused, not reduced

A saved world whose first legislative action could not have followed from
drafting, whose action names a chamber the measure was never in, or which
records anything at all after the measure finished, fails integrity with a
message naming the offending action. A measure carries at most one resolution,
and an enactment record that disagrees with the measure's own history is
refused.

### LEG-010 — Law is recorded once, from the one position it can be

`recordEnactment` succeeds only where the measure is awaiting enactment. A
measure that has already become law cannot be enacted again, and a measure
still on the executive's desk cannot be enacted at all. Having been signed
earlier is not standing authority to be enacted later.

### LEG-011 — A second chamber's changes go back for agreement

Where the second chamber adopts an amendment and then passes the measure, the
measure returns to the chamber it started in for a recorded vote on accepting
that change; agreement leads to enrolment and refusal ends the measure. Where
the second chamber passes the text unchanged, the measure goes straight to
enrolment with no agreement vote.

### LEG-012 — Unresolved and inapplicable rules never authorise an act

Amendment permission, presentment, adjournment death and a money-bill override
threshold are all refused unless the controlling rule is known and permits it.
Unknown and not-applicable produce different errors, and neither is offered to
the player as an available step. A money bill whose heavier override threshold
is unresolved is never shown or validated against the ordinary threshold.

### LEG-013 — Reporting and refusing to report are different events

A committee report carrying an unfavourable recommendation, or none at all,
still reaches the floor when the motion to report carries. A motion to report
that fails is recorded as the committee not reporting, and the measure ends
there.

### LEG-014 — Separate legislative days are enforced on the world clock

Where a chamber's rules require its floor stages to fall on separate days, the
next stage cannot be voted before its earliest eligible date; the player is
offered a truthful wait instead, and the recorded stage votes carry different
dates.

### LEG-015 — The executive's decision is never a player choice

While a measure sits with the executive, the surface offers exactly one neutral
step — waiting — and no control that names or promises signature or veto. The
outcome appears only after the wait.

### LEG-016 — Identity survives repeated saves and parallel play

Amending, saving, reloading and amending again — twice over — produces distinct
amendment keys and identities and never fails, and play continues after the
reload. Two measures played in step in separate worlds derive their next keys
independently.

### LEG-017 — One executive act carries one date

An executive disposition, the action it produced and that action's event all
carry the same date, that date is the world's current date, and none of them
precedes the presentment being answered.

### LEG-018 — Rule packs cite the instrument they came from

Each Kentucky chamber cites its own rules rather than the other chamber's.
Alaska's action window and inaction outcome cite Art. II Sec. 17 and its
effective date cites Sec. 18; Uniform Rule 22 is not cited as authority for
referral or amendment. Nebraska does not claim every bill is guaranteed a
hearing. Committee sizes are marked as the scenario's rather than as sourced
rules, and no source is marked verified without recording what was read.
