# Town counts vary by world; eviction still stops at lease closure

The Census layer preserves exact source observations and uses nationally researched distributions to generate a town's opening counts. Two village names now have explicitly approved calibration anchors whose source geography stays visible in developer evidence. The shared compensation writer passes focused transition checks. Ending a tenancy does not yet establish the household's next housing situation or alter earned work. No changed watched world has been measured.

## Ready Census correction

The September 29, 9:01 p.m. ruling supersedes the earlier missing-field correction. `scripts/world/compile-place-demographics.ts` verifies 35,604 national state, county, and place rows plus locked Island Areas cells. `data/research/census/place-demographics-2024.json` retains source scopes, universes, and hashes. Missing raw observations remain missing.

Ta’ū uses the 2020 county/MCD record as a calibration anchor: 236 residents, 48 households, 97 civilian labor-force participants, 87 employed people, and 141 adults. Chalan Kanoa uses the sum of separately identified I–IV records: 2,967 residents, 923 households, 1,358 civilian labor-force participants, 1,112 employed people, and 2,087 adults. Neither anchor is labeled an exact observation of the unqualified game village.

In `src/simulation/nationwide-world/represented-population.ts`, `populationReference` retains calibration values separately from raw observations. `openingPopulation` uses stable world-seed forks. Comparable national rows of the same geographic type and population order of magnitude supply empirical household, age, labor, household-kind, and annual-change distributions. Each field uses the central half of its empirical distribution; a known local anchor centers the generated value. Household kinds reconcile to the generated household count. Employed people cannot exceed the generated labor force. Empty enumerated towns stay empty.

`ensurePopulationLayer` records the opening through canonical history. Existing saves keep recorded opening values. Reads write no facts. This reader/writer slice is ready for review; broad town roster and actor producers are not yet wired to its generated totals. Source compilation alone does not establish player-visible completion.

## Anchor and coverage audit

| Surface and fields                                                     | Coverage and evidence                                                                                                        | Fixed versus generated                                                                                           | Remaining gap                                                          |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Census population, households, age, labor, race, language, tenure      | National ACS selections, annual incorporated-place histories, decennial state/county/place records, Island Areas official DP | Raw cells fixed; exposed opening population/household/labor fields seeded from comparable national distributions | Generated race, language, and tenure allocation to actors remains open |
| Ta’ū and Chalan Kanoa anchors                                          | Explicit owner-authorized county/MCD and four coded component records, raw-cell/hash verified                                | Calibration anchors fixed; world values seeded                                                                   | These are not exact unqualified-village observations                   |
| `resource-income.ts` recurring income and completed shifts             | Actual recorded World flows and receipts; exact cadence tokens                                                               | Recorded earned pay, not a new research scalar                                                                   | Remaining income consumer adapters are open                            |
| `town-compensation.ts` pay, minimum wage, teacher floor, tax and leave | Existing World terms and Team 1 law readers at the period date                                                               | Earned terms retained; statutory rates remain exact                                                              | Focused repair ongoing; delegated-assignment adapter still separate    |
| Unpublished labor draft                                                | National employment/cash/childcare source packet                                                                             | Fixed planning cash and formula remain in draft                                                                  | Age coverage, territory coverage, and seeded spread are not ready      |
| Unpublished turnout draft                                              | Research requested; owner response pending                                                                                   | Draft coefficients remain fixed                                                                                  | Research and effect integration are not ready                          |

No source labels or research explanations were added to player UI.

## Rent to housing to earned pay

Measured in source: `town-rent.ts:endTenancy` ends the active housing tenure, matching household occupancy, and lease flow through `endTownLeases`. The eviction outcome calls it on the decision date; moving out before a hearing uses the same closure. It does not write a new housing status, select a replacement dwelling, move household membership, or end a work relationship.

Inferred consequence: eviction by itself cannot be called homelessness or lost earnings. `town-compensation.ts:compensationPlan` reads work status and earned terms, with existing custody, voter-ID, and illness rules; it has no eviction or housing-status adjustment. `job-market.ts:settleWeeklyRecordedPay` and the completed-shift handler in `life-paths2.ts` route recorded pay to that writer.

`representedPopulation` reconciles known resident births/deaths and employment residuals against its saved opening cohort. It has no tenancy/housing residual or eviction-driven pay link. Materializing an existing resident does not multiply a sampled job loss across the town. No researched eviction-to-housing or housing-to-earned-pay size or lag has been established. Existing `town-rent.ts:EVICTION` month thresholds are marked research placeholders; the rent file's filing/judgment comparison is not evidence of those downstream links. Claude's three-step watched proof follows any separately researched link after merge.

