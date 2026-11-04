# Draft values at the body's jurisdiction

**Built unit; independent review pending.** Pool child `laws-draft-values-jurisdiction-reader`; parent `laws-bill-before-reads-bill-level` remains unfinished. No whole Lane 2 path is confirmed. Lane 1 accepted currentAmount/billSections and catalog before edits; Lane 4 accepted the adapter at `356db0f4df` and the additional sectionOf unit read at `0ee3839efe`. Review: Lane 4. No eligibility, vote, calendar or enactment edit.

The catalog, paper and seat card read one existing law or budget at the body's actual jurisdiction. Numeric null and record identity survive; a national chamber reads national law. A draft's unit comes from that body's existing catalog. Existing law units remain intact, and a later phase reads the preceding phase. These checks draft through generated bodies; they do not supply enacted laws or votes and do not prove the lane's vote-to-person chain.

| Town                      | Replay             | Witness                                                                                                                                               |
| ------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Denver CO0820000          | bill-null-amount   | Existing numeric-null city tax retains law:place:0820000:city:income-tax:general:2026-01-01:from-start.                                               |
| Brookside DE1009850       | 4d50e1f88df997f9   | State tax 6.6%; own county tax zero; county10003:2024 highways budget 8150399788 cents. A senator reads US minimum wage 725 cents, not Delaware 1500. |
| Random Lake WI5566200     | 75ae3c9378284205:0 | Drawn world 3e1c45254451bd62b3517712a0eca476d19117eb2fd7b76773fb3ffba8631191; state tax7.65, city0, town budget highways57820232 cents.               |
| Bear River City UT4903950 | 75ae3c9378284205:1 | Drawn world c44277a85264058fe9617425dafc7d269ad83eea0d0eed6b9eaeeac1fb25ea30; state tax4.55, city0, town budget highways12429040 cents.               |

## Normal browser and New Game

[Browser screenshots, exact source records and replay helper](bill-values-browser/README.md), source `37d827ddf9`:

- Brookside: Barry Hart, `person_98675ac71b99880e`, drafts through `office:gus2025:101811:board`. Tax card and paper both show 0%, with 2% after. Budget card and paper both show $81,503,997.88 before the drafted $2 increase. Bills end in `:0` and `:1` on that office/person's January 20 record; full IDs are attached.
- Random Lake: James Barnett, `person_9912fb50b94ecbcf`; highways $578,202.32 → $578,204.32.
- Bear River City: Anya Jenkins, `person_308808508d91e570`; highways $124,290.40 → $124,292.40.

All four draft/paper pairs pass exact displayed-text, value and record comparisons; no page errors. The two drawn towns have no allowed tax card, so the normal browser checks their budget cards. Core tests cover their tax records without adding eligibility. Screenshots were inspected. The portable replay helper changes only import, browser executable and output paths from the passing runner.

[New Game proof](bill-values-newgame.json): final integrated `894053af8b`, Misquamicut, Rhode Island / `ba819f115508897c`, person `person_87aa6a3d1f6acadc`, four weeks, all 9 handler requests HTTP 200. Earlier Sabattus, Maine / `7a8dd4f399654d25` is retained separately.

## Checks and retained failures

- Final four-world generated regression with normal ordinary/phased local drafts and actual federal drafts: 4 PASS, 57.88s tests / 68.52s command. Existing legislature coverage previously passed alongside the reader: 24 tests, 276.76s / 288.89s. Typecheck, changed-source lint and format pass.
- Original jurisdiction reader fails Brookside at 37 instead of 6.6. Original adapter fails the US estate-tax source ID (35.61s); removing national-body lookup fails 725 versus 1500 cents (36.08s). An estate-tax-only probe initially passed because both jurisdictions resolved the same row; the independent minimum-wage assertion was added, not substituted.
- Restoring only the old seat-action unit reader fails Brookside's exact before record, `percent-top-rate` versus `percent` (32.11s). The wrapper restored its exact source; the subsequent final run above passes with the corrected seat-level lookup. No supplied vote or law is credited as played proof.
- Early generated checks exposed a new observer's wrong assumption that Congress offers budget lines, then dropped Denver null provenance. Those failures led to checks of existing federal entries and preservation of the null record, without changing catalog eligibility. The final added seatAct assertion initially demanded the catalog unit for Denver's existing law: 3 PASS / 1 FAIL. Corrected coverage preserves the entire original before record (including `percent-flat`) and checks catalog units on drafted after records and preceding-phase units. No old assertion changed.
- Typecheck caught a body-law record with no office level and an optional law unit. The action now retains the existing membership record's level; a present law with no unit returns null. Final typecheck passes. The checker notes 1,037 test files outside its projects and zero unresolved imports; this is not a claim that every test body is strictly typechecked.
- Two earlier unchanged browser comparisons failed: 0% versus 0, then 0% versus 0% top rate. Both are retained. After the source correction, tax passed but the budget check inspected the old one-bill pager before asynchronous refresh and reported “new draft missing from final bill page.” The engine held the actual 2025-2 budget draft. The passing helper waits for the old pager node to detach, preserving every missing-draft and exact-text assertion, with no sleep. Its first synchronization attempt was stopped because it waited for a prior pager before the first draft; that canceled run is not a pass. All logs/screenshots remain under `/tmp/lane-2-bill-values-browser*`.
- Initial Vite commands hit `spawnSync git EPERM`; permitted retries ran the tests. Earlier GitHub publication failures recovered by ordinary push to `9dd934708b`; no history was rewritten.

## Four-year comparison

[Final current-main comparison](bill-values-final-timing.json): Brownville Junction, Maine 2308360 / `d0a859c3fc33a41f`, host `4c46091479ea`, serial exclusive runs. Main `080e758294` takes 29.2 / 59.7 / 46.2 / 80.4s; corrected `652523c28a` takes 29.2 / 57.8 / 46.0 / 81.2s. Changes: 0.00% / −3.18% / −0.43% / +1.00%. Both exit 0; every year is under 120s and within 20% of base. All fingerprints and every table digest match. Production hashes and raw receipt hashes are attached.

The [earlier controlled comparison](bill-values-timing.json) remains separate: base `0de6987f82`, head `3c39628816`, 27.3/51.4/43.3/91.3 → 31.6/55.1/50.3/94.6s, maximum +16.17%, all tables equal. It is not relabeled current main.

Not explored by this unit: absent state income-tax catalog eligibility, decided-paper pre-enactment capture, every policy doctrine in every jurisdiction, or a naturally voted law's complete payment/hearing/stance/Journal chain. The parent and whole path remain unfinished.
