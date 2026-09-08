# V89 post-M3 mechanical cleanup

Merge live main `25b7e7a291e22374566c30d31552dcc4d8314d51` ordinarily into
PR #89 at `90ea8e0898d2bca31728409d93a85de30f147daa` in an isolated worktree.
Resolve the judicial ownership test entirely to canonical main. Preserve accepted
fit blobs and D-078/D-079; confirm D-080 belongs to #101 and D-081/D-082 to #79.
No sleeves, PR #90, thresholds, classifications, transforms or measurement changes.

Run focused fit/consumer/measurement and ownership suites, derivation determinism,
art validation/inventory/QA, full validation, whitespace and exact-head browser/CI
proofs. Push the same PR branch without merging. V89A remains authoritative;
V89C final minimal acceptance remains a separate gate.

## Mechanical evidence

The sole merge conflict was the judicial ownership test. Its staged blob equals
main/M3 exactly. All accepted art, presentation, measurement/tooling and decision
log blobs equal V89D exactly; no generated index exception is needed so far.
The live #101 decision log assigns D-080 to executive authority and explicitly
reserves D-078/D-079 for #89. Live #79 assigns bargaining decisions D-081/D-082.
Those other decisions are not imported into this lane.

Focused fit, consumer, measurement and all five ownership suites: 150 tests pass
across nine files. Architecture integrity: confirmed compatible; only the shared
historical ownership assertion is reconciled, without new product rules.

LEARN: once an ownership freeze lands on main, consume the complete canonical
file and prove blob equality; retaining an equivalent local variant still leaves
unnecessary shared ownership divergence.

Two garment derivations reproduced the accepted bank SHA-256
`57af69546b4c02dc12275d1975e3f8d0645270db6baa68797a06eb72dbfc15e9`
and report SHA-256
`433c5f144a07e7e68c4af4e67a0a5c391940c04146002b41944c4e7368d2f00f`.
Art validation, inventory (329 items) and QA passed without any tracked changes.