## Validation and next work

The revised Census and income focused suite passes 13 of 13 tests. Compilation and byte-exact replay pass. Five-root scoped typecheck reports zero diagnostics; lint and format pass. The final nine-case population rerun also passes after generated-field metadata was corrected. Shared compensation's predecessor focused run passed 13 of 14 tests; Columbus failed with a skipped future due item at whole-world validation. The first repair still passed 13 of 14 because the fixture's separate no-op call was outside its deferred scope. The corrected focused suite passes 14 of 14 tests, including Columbus. Final mixed-head compensation typecheck and lint also pass; the exact rebuilt review result appears below. The repair uses the canonical batch writer: unchanged calls retain identity, changed standalone calls receive full integrity validation, and nested calls retain their enclosing final validation. No test assertion was removed.

Claude retains merge authority. No Team 3 change is claimed merged, installed, or player-accepted. Five-year population/work proof, nine-year elections, browser acceptance, and speed comparison remain NOT RUN. Existing release priorities continue; no additional lane or helper was created.

## Compensation review composition

The mixed local branch passes 14 of 14 focused tests, five-root typecheck with zero diagnostics, and scoped lint. This is predecessor evidence only. The first review candidate was rebuilt on published Team 1 head f4880e7af06ef72645763a057db289ae6dc543d9 and passed 18 of 18 tests and seven-root typecheck. Its source head 684a5548350f6a691a51392e8416ab50a210d62f and report leaf 59e75b16a are preserved on `codex/wave1-compensation-review-f488`. The live base then advanced to 2e0d8f81acf75a9c6173cfcd9fd7e586b7a41cbd. The current review keeps its seven speed files unchanged as published base content. Their public history-index symbols already exist on the published base. No money API requires the newer speed implementation, and none of its files appears in the owned delta.

The candidate includes only the common compensation writer/test, narrow town-pay, job-market, and completed-shift adapters, the common income reader/test, and its owned release/handback. `isPayFlow` and `payPeriodsPerYear` are direct dependencies from the shared income reader. That module has no Census data import. Census population files and unowned law/speed hunks are excluded. Current reviewed source head is a78035ed00fce63b8560229adac27392455b4f48 on `codex/wave1-compensation-review`. Its nine paths are:

- `src/simulation/living-world/town-compensation.ts`

- `src/simulation/living-world/town-compensation.test.ts`

- `src/simulation/living-world/town-pay.ts`

- `src/simulation/job-market.ts`

- `src/simulation/life-paths2.ts`

- `src/simulation/resource-income.ts`

- `src/simulation/resource-income.test.ts`

- `docs/release/changes/common-town-compensation.md`

- `docs/codex/handbacks/team-3.md`

The income files exactly match the compatible content in Census head 4cd9d7ad1 and must be integrated once. The newer-base exact-composition checks pass: 18 of 18 affected tests, seven-root scoped typecheck with zero diagnostics, scoped lint, report checks, and its release declaration range. This composition is ready for a PR stacked on `codex/wire-last-ten-laws`. The two earlier 13/14 runs, corrected mixed-head 14/14, and older-base 18/18 remain separate predecessor evidence.

## Final local continuation for cloud

Local implementation and new test launches stopped at the owner-authorized migration instruction. Cloud must obtain this final branch head before writing overlapping files. Preserve the registered workspace and all ignored evidence; archive this chat only after the cloud working checkpoint.

Census PR #1143 is READY at 4cd9d7ad1d1acabd5ac2f293962059df76f9837f. Compensation PR #1155 is READY at 1e1651136c316661a42cbd5d83c9a614eab19823, stacked on the published law branch. Actual three-dot diff is nine owned paths. Its source a78035ed on parent 2e0d8f81a passes 18/18 and seven-root typecheck, with scoped lint/format/report/release passes. Live publication base 6a7f9316 has no owned-path overlap. Claude's combined World-calibration integration remains NOT RUN; no merge or player acceptance is claimed.

Fairness is explicit WIP on `codex/wave1-fairness-pay`, based on the published money head. The owner’s 10:17 ruling removes the universal 2.6% wage penalty. The helper now preserves the supplied role rate, with no replacement percentage. State/local coverage and partnership readers remain. Existing hire producers still apply statutory floors; saved earned terms are untouched. Optional provenance suffix remains compatible and empty because this helper no longer supplies a below-rate result.

