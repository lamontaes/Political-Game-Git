# Source substrate convergence — what landed, and what comes next

## What this replaced

Ten source sidecar branches, each with its own tree layout, its own provenance
shape, its own npm scripts and its own edit to the same unrelated art test.
None of them is merged. Their audited factual cargo was re-homed onto one set
of contracts, their root-config edits were dropped, and the domains their
audits rejected were rebuilt from the publishers rather than repaired.

## What is here

Eleven domains. Ten compile production corpora from bytes this repository
retrieved and hashed; one is wired in and gated.

| Domain                      | Records                     | Universe                                                             |
| --------------------------- | --------------------------- | -------------------------------------------------------------------- |
| places                      | 32,350                      | complete national Gazetteer file                                     |
| fec                         | 39,355                      | complete 2024 candidate, committee and linkage files                 |
| bls-laus                    | 13,082                      | seasonally adjusted observations, 2024 onward, from a declared slice |
| bea-regional                | 11,832                      | every area in three tables, most recent published year               |
| hud-housing                 | 9,528                       | complete FY2025 Fair Market Rents and Income Limits                  |
| political-districts         | 7,283                       | complete 119th CD, SLDL and SLDU files                               |
| counties                    | 3,222                       | complete national counties file                                      |
| fema-disasters              | 721                         | declarations named by the rejected corpus or its audit               |
| acs-pums                    | 220 households, 431 persons | a declared QA slice of Wyoming's one-year sample                     |
| federal-courts              | 201                         | every circuit, district, division and bankruptcy court in statute    |
| state-office-qualifications | 0                           | gated; see 31F §8                                                    |

## Next, in rough order of value

1. **Re-export research batch 31D with its tab delimiters intact.** 516 facts
   across ten states become compiler-ready with no new legal research. This is
   the single highest-value item on this list.
2. **Decide the qualifications gate.** Either acquire the state authorities the
   31F matrix cites as first-party artifacts, or decide deliberately to admit a
   declared secondary-source tier. 31F §8 sets out both.
3. **Adapters.** Nothing in the running game reads this substrate yet, and no
   adapter should land before the world side it writes into is accepted. The
   first candidate is identity-to-world-entity, over places, counties and
   districts.
4. **A source-refresh job.** A scheduled `source:acquire` against the live
   publishers, reporting artifacts whose bytes no longer match the lock. Drift
   is a report and a routed finding, never an automatic corpus update.
5. **Widen the bounded corpora.** The PUMS slice, the BEA year bound and the
   LAUS year bound are all recompiles rather than re-retrievals; each states
   its predicate, so widening one is a data change.
6. **Corpus size.** The tracked source tree is about 98 MB, of which roughly
   80 MB is corpora carrying per-record provenance. Every domain is inside the
   25 MiB per-domain raw-artifact budget, but the total is worth a deliberate
   look before the next wave of domains lands.

## Deliberately not here

Federal legislative, government universe, government finance and employment,
education, state legislative, occupations and names. None has audited source
cargo on any accepted branch, and each needs its own rebuild.
