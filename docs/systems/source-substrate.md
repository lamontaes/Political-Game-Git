# The source substrate

Real-world data enters this repository through `src/source/`, and nowhere else.
This document is about how, and — more usefully — about what the substrate
refuses to represent.

## Why it is shaped like this

An earlier attempt at this was rejected by an adversarial audit. Its failures
were not sloppy facts. They were an architecture in which fabricated facts were
_representable_: provenance records that took any string as a hash, a value
type with a `value` field on states that have no value, compilers that accepted
any object, manifests that stamped themselves with the clock. Where a design
permits a fabrication, some agent eventually writes one, and it looks exactly
like the real records beside it.

So the contracts below are written as refusals. What cannot be represented does
not have to be caught in review.

## The command matrix

| Command                                  | Network | Writes                                 | Purpose                                                            |
| ---------------------------------------- | ------- | -------------------------------------- | ------------------------------------------------------------------ |
| `npm run source:acquire -- --domain <d>` | yes     | `artifact-lock.json`, raw bytes, cache | retrieve artifacts, hash what came back, record the real retrieval |
| `npm run source:verify-artifacts`        | no      | nothing                                | re-hash every locally present artifact against the lock            |
| `npm run source:compile`                 | no      | `data/source/*/corpus.json`            | every domain, always all of them                                   |
| `npm run source:manifest`                | no      | `data/source/MANIFEST.json`            | corpus digests and coverage claims, no wall clock                  |
| `npm run source:validate`                | no      | nothing                                | schema, algebra, oracles, coverage, wall-clock sweep               |
| `npm run source:replay`                  | no      | a temp tree                            | regenerate everything and fail on any tracked byte that differs    |

`source:acquire` is the only command that touches the network. The domain list
comes from the directory listing of `src/source/domains/`, so a domain is
covered by every command by existing, and a directory that does not export a
`sourceDomain` fails loudly rather than being skipped.

`npm run validate` runs `source:validate` and `source:replay` before the build.

## Two provenance records, never blended

A **`RawArtifact`** is evidence of a retrieval: the exact URL, the HTTP status,
the instant it happened, and a SHA-256 over the bytes that came back. A zip and
the member inside it are different bytes and carry different digests. Rights
may be `UNKNOWN` and are never inferred from the fact that something was
publicly reachable.

A **`NormalizedCorpus`** is evidence of a computation: which compiler at which
version read which locked artifacts to produce how many records, and the
canonical digest of the result. It has no `compiledAt`, because that field does
not exist anywhere in this substrate.

Keeping them apart is what makes `source:verify-artifacts` meaningful. It reads
the bytes on disk and hashes them, so a digest that was really of a URL string,
of a parsed object, or of nothing at all fails the first time anybody runs it.

## The value algebra

Eight states. Five of them have no `value` key.

| State                  | Meaning                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `KNOWN`                | the authority states it, and it is operative now                                 |
| `HISTORICAL`           | true over a closed past interval; carries a value, and is not the present answer |
| `NOT_YET_OPERATIVE`    | enacted or created, effective after the corpus date                              |
| `CONFLICTING`          | two or more authorities disagree; carries the claims, not an average             |
| `NOT_APPLICABLE`       | meaningless for this record, with a reason                                       |
| `NO_REQUIREMENT_FOUND` | the authority was read and is silent — distinct from nobody having looked        |
| `SUPPRESSED`           | the provider holds it and withheld it                                            |
| `UNKNOWN`              | nobody has established it                                                        |

The last five have no field a zero can be read out of. There is no `valueOr`,
no `getOrDefault`, no fallback parameter, and a test asserts no such symbol is
ever exported. `presentValue` answers `null` for seven of the eight states: a
historical figure and a not-yet-operative one both carry numbers, and neither
is the answer to "what is it now".

Release status — `FINAL`, `PRELIMINARY`, `REVISED` — is a property of a `KNOWN`
value rather than a ninth state. A preliminary number is still a number.

## Aggregation

`sumSourced` returns an `Aggregate`, not a number. Over a set containing any
non-KNOWN member it is `INCOMPLETE`, it names each gap and the state that gap
is in, and it calls its number `partialValue`. `reconcile` refuses an
`INCOMPLETE` set outright rather than treating an absent component as zero.

The BLS domain exercises this on real data: 78 area-periods came back
unreconcilable because a component was unresolved, where substituting zero
would have reconciled every one of them perfectly and wrongly.

## The capability boundary

```ts
compileCounties(input: ProductionInput<CountyArtifacts> | FixtureInput<CountyArtifacts>)
```

Both input types are branded with `unique symbol` keys that cannot be named
outside their module. There is no exported cast and no `fromJson`, so a caller
holding arbitrary JSON cannot reach a compiler — the refusal is a type error
before it is a runtime throw.

`openProductionArtifacts` reads bytes and compares digests against the lock. It
refuses an artifact that is absent from the lock, quarantined, or whose rights
are UNKNOWN. `openFixture` requires _both_ that the resolved real path is under
`fixtures/source/` and that the file declares `{"__fixture": true}`, because a
path check alone falls to a symlink and a marker alone falls to a file sitting
in the right directory.

`openCachedProductionArtifacts` is the equivalent capability for large,
cache-only products. It requires `cached-not-committed` storage, no committed
`localPath`, a real path confined beneath `.source-cache/<domain>/`, and a byte
digest equal to the lock. A caller-provided filename is never enough.

The writer that emits into `data/source/` takes a corpus whose input class is
statically `"production"`, so a fixture-derived corpus does not typecheck there.

## Determinism

