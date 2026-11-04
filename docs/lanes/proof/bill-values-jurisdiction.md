# Draft values at the body's jurisdiction

Builder work in progress; no played path is confirmed by this unit. Pool child laws-draft-values-jurisdiction-reader ships the accepted reader; parent laws-bill-before-reads-bill-level stays unfinished. Lane 1 accepted currentAmount/billSections and catalog; Lane 4 accepted the adapter at 356db0f4df before edits. Review: Lane 4. No eligibility, vote or enactment edit.

The catalog, paper and seat card read one existing law/budget, preserving additive versus floor doctrine, numeric null, record identity and earlier phase values. A national chamber uses its existing body jurisdiction rather than a senator's state seat. The browser's missing-unit failure is repaired in the shared reader: an absent additive row has zero in the subject's recorded unit; a present unknown row remains unknown.

| Town                      | Replay             | Witness                                                                                                                                               |
| ------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Denver CO0820000          | bill-null-amount   | Existing numeric-null city tax retains law:place:0820000:city:income-tax:general:2026-01-01:from-start.                                               |
| Brookside DE1009850       | 4d50e1f88df997f9   | State tax 6.6%; own county tax zero; county10003:2024 highways budget 8150399788 cents. A senator reads US minimum wage 725 cents, not Delaware 1500. |
| Random Lake WI5566200     | 75ae3c9378284205:0 | Drawn world 3e1c45254451bd62b3517712a0eca476d19117eb2fd7b76773fb3ffba8631191; state tax7.65, city0, town budget highways57820232 cents.               |
| Bear River City UT4903950 | 75ae3c9378284205:1 | Drawn world c44277a85264058fe9617425dafc7d269ad83eea0d0eed6b9eaeeac1fb25ea30; state tax4.55, city0, town budget highways12429040 cents.               |

These tests draft through generated bodies; they do not supply enacted laws or votes. They are drafting-reader proof, not the lane's vote-to-person chain.

## Validation, including failures

- Original jurisdiction reader countercheck fails Brookside at37 instead of6.6. Original adapter countercheck fails the US estate-tax source ID (35.61s command); removing only national-body lookup fails725 versus1500 cents (36.08s). Exact source restored after each. Estate-tax-only national countercheck initially passed because both jurisdictions resolve the same row; retained, then strengthened with minimum wage as an additional assertion.
- Initial integrated regression failed4 cases on a new observer's wrong assumption that Congress offers budget lines (66.39s). Corrected to existing federal entries without changing eligibility or state/local budget checks. Next run3 PASS/1 FAIL exposed dropped Denver null provenance (64.98s); fixed adapter keeps the record. Then4 PASS (73.07s).
- Strengthened four-world file plus unchanged legislature suite:24 PASS,275.00s tests/289.38s command, before the subsequent unit correction. Current source with unit assertions also passes24 tests,276.76s tests/288.89s command.
- Normal Brookside browser draft caught0% on card versus0 on paper. Exact display assertion retained. Current-source browser rerun pending.
- First current-source test command exited before tests: Vite config spawnSync git EPERM. Same command passed with process permission; no failed run credited as pass. Changed-source eslint and prettier pass, with no source formatting changes.
- Fresh New Game and four-year source-controlled comparison pending. No source from an older run will be labeled current main.

State income-tax catalog eligibility is not offered and remains an unaccepted separate proposal. Decided-paper pre-enactment capture is outside this accepted reader scope.

Second unchanged browser run on15cc6ad267 fails Brookside at `0% top rate` versus `0%`. `seatAct.sectionOf` selects the federal unit through `lawHere`; the catalog has the local percent unit. This additional seat-action read requires Lane4 agreement, proposed before any edit. No browser pass or Built status claimed.