The affected NPC/player tests now require role-rate equality across partnership/coverage changes and a real statutory floor. Canonical recorded events replace the old null enactment-event references. Initial combined run passed 6/7; one malformed edited equality assertion was corrected. A subsequent run passed 2/3 and the NPC comparison hit its unchanged 30-second timeout. Canonical-event version passes three-root typecheck with zero diagnostics and scoped lint. Temporary phase timing was added afterward to the NPC test; the focused profile completed with the same 30-second timeout. Do not treat predecessor passes as final acceptance or increase timeouts without measured cause.

Owned preserved drafts are the labor research JSON, labor-decision module/test, and election-turnout module/test. They are not ready. Labor uses fixed cash, childcare, school/care, exertion and retirement assumptions; legal entitlement must not be inferred from its planning forecast. The research packet preserves broad state childcare data and national demographic benchmarks with explicit vintage/universe/territory/age gaps. Turnout coefficients remain unsupported drafts. No new coefficient was invented during migration.

For employer-specific fairness, a broad attitude source was located: [PRRI’s 2025 fifty-state survey](https://prri.org/research/mapping-support-for-lgbtq-rights-across-the-50-states-insights-from-prris-2025-american-values-atlas/). It describes general adult attitudes, not employer hiring or wage behavior. [NBER discrimination field-experiment research](https://www.nber.org/papers/w17855) is a research lead. Neither supplies an implemented wage coefficient here. Follow the existing worldbound module proposal/review route for consequential ranges and contrasting examples; bind employer identity, own recorded views, worker knowledge, actual resources and enforcement. Do not infer that opposition to a law alone proves discriminatory conduct.

The new population seam is released at Team 1 baseline a8dfa63bac8d6921944b4bdbb65b59423635def5. Only `townRoster`, its World/reference import/type seam, and calls in townRosterPlace, seatTownResidents and describeTownResidents are released in town-residents.ts. Preserve the reference-only pre-world route. Additional existing reader/argument adapters are limited to public-land-access-law.ts nearbyPublicLandAcres; job-market.ts public-body staffing; local-elections.ts roster reading; and immigration-admissions-law.ts inhabited-place ordering/filter and household-index reader. Preserve law terms, eligibility, quotas, admissions, household/person writers, money adapters and speed hunks. Do not take whole-file ownership.

The release receipt in root claims gives blobs: town-residents 9bc6a626e346b14f57eab41eeba90087ec7d330a; public-land-access-law 9ea2190f630c47c9b46b14026bb9d46e01641344; job-market 6b9ce0f1d35471444d28fef4c4f267436ed18967; local-elections 03830617c5e8e5a98b439348690ba7fdb800dcab; immigration-admissions-law 26817a44766e137c2d4fe299fc046962b59a8303. Cloud should fetch current published refs and compare these precise released hunks before writing.

Other-owner untracked files remain local and excluded: data/source/civic-calendar/, scripts/source/compile-civic-calendar.ts and its test, and docs/release/changes/civic-calendar-source-2026.md. Do not delete or fold them into this WIP. Mixed and older-base branches remain preserved. All baseline, failed-run, pause, typecheck and profile evidence remains under the existing test-results/private-tmp paths.

Owned diagnostic completed: exec session 63534 exited 1. Its sole selected NPC case failed the unchanged 30-second timeout; the other case was not selected by the diagnostic filter. Measured test work totaled 40.326 seconds. Multiple town openings in the rare-partner search took roughly 5–6 seconds each; sampled fixture setup took about 2–17 milliseconds and the real/turned pay phases roughly 0.5 seconds combined. The log is /private/tmp/team3-fairness-npc-profile.log. Preserve this evidence; diagnose the repeated-world search rather than guessing that integrity validation is the cause. No repair, new test or timeout change was started after migration.

At the final process snapshot, former npm PID 31546 and Vitest PID 31578 were absent. No owned local check or full simulation remains running. Source-side timing instrumentation is preserved in the WIP for cloud continuation. Ignored logs and baseline receipts remain local; their reported measurements are carried here without claiming a successful run.

Method: registered CODEX-CTO workspace, Census review branch `codex/wave1-towns`, compensation branch `codex/wave1-compensation`. The obsolete Oak Grove baseline at cdb6e4ab1d6a26aa876d99f6831570ed0c057d92 was gracefully interrupted with SIGINT to Node PID 39827 and ended with exit 130. Receipt wall time was 6,918.79046275 seconds, including recorded pauses totaling 705.007008 seconds. It produced no saved-world/report result and is INTERRUPTED/NO RESULT. Receipts remain under `test-results/team-3/baseline/`. No full simulation was restarted. The report reviewer is NOT RUN under the explicit Wave 1 restriction on helpers.
