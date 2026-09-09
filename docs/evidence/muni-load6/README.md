# MUNI-LOAD6 — compact synchronous rule lookup

This is the existing #149 owner's changed-seam evidence. The original reviewer
independently accepted DELTA5 findings 1/2/3/5/6/7/8 and confirmed finding 4 as
an honest capacity limitation in
[ACCEPT-PEOPLE6](https://docs.google.com/document/d/1M3AMTecTJKiPLI4tNTXn8GAcdgH8Pq-qMYfEZSTFL0w/edit).
Those seven repairs and every source record remain intact. This loading change
requires only narrow changed-seam review; it is not self-accepted or a new audit.

## Contract-safe change

`legislature-rule-packs.ts` imports the compact `municipal-rule-registry` instead
of `municipal-government`. The existing municipal exporter now generates both
its unchanged full inventory and the compact admission result by calling the
existing `municipalRulePackFor` for every compiled government. No second rules
compiler, invented rules, asynchronous return, browser require, screen-dependent
initialization or false unloaded/UNKNOWN state is introduced.

`rulePackById` retains its synchronous return/throw contract. The compact registry
is complete at module initialization. Its current empty result is the complete
admission result, not a loading placeholder. A nonempty transport fixture proves
first-call lookup remains synchronous without a prior screen; a separate
synthetic procedure fixture proves generation emits an admitted pack when the
existing rules admit it. Neither fixture is a production source claim.

Both generated outputs are checked by the existing exporter `--check`, already
inside `check:municipal-generated` and full validation. Regeneration compiles the
actual source projection first, rather than blessing a cached registry. A real
CLI corruption control changes compact data and must receive the specific
registry mismatch failure. The cold import test makes any import of the heavy
inventory an immediate failure. Full-list equivalence checks every government
and every admitted pack; no inventory ceiling or filtering was added.

The full projection remains 3,219,560 bytes; the new registry is 715 bytes. Full
inventory records, readings, evidence classes, locators, source hashes, venues,
and private Work behavior are unchanged. True municipal consumers still import
the full inventory when they need it. Generated transport prose is excluded from
duplicate prose scanning while its original authored adapter remains inventoried.
The accepted generator reconciles the corpus; no historical anchors are deleted.

## Matched intervention, not CI-history inference

Unchanged baseline: `15f2611` after current main reconciliation at `3196006`,
including main `701e68ca2fab1aa8b5a69b06c8e7ada312ae2aa3`.
Compact-registry source: `b60797d2845a960e0b9e6b684f7f1e20325658a6`.
The same committed harness runs the original six URLs and two navigations per
URL, with the original workspace-visible and authored-bill text assertions.
It retains one 30-second test, not six separate budgets. Measurement adds the
same resource-timing read on both sides. The earlier six-test organizational fix
is not counted as this performance intervention.

Both sides use the same browser, localhost port, one worker, zero retries,
new identified server, forced dependency rebuild and separate owned Vite caches.
Both use the same explicit TS loader. Test output carries server/source identity,
per-navigation duration and actual resource bytes. `DEBUG=vite:transform` logs
capture transformations. The entire before/after pair runs in the same exclusive
heavy slot. These are local matched observations, not universal timing promises.

## Current normal UI composition

UI authorized frozen published `027b835ca5e9a1049fe76a07b935ebb4dd8df7bd` plus
only the one registry import change and two new registry files. Its root and
existing citizen/member tests remain unchanged in an isolated checkout. Evidence
must be attributed to that UI head plus the exact patch, not clean UI alone.
The canonical member fixture remains explicitly test-authored before loading;
normal controls complete private Work, not an invented election into office.

## Scope and acceptance

The prior [coverage map](../muni-delta5/coverage.json) is unchanged: 144 inventory
entries, zero operative ordinance packs, zero finance/employment overlaps.
Seven accepted repairs are preserved; missing procedure and capacity stay named
unknowns/refusals. The change only removes unrelated startup dependency cost.
The LEARN mechanism is the cold-import and complete generated-registry tests,
not a larger prompt or manual initialization checklist.

No merge, activation, deployment, art approval or monitoring. LAND receives the
current tested candidate after narrow changed-seam acceptance; UI alone owns
its combined root and generated-artifact reconciliation.

## Measured result

The corrected complete-resource baseline is
`cac655efe147bb3bfecfce4796288206b97237f9` (unchanged runtime plus the measurement
buffer fix). After is `afd69d4f610258548a3c0075e04e07b30ffcbc9a` (same harness).
Both served identities were clean. Source digests and complete per-navigation
resource records are banked alongside this report.

| Same twelve-navigation workload             |     Before |      After |
| ------------------------------------------- | ---------: | ---------: |
| Completed navigations / original assertions |     12 / 6 |     12 / 6 |
| Workload elapsed                            |   7,895 ms |   7,136 ms |
| Full inventory resource entries             |         12 |          0 |
| Compact registry resource entries           |          0 |         12 |
| Full inventory transferred bytes            | 56,532,478 |          0 |
| Compact registry transferred bytes          |          0 |      5,662 |
| Total measured transferred bytes            | 80,081,193 | 23,481,692 |
| Generated municipal module transform        |   77.22 ms |   26.24 ms |

This pair observed 759ms less workload time and roughly 70.7% less transferred
resource data. It proves the dependency cost is removed under these conditions;
it does not establish a universal speedup or that another host's full workload
will always fit the budget. Vite's served modules include dev transformations and
source maps, so transfer bytes are not the on-disk source size. Cache behavior
also affects the aggregate counters; complete raw records are retained.

The preliminary pair passed too (6,091ms before, 6,437ms after), but the default
250-entry resource buffer clipped every page's later entries. Those resource
measurements are explicitly invalid, not hidden or used to claim zero inventory
requests. The harness now raises the timing buffer identically on both sides to
10,000 entries without changing navigations, original assertions, or timeout.
The corrected pair contains all 6,673 recorded resource entries per side. The
preliminary timing variation is another reason not to overstate one pair's timing.

The unchanged normal citizen/member tests passed **2/2 in 19.7s** on published
UI027b835 plus `runtime.patch`. Captures show real municipal records, authored
session labels, missing-capacity disclosure, private notes completed through
canonical Work, and the citizen's retained civic venue. The patch and provenance
record the exact three-file composition. Agent visual inspection is not human
approval; the canonical member remains an explicit test fixture, not an elected
start. No root or test expectation was changed.

## Executed validation and late main reconciliation

Full gate on clean `afd69d4`: **207 files, 3,654 tests passed, 2 skipped**
(517.86 seconds for the unit suite). Format, lint, types, release checks, source
validation/replay, full inventory plus compact registry and capacity replay,
production build, demo and art validation passed. Art inventory/QA passed too.
The focused registry/source controls passed 6/6; the normal UI proof is separately
attributed above. No current full hosted browser-suite result is claimed.

Main advanced to `c0beb01d976fe93268827b6e7fe4f5bf29513199` with accepted #147
skill/prose tooling after that full gate. It was reconciled normally at
`13650b5b653d4d9b511858043de273c065d8e44c`. There is no difference from `afd69d4`
in `src/`, `data/`, `fixtures/`, or `scripts/source/`: the complete measured player
runtime and source path are identical. The new main tooling was checked on the
combined tree with `test:skill-ops`: **97/97 passed**, plus current format, lint,
type and release checks. The earlier full gate is not relabeled as a full rerun
of these newly added scripts/tests. Runtime proof and new-tooling proof compose
at their stated source boundaries.

One unchanged source-to-player chain, retained rather than reacquired:
Carson City charter artifact `nv-carson-city-charter`, HTTP 200 retrieval
2026-09-08T23:56:02.998Z, 168,079 raw bytes with SHA-256
`8a26e351cc91505eca8a4eb5d4659a14b27d4edb06e214fd66cd1dd2cf8e84ad`.
The lock admits only declared normalized enacted-text regions under the government
edicts doctrine. Record `us-nv-carson-city`, `meetingSeries/regular/publicAttendance`
cites §2.050(4), KNOWN/FINAL as of the recorded 2026-09-08 snapshot. It allows
public attendance but keeps a right to speak UNKNOWN. The unchanged full exporter
and meeting reader carry that classification into the explicit authored-session
and attendance adapters, canonical schedule/history, and the normal citizen test.
Venue research remains separately attributed; no calendar date or real agenda is
invented from the charter. Registry generation does not admit this government's
ordinance procedure while its required fields remain unresolved.
