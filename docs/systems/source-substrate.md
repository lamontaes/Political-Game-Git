# The source substrate

This is the single authority for where the repository's empirical data comes
from. Before this convergence the answer was spread across nine open pull
requests with overlapping lineages and contradictory research notes. A future
agent should be able to read this file plus `src/source/` and understand the
whole picture without opening a stale PR.

## The flow

Every domain converges on one shape:

```
OFFICIAL / RAW SOURCE      a file a public body published
  ↓
VERSIONED PROVENANCE       who published it, which release, retrieved when,
                           what its bytes hash to        (src/source/provenance.ts)
  ↓
NORMALIZED SOURCE RECORD   the source's own claims, in our types, each row
                           traceable back to its origin  (<domain>/normalizer, compiler)
  ↓
DOMAIN QUERY / ADAPTER     read paths, and the explicit seam to gameplay
                           (<domain>/query, <domain>/index)
  ↓
OPTIONAL GAMEPLAY CONSUMER simulation code, which decides what any of it means
```

## Two rules that hold everywhere

**Provider status is not gameplay truth.** A bill Open States marks "passed" is
a fact about Open States' record. Whether a bill passes in a `World` is decided
by the legislative state machine in `src/simulation/legislation.ts`, which is
already merged and is not duplicated here. Nothing under `src/source/` imports
simulation state; the sole exception is a type-only adapter in
`education/corpus.ts`, and `substrate-integrity.test.ts` fails if a second one
appears.

**Missing is not zero.** `UNKNOWN`, `NONE`, `NOT_APPLICABLE`, `CONFLICTING` and
`HISTORICAL` are distinct states and none of them is `0`, `false`, `""` or
`null`. `SourcedValue<T>` (`src/source/sourced-value.ts`) enforces the
distinction, and deliberately offers no `valueOr(default)` helper — a default
supplied at the read site is exactly how UNKNOWN silently becomes zero.

## Domains

| Domain               | Path                                        | What it establishes                                                |
| -------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| Shared contract      | `src/source/`                               | Provenance, `SourcedValue<T>`, hashing, the production input guard |
| Education            | `src/source/education/`                     | NCES CCD / IPEDS institution directory records                     |
| External events      | `src/source/events/`                        | Hazard, declaration, grid and public-health source contracts       |
| Governance           | `src/source/governance/`                    | What the law says about a jurisdiction's structure                 |
| Government universe  | `src/source/government-universe/`           | Which government entities exist, per the Census                    |
| Finance & employment | `src/source/government-finance-employment/` | Census government finance and payroll                              |
| State legislation    | `src/source/legislative-state/`             | Open States / LegiScan measure records                             |
| Federal legislation  | `src/source/legislative-federal/`           | Congress.gov / GovInfo / House roll-call records                   |

Per-domain notes live in `docs/systems/source/`.

## What is a sample, and what is a universe

Only the Census of Governments aggregate counts are national. Everything else
committed here is a sample, and each says so in a way code can check:

- `data/source/education/us-education-corpus.json` — 32 records.
  `completeness.isNationalUniverse` is `false`, and the validator throws if
  that changes.
- `REPRESENTATIVE_GOVERNMENT_UNITS` — 95 units, spanning every government class
  and state. The authoritative counts (90,888 governments) come from the
  published Census organization tables in `universe_data.ts` instead.
- The legislative corpora hold a handful of real measures each, chosen to cover
  distinct lifecycle shapes: enactment, veto, veto override, failed floor vote,
  unicameral, bicameral-territorial.

## Existence is not governance

The Census establishes that a government unit exists, its class, and the
function it was organized around. It establishes nothing about what offices it
has, how they are filled, or what powers they hold. A fire district in one
state has an elected board with a levy; in another it is appointed by a county
commission with none.

`government-universe/existence-boundary.ts` holds that line, and
`governance/census-crosswalk.ts` joins the two layers by identifier while
reporting disagreement rather than transferring values between them.

## Synthetic data is quarantined, structurally

Two donor PRs shipped invented data that read as empirical:

- PR #57 compiled a synthetic "HB 999", sponsored by "John Doe", into its
  committed normalized corpus, beside real Kentucky HB 497.
- PR #56 committed invented employment and finance figures carrying
  `sourceSystem: "US_CENSUS_BUREAU"` and hand-typed `sourceHash` values —
  rotated hex walks such as `9c0d1e2f3a4b...`, several not even 64 characters.

Both passed CI, because CI checked that the pipeline ran, not that its inputs
were real. So the defence is structural rather than advisory:

1. Invented documents live under `__synthetic_fixtures__/`, and
   `assertProductionInputPath` refuses that path segment outright.
2. Each such document carries its own `__synthetic__` marker, so
   `assertNotSyntheticPayload` catches it even if it is copied elsewhere.
3. `substrate-integrity.test.ts` scans committed data for placeholder
   identities and hand-typed hashes, scans runtime modules for imports from
   quarantined paths, and fails if a compiler stops calling the guards.

## Regenerating

```
npm run source:compile     # all deterministic corpora
npm run source:manifest    # coverage manifests
npm run source:validate    # cross-checks against published Census baselines
npm run test:source        # the substrate suite, including the integrity scans
```

Recompilation is byte-identical; a diff after `source:compile` means an input
changed, not that the compiler is nondeterministic.

## Outstanding source acquisitions

These are known gaps, recorded so nobody fills them with a plausible guess:

- **Census APEP / government finance extracts.** The real artifacts behind
  `government-finance-employment` have not been obtained.
  `data/source/government-finance-employment/normalized/` is deliberately empty.
- **BLS OEWS May 2025 (`oesm25all.zip`).** Required by the career corpus (PR
  #40). No substitute product is acceptable.
- **ACS PUMS household/background lineage.** PR #55 compiles ACS _aggregate_
  community baselines, which are a different thing and do not satisfy it.
- **Event source calibration.** Every contract in `events/registry.ts` reports
  `unresolved_requires_research`. PR #38's occurrence rates were invented and
  were discarded rather than re-estimated.
- **Open States record locators.** The real bills under
  `legislative-state/sources/` carry `ocd-bill/...` identifiers that appear
  hand-constructed rather than returned by the API; they need verification
  before being treated as authoritative locators.
