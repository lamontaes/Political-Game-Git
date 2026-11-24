# Domain jurisdiction portability fixture

## Scope and authority

This bounded proof applies Constitution principles 9, 18, 25, and 26 and
accepted decisions D-002, D-004 through D-007, and D-015. It follows the
[architecture geography contract](../../ARCHITECTURE.md#institutions-and-geography),
[character foundation](characters.md), and [canonical clock](time-work.md).
It changes no accepted Stage 6 semantics or persistence version.

**Primary scenario + portability fixture:** Lexington remains the first primary
sourced gameplay scenario target. The existing Lexington data is still an
explicit placeholder, not a sourced civic snapshot. Synthetic Tidal Basin is
one deliberately fictional test fixture, not another gameplay scenario,
Lexington Slice E, or national content.

## Construction boundary

`createWorld` already accepts arbitrary validated `Jurisdiction` entities,
people, and canonical moments. It remains unchanged. The extracted
`createScenarioWorld(seed, context, options)` assembles the existing synthetic
demo history through the same canonical writers. Both seed and context are
required; there is no Lexington requirement or jurisdiction registry in this
constructor.

`DemoJurisdictionContext` is a narrow authoring input: one jurisdiction, an
initial `SimulationMoment`, and three descriptive fixture labels (creation
summary, goal scope, household location). It contains no rule expressions,
inheritance, geographic lookup, authority, demographic inference, or arbitrary
metadata. The supplied moment owns the start date for generation, history, and
the relative one-day temporary attention state. Existing world/record validators
check jurisdiction provenance, home and fact references, chronology, and the
supported timezone/date/minute/offset combination. Construction defensively
copies the entity graph and moment through the existing world constructor.

`createScenarioWorld` defaults to accepted `person-v5` / `names-v1` generation.
`createDemoWorld(seed?, options?)` remains the compatibility entry point:
omitted context supplies `LEXINGTON_DEMO_CONTEXT` and the accepted legacy
`demo-person-v4` / `demo-names-v4` defaults. `createGeneratedWorld` still selects
`person-v5` / `names-v1`; its existing options now also accept `context`.
Existing signatures, seed normalization, RNG forks, world/person generation
keys, corpus contents, appearance derivation, schemas, and snapshots remain
unchanged. Existing constants remain available through `demo.ts` and the
public simulation index.

`advanceDemoWorld` uses the world-owned primary jurisdiction for its listening
session. Its only named compatibility branch preserves the accepted
Lexington venue label byte for byte; other jurisdiction labels come from the
world's own jurisdiction name. This is authored diagnostic copy, not a civic
rule or constructor requirement. No context lookup is needed after loading a
snapshot, and no new scenario metadata enters saves.

## The single portability fixture

`createPortabilityFixture(seed?)` calls the same required-context constructor.
Its default seed is `synthetic-tidal-basin-portability-v1`. The definition key is
`fixture:synthetic-tidal-basin`; the slug is `synthetic-tidal-basin`, display name
is `Synthetic Tidal Basin`, kind is `synthetic-portability-fixture`, and parent
label is `Synthetic Archipelago`. Source/as-of remain null and provenance
status remains `placeholder`.

The fixture starts at **2026-07-01 23:40 Pacific/Honolulu, UTC-10:00** and creates
eight people through `person-v5` / `names-v1`. The timezone is a deliberate clock
test input; it does not locate the fictional place in Hawaii or imply any
real-world election or procedure rules. No demographic trait is inferred from
names. Each person's appearance remains derived from the canonical person ID,
not from jurisdiction, names, or scene anchors.

## Proof and regression coverage

The existing world tests now cover full serialized-envelope SHA-256 baselines
captured from accepted main `72416e493a686b1f44b5c03b9a41e0fe141b13b8`
before extraction: default legacy world, default generated world, default demo
action replay, and explicit-seed legacy/generated worlds. These cover all
serialized identities, biography, context, chronology, catalog and history
contents, and snapshot metadata rather than only names or a changed seed field.
The implementation plan also records the unchanged default D-Lite World hash.

Alternate-world tests prove constructor/wrapper equivalence without a Lexington
entity, meaningful jurisdiction/parent/seed/biography differences, complete
home/birthplace/residence references, absence of Lexington/New York context in
serialized initial and advanced history, seed normalization and deterministic
replay, different-seed biography variation, identity-preserving materialization
and placement, midnight rollover and whole-day progression through New York's
DST season, invalid home/fact/provenance/clock rejection, and byte-identical
snapshot continuation. The existing SQLite suite repeats alternate-world
persistence and continued actions through its Node-only adapter.

The existing person stress harness runs both production and stress populations
with the alternate jurisdiction and July date. Tests compare each harness
identity/name/birthdate/appearance against the actual alternate constructor and
validate every world (20 seeds x 8 people for each profile).

## Architecture Integrity Audit disposition

This applies the permanent audit checklist to the affected completed systems.

| Area                                            | Disposition and evidence                                                                                                                                                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open categories / overgeneric schema            | Confirmed: existing open jurisdiction identity/kind; narrow typed authoring context, no registry or rule language.                                                                                                           |
| Context / hard-coding / semantic behavior       | Corrected in the demo assembly: required jurisdiction and canonical moment now reach people, life records, goals, events, and temporary context. Alternate worlds validate and advance without Lexington entities or labels. |
| Primitive reuse / headless core                 | Confirmed: same `createWorld`, person generator, record writers, time transitions, and codecs; no React, DOM, network, UI, or second World model.                                                                            |
| History / provenance / persistence              | Confirmed: no new persisted record shape, identity rewriting, or migration. Placeholder source status remains explicit. JSON and SQLite continuation preserve history.                                                       |
| Coincident concepts / appearance                | Confirmed: parent remains a label, not a fabricated parent entity; residence/household/organization stay separate. Person ID owns appearance independently of scene placement.                                               |
| Determinism / progressive resolution            | Confirmed: accepted primary byte baselines, alternate seed replay/variation, independent materialization order, and stress replay. No new ambient entropy or population tick.                                                |
| Real-world/adversarial comb                     | Confirmed for the bounded seam: different synthetic jurisdiction/parent, July date, late-night non-DST zone, midnight, invalid references and offsets. No claim of national or legal coverage.                               |
| Fallback honesty / stage leakage / future rules | Confirmed: current shared diagnostic histories remain explicitly synthetic. No Slice E, law, institutions, procedures, electorate, campaign, election, assets, or jurisdiction picker. Future mutable rules remain gated.    |
| Supersession / compatibility                    | Confirmed: default wrappers and exact primary historical copy intentionally retained. No higher-authority decision is superseded.                                                                                            |

## Remaining limits

- The fixture proves domain construction and replay, not national content,
  jurisdiction-specific civic fidelity, or UI portability.
- The shared authored diagnostic scaffold still needs at least three people;
  it is not a general population or autonomous scenario builder.
- The construction context supplies one primary jurisdiction and one initial
  clock. `parentName` is descriptive; no parent graph, inheritance, residency
  history inference, routing, or multi-zone travel is implemented.
- World/person IDs retain the accepted seed-based namespace. Reusing the same
  seed across different contexts can reuse IDs; callers needing separate world
  identities must use distinct seeds. Changing this would require a separately
  authorized identity/version decision.
- `names-v1` remains the accepted starter corpus, not a locale-specific
  population model. Supported timezone behavior still depends on runtime IANA
  data as already specified by the clock contract.
- The primary default remains legacy generation for compatibility. This proof
  does not change what the player sees or authorize PR #13 changes.
