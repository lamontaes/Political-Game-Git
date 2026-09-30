# Town counts vary by world; eviction still stops at lease closure

The Census layer preserves exact source observations and uses nationally researched distributions to generate a town's opening counts. Two village names now have explicitly approved calibration anchors whose source geography stays visible in developer evidence. The shared compensation writer remains under repair. Ending a tenancy does not yet establish the household's next housing situation or alter earned work. No changed watched world has been measured.

## Census correction under review

The September 29, 9:01 p.m. ruling supersedes the earlier missing-field correction. `scripts/world/compile-place-demographics.ts` verifies 35,604 national state, county, and place rows plus locked Island Areas cells. `data/research/census/place-demographics-2024.json` retains source scopes, universes, and hashes. Missing raw observations remain missing.

Ta’ū uses the 2020 county/MCD record as a calibration anchor: 236 residents, 48 households, 97 civilian labor-force participants, 87 employed people, and 141 adults. Chalan Kanoa uses the sum of separately identified I–IV records: 2,967 residents, 923 households, 1,358 civilian labor-force participants, 1,112 employed people, and 2,087 adults. Neither anchor is labeled an exact observation of the unqualified game village.

In `src/simulation/nationwide-world/represented-population.ts`, `populationReference` retains calibration values separately from raw observations. `openingPopulation` uses stable world-seed forks. Comparable national rows of the same geographic type and population order of magnitude supply empirical household, age, labor, household-kind, and annual-change distributions. Each field uses the central half of its empirical distribution; a known local anchor centers the generated value. Household kinds reconcile to the generated household count. Employed people cannot exceed the generated labor force. Empty enumerated towns stay empty.

`ensurePopulationLayer` records the opening through canonical history. Existing saves keep recorded opening values. Reads write no facts. This reader/writer slice is ready for review; broad town roster and actor producers are not yet wired to its generated totals. Source compilation alone does not establish player-visible completion.

## Cloud reader continuation

The newer CTO hold supersedes the earlier source-slice readiness statement. The
cloud continuation separates nullable raw observations in
`censusDemographicObservation` and `placePopulationObservation` from finite
game readers. The game projection fills missing population, age, labor, race,
language, tenure and household-kind counts from the locked national kind/size
distributions. World-aware reads use the world seed. Mutually exclusive totals
reconcile; an all-zero allocation with a positive universe uses the broader
kind distribution. No raw cell or Ta’ū/Chalan Kanoa source scope was rewritten.

Measured in source: the released `townRoster` World route and its three internal
callers read represented population and households. Public-body staffing and
the local-election roster adapter now pass World. The pre-world reference route
remains available. The public-land/immigration adapters exist only on Team 1's
law stack and still need their separate bounded composition. Homes, wards and
vital-statistics consumers remain outside the release. No law, pay or speed hunk
was replaced. Fairness/labor/turnout WIP is preserved separately at final local
head `48631f388627f5697db79a3719b240f5d10bc457`.

Actual cloud checks: a dependency-free Node loader ran the implementation over
35,648 locked national and territory rows. Every count was a finite nonnegative
integer; tenure, household-kind, age and race totals reconciled, and labor
universes were bounded. The first wider run found an empty tenure allocation;
the corrected run passed in 2.302 seconds after module load. An earlier
100-row state/territory check passed. Five sample places passed roster
consistency, read purity and Save/Continue: Concho, Catawba County, Chalan Kanoa,
Ta’ū and Kentucky. A legacy missing-cell probe retained saved population/labor
values and history while filling missing households. These are source probes,
not Vitest or TypeScript results. The focused regressions have now run, as recorded below.

Current cloud checks: the normal Vitest configuration passed 23 tests in three
files (`represented-population.test.ts`, `resource-income.test.ts`, and the
released `principles-from-life.test.ts`) in 31.96 seconds, maxWorkers 2.
Eight-root scoped TypeScript checking, including imported dependencies, reports
zero diagnostics. Scoped ESLint and zero-dice pass; zero-dice retains the 217
existing allowed lines. The initial default-sandbox Vitest startup failed with
`spawnSync git EPERM` before collection. Supported approval review admitted the
same normal configuration; no configuration or assertion was weakened.

Lamontae's standing owner delegation and CTO's explicit cloud-only authorization
were submitted to supported approval review for the 20 GiB reserve setting and
guarded install. Review accepted; 183 packages installed. The policy is active
at `/workspace/.ocd-dev/storage-policy.json`; all guarded checks keep the reserve.
The earlier 8.8 MiB deficit under 25 GiB is resolved. No evidence was discarded.
The candidate remains NOT READY: the separate law-stack adapters, budget fixture repair, and
unreleased downstream reader adapters still need their bounded integration route.
Full simulations and speed comparisons remain post-merge work.