Nothing tracked under `data/source/` carries a wall clock. `source:replay`
regenerates the whole tree into a scratch directory and fails on any byte that
differs, naming the file and the line. It does not consult git history, so it
works at any checkout depth.

Corpora are written one record per line, each record canonical with sorted
keys. That keeps a corpus both compact and diffable: a changed fact is one
changed line. `data/source/` is prettier-ignored, so the generator owns the
format and a formatter cannot fight it.

## Coverage

Every corpus states whether it holds a complete universe. A bounded one states
why, in a sentence a reader can check. There is no default.

Where an artifact is too large to commit, its identity is pinned in the lock
even though its bytes are not in the repository, and a **QA slice** is cut from
it by a stated predicate. The slice record carries the parent's digest and the
predicate, and a test re-cuts the slice from the parent and compares bytes
whenever the parent is present. The BLS observation file works this way: 13.6 MB
cached, a 720 KB slice committed, and the predicate says exactly which rows.

## Identity is not authority

A place, county, district, court or committee record says what exists, what it
is called and where it is. It says nothing about powers, eligibility, selection
method, party, election outcome or current operative status. Each domain's
validator sweeps its own record shape for field names that claim otherwise.

Some consequences are visible in the data. The Gazetteer's congressional
product publishes no name column, so congressional district records carry no
name rather than one this repository invented. The federal courts corpus
records which statute establishes each court and does _not_ assert a
constitutional basis, because the sections establishing them do not state one.

## Adapters

Source is evidence; the world is truth. A fact reaches the simulation through a
named one-way adapter or not at all. The first named adapter is
`acs-pums-character-history`: it consumes a compiled 2024 ACS 1-year state
shard, selects one whole housing unit by exact integer `WGTP`, binds every
joined person to a caller-supplied fictional identity, and submits supported
household, membership, relationship, dwelling, occupancy, and tenure intents
through `CharacterHistoryPlan`.

The bridge is deliberately narrower than its donor projection. Age checks the
supplied birth date; source sex remains evidence only; school, attainment,
employment, class-of-worker, occupation, and hours remain in an audit when the
canonical writer would require a school, employer, title, or work terms that
PUMS does not supply. PUMA never becomes an exact city or address. The donor
selection and its weights stay in the source layer; canonical world records
carry generated provenance keyed to an opaque donor digest rather than a raw
PUMS `SERIALNO`.

The 2024 production path is capability-complete but not acquired on this
branch. Each state declares independent housing and person archives plus the
2024 dictionary, independent lock identities and cache paths, and a visible
gate stating that no 2024 source bytes or hashes are present. The deterministic
fixture is explicitly synthetic and cannot be written as production.

The import boundary remains enforced by an eslint rule and by a test that reads
the import graph: `src/simulation/`, `src/presentation/`, `src/player/`,
`src/ui/`, `src/persistence/`, `src/cli/` and `src/environment/` may not import
`src/source/**`, and no domain may import another domain.

## Municipal governance audit fixtures

`municipal-governance` describes legal institutions rather than gameplay. Its
Kentucky audit fixture keeps the elected body, mayor, council president or vice
mayor, professional manager, and chief administrative officer as distinct
actors. Powers are rows with a holder, sourced capability, conditions,
exceptions, and vote arithmetic where an authority states it. There is no
strong/weak-mayor field or score from which powers can be inferred.

The fixture also keeps election partisanship as dated history, presiding and
voting roles as separate rules, budget preparation/proposal/adoption as separate
authority, and consolidation as predecessor, retained-office, service-district,
and nested-government relationships. Missing government-unit crosswalks, exact
nested-government counts, or local procedures remain `UNKNOWN` without a value.

The 92I Drive cargo is an audit input, not a production artifact. A current
first-party statute or official municipal page controls when it conflicts with
the cargo's candidate JSON, but a browser check does not manufacture a locked
artifact. Production stays gated until the exact cited bytes are acquired,
rights-scoped, hashed, and proposition-checked. No municipal adapter exists, so
these records cannot change the World or a player surface.

## Adding a domain

1. Create `src/source/domains/<name>/` with `types.ts`, `parse.ts`,
   `normalize.ts`, `identity.ts`, `validate.ts` and `index.ts`.
2. Export a `sourceDomain` whose `domain` equals the directory name. The wiring
   test fails until you do.
3. Declare the acquisition plan: what is retrieved, from where, what rights it
   carries, and whether it is committed, cached or a derived slice.
4. Run `npm run source:acquire -- --domain <name>`, then `source:compile`,
   `source:manifest`, `source:validate` and `source:replay`.
5. Write oracles the compiler cannot satisfy by agreeing with itself — official
   counts, published identifiers, and the edge cases that break naive readers.

A domain that cannot yet compile production records declares a
`productionGate` explaining why. The gate appears in `MANIFEST.json`, so it is
a visible fact about the substrate rather than an absence somebody has to
notice. `municipal-governance` is gated for independent first-party acquisition
and audit; other gated domains state their own reason independently.
`government-finances`, `government-units` and `public-employment` are gated
on acquisition: a proxy denies census.gov, and a network that reaches it
clears them without a code change. `state-office-qualifications` and
`state-local-fiscal-authority` are gated on sourcing: both compile from
research syntheses, and a secondary source cannot carry the evidence of a
retrieval this repository never made. See
[State and local fiscal authority](fiscal-authority-source.md).

The 2024 PUMS state-shard form is explicit rather than a hidden alternate
default:

```text
npm run source:acquire -- --domain acs-pums --survey-year 2024 --state-usps WY --state-fips 56
```

It writes the shard-specific lock declared by the acquisition factory and
cache-only bytes. The USPS/FIPS pairing is a caller-supplied source identity;
the code validates its shape and does not maintain an invented state crosswalk.
