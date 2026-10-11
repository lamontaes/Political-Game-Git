# P14 economy shelf — RULES-2 hand-off

Owner-approved REVIEW 25 order: offices #3946, elections #3948,
legislature/council #3950, laws #3931, then this transferred branch (#3932).
The continuation plan was posted in the draft PR before implementation: add the
exact-quantity KEEP calculations, compare unchanged legacy behavior over all 56
place identities, bring inherited stopgaps to the core2 schema, and run scoped
gates. Courts and press remain parked. The existing eviction calculation was
inherited from RULES-1; this continuation adds no court rules.

The shelf now fully lifts 286 inventory KEEP lines: the inherited 126 plus 160
for `createExactQuantity` (21), `compareExactQuantities` (20),
`multiplyExactQuantities` (29), `divideExactQuantities` (21),
`scaleSafeIntegerByExactShare` (21), `combineExactQuantities` (31),
`greatestCommonDivisor` (10), and `safeMultiply` (7). The 351 inherited partial
lines remain partial. World/history selection and orchestration stay with their
callers. Private unit and canonical-form validation supports the calculations
but is not counted as KEEP coverage. No legacy engine is edited or switched.

Golden tests compare results and error names/messages with the unchanged public
legacy quantity functions for every place. They exercise reduction, negatives,
zero, incompatible units, canonical-form rejection, fractional integer scaling,
and safe-integer overflow. The rules retain Number arithmetic and its exact
error behavior.

`stopgaps.json` has 19 open entries with all ten core2 fields and in-code
markers. The test checks production source coverage, unique IDs, and exact
locations. The CTO should review `economy.quantity-intermediate-overflow`: an
intermediate product can overflow even when the final comparison/result could
be represented. This suspected bug is lifted unchanged. The other 18 inherited
assumptions remain registered, including local wage omissions, mortgage-rate
proxies, housing and eviction estimates, payroll lag, and bank selection.

Two inherited housing test callbacks incorrectly used Vitest's second argument
as a place index. Their fixtures now provide the index explicitly and assert
finite values; the home-price series also uses valid months. Other fixture
typing fixes and two production type annotations change no rule calculations.

Validation: 1,607 tests pass in 24 files; the corrected job-history fixture also
passes its focused rerun. Owned TypeScript diagnostics: zero; 102 diagnostics
remain in imported legacy dependencies. Scoped ESLint, Prettier, diff checks,
zero-dice, and release PR checks are recorded in the PR after completion.
The inherited bank-opening integration result remains 58/60 failures because
`paidBank` cannot find an opened organization; this continuation does not
repair or rerun that legacy failure. This is a pure shelf, not a playable
core2 integration or a claim that the entire economy inventory is ported.

RULES-2: GPT-6 (Codex); exact runtime variant and configured effort are not
exposed, repository default medium. Continuation started 2026-10-11 00:48 UTC.
Final elapsed time and seeded audit place are recorded in the PR. Usage/cost
are not exposed.
