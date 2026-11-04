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
- Fresh New Game and four-year source-controlled comparison subsequently passed; exact historical heads and timings appear below.

State income-tax catalog eligibility is not offered and remains an unaccepted separate proposal. Decided-paper pre-enactment capture is outside this accepted reader scope.

Second unchanged browser run on15cc6ad267 fails Brookside at `0% top rate` versus `0%`. `seatAct.sectionOf` selects the federal unit through `lawHere`; the catalog has the local percent unit. This additional seat-action read requires Lane4 agreement, proposed before any edit. No browser pass or Built status claimed.

Fresh New Game on6f3712540a: Sabattus, Maine /7a8dd4f399654d25, four weeks PASS, every handler request HTTP200. Additional Lane4 unit request is #7100 comment6628052498; acceptance pending. Timing base0de6987f82 is running alone on fresh replay d0a859c3fc33a41f. No timing pass yet.

## Four-year comparison

Brownville Junction, Maine2308360, fresh replay `d0a859c3fc33a41f`, host4c46091479ea. Controlled base0de6987f82 ran27.3/51.4/43.3/91.3s; corrected3c39628816 ran31.6/55.1/50.3/94.6s. Both exited0. All four years are within20% (maximum+16.17%) and under120s; all fingerprints and every table digest match. [Source identities and year/table comparison](bill-values-timing.json). The base retains the same production surroundings and removes only this bill reader; it is main33371378e2 plus the already-merged zero-cash correction, not relabeled latest main.

The normal browser unit mismatch remains unpassed; the performance result does not make this unit Built. Those publication failures were later recovered by an ordinary push to `9dd934708b`; no history was rewritten.

Lane 4 accepted the additional sectionOf unit read in agreement `0ee3839efe` before edits (PR #7238 comments 6630000925 and 6630109443). The seat action now uses the existing menusFor/billCatalog policy unit for its body. New normal seatAct coverage checks ordinary and phased drafts. Its first run passed Brookside and both drawn worlds but failed Denver: a new assertion incorrectly demanded the catalog unit for the existing law’s before-unit. The existing Denver law is percent-flat and must remain so. The corrected assertion preserves the full original before record and checks catalog units on newly drafted after records, with the later phase retaining its predecessor’s unit. This failed probe is retained; no existing assertion or browser comparison changed.

Corrected generated-world run: all four same worlds PASS, 55.45s tests / 66.17s command, including normal seatAct ordinary and phased drafts. The previous observer failure remains in `/tmp/lane-2-bill-values-seat-unit-test.log`; final output is `/tmp/lane-2-bill-values-seat-unit-test-2.log`. The original unit-reader countercheck and unchanged browser proof follow.

Countercheck: restoring only the old seat-action unit read fails the same Brookside comparison (32.11s command, percent-top-rate versus percent). The wrapper restores exact bench-source SHA256 `ce4f1afa7daec4c11c8c4ce2d65abd567cd316dd6de9ccd514e30c3a86cae157`. This catches the original fault without changing the existing generated laws or votes.

The next typecheck caught two compile-time defects: bodyOf returns the lawmaking body record without an office level, and a law unit is optional. The corrected action retains the existing bodiesOf membership record and reads its level; the law reader returns null for an absent unit on a present row. A federal seatAct assertion was added alongside the original national-source assertions. No permission check, catalog eligibility or enactment rule changed.

Final generated-world run after the type fixes and federal draft coverage: all four same worlds PASS, 57.88s tests / 68.52s command (`/tmp/lane-2-bill-values-seat-unit-test-3.log`).