The additional existing budget test file ran: 17 passed and 10 failed of 27,
in 12.81 seconds. Each failure is `TypeError` reading undefined `length` at
`history-index.ts:177`, reached by the state-executive reader. The partial
`worldAt` fixture omits `history.events`; its mock invokes the real reader when
no executive is explicitly seated. No baseline comparison was run, so this is
not labeled a proven pre-existing failure. The fixture and executive writer
remain outside the narrow release. The exact failure was routed to the
coordinator; no unowned fix or passing budget-file result is claimed.

The coordinator released only the existing import and two raw-source
classification calls in `public-budgets/opening.ts`; they now use
`placePopulationObservation`. Fiscal values and calculations are preserved.
Team 2 explicitly released only the existing import and CDP classification call
in `principles-from-life.test.ts`; the observation reader restores the intended
raw annual-estimate missingness test. All other test and behavior hunks are
preserved. Its seven tests passed in the focused run above.

Team 1 released the required `ensurePopulationLayer` import and
`ensureTownResidents` wrapper. Changed seating now records the opening layer
through canonical history inside the existing deferred-integrity block, after
resident/work materialization. Unchanged seating returns the original World,
including an already-seated legacy town without a layer. The final integrity
assertion and current-opening caller guard are retained. No person, household,
pay, law, or materialization writer was changed. This establishes the compact
opening cohort for the production caller; it does not complete actor demographic
allocation, household evolution, or every downstream consumer.

Producer-focused Vitest: 13/13 passed in 14.71 seconds, maxWorkers 2. The new
fixture draws a jurisdiction from all 56 with seed `population-producer-opening`;
it selected Aberdeen, North Carolina (3700160). Changed seating records exactly
one canonical layer with the written resident cohort, and Save/Continue and
repeat calls preserve it. An already-seated legacy town without the layer and
an absent player return the same World. The initial fixture incorrectly removed
the final event without decrementing its synthetic history counter; the final
fixture asserts the event was last and keeps history contiguous. Production
assertions and integrity validation were not weakened. This is focused writer
execution, not a full watched simulation or accepted downstream outcome.

The two released law-stack adapters are prepared as a narrow patch at
`/workspace/team3-checks/law-roster-adapters.patch`. An isolated scratch Git
index confirmed the patch applies to published Team 1 head
`bb6b08b7ff85aab7e066945887e25380499bf93c`. It changes only existing townRoster
arguments in public-land and immigration readers. It is not applied to this
Census branch, which has neither law module. A fresh isolated-index check also
passes against newer law head `6e616df4249f80a42f590edda98cf00ef19476f2`. No combined types/runtime result
is claimed; the patch preserves all law and person/household writer hunks.

The requested half-hourly reporter is unavailable in this cloud runtime. The
available automation tools forbid schedules faster than hourly, and no direct
cross-thread send tool is exposed. No automation was created. Source work
continues in the accepted cloud session; check-in receipts go to 00.

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

The revised Census and income focused suite passes 13 of 13 tests. Compilation and byte-exact replay pass. Five-root scoped typecheck reports zero diagnostics; lint and format pass. The final nine-case population rerun also passes after generated-field metadata was corrected. Shared compensation's predecessor focused run passed 13 of 14 tests; Columbus failed with a skipped future due item at whole-world validation. The first repair still passed 13 of 14 because the fixture's separate no-op call was outside its deferred scope. The corrected focused suite passes 14 of 14 tests, including Columbus. Final compensation typecheck and lint remain pending. The repair uses the canonical batch writer: unchanged calls retain identity, changed standalone calls receive full integrity validation, and nested calls retain their enclosing final validation. No test assertion was removed.

Claude retains merge authority. No Team 3 change is claimed merged, installed, or player-accepted. Five-year population/work proof, nine-year elections, browser acceptance, and speed comparison remain NOT RUN. Existing release priorities continue; no additional lane or helper was created.

Method: registered CODEX-CTO workspace, Census review branch `codex/wave1-towns`, compensation branch `codex/wave1-compensation`. The obsolete Oak Grove baseline at cdb6e4ab1d6a26aa876d99f6831570ed0c057d92 was gracefully interrupted with SIGINT to Node PID 39827 and ended with exit 130. Receipt wall time was 6,918.79046275 seconds, including recorded pauses totaling 705.007008 seconds. It produced no saved-world/report result and is INTERRUPTED/NO RESULT. Receipts remain under `test-results/team-3/baseline/`. No full simulation was restarted. The report reviewer is NOT RUN under the explicit Wave 1 restriction on helpers.
