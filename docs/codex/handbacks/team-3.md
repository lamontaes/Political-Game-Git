# Census counts and income readers are ready for review

The Census source compiler and population readers now pass focused checks. Concho keeps its enumerated residents when a survey reports zero. County and territory references retain their own geography and source scope. A shared income reader distinguishes recurring pay from completed shifts. The existing town-reference reader now preserves a positive enumeration when an ACS estimate is zero. Wider watched-world integration remains pending.

## MERGED

No Team 3 change has merged. PR #1143 is ready; the September 29, 8:27 p.m. ruling prompted a corrective commit removing peer estimates. The ready slice contains verified Census sources, pure population readers, a saved population-layer writer, and the common income reader. Labor and turnout drafts remain outside this slice. The existing town-reference reader now consumes the verified population fallback. Other runtime consumers remain unchanged. Claude retains merge authority.

## WHAT EMERGED

Measured in focused checks: Concho retains 54 enumerated residents despite its zero ACS estimate. Dededo uses 44,908 residents, 11,576 households, and 19,452 civilian labor-force participants from decoded official tables. Population reads do not write history. The explicit writer is idempotent and its snapshot survives Save/Continue.

No changed watched world has been measured. Source inputs and fixture results do not establish player acceptance.

## Wider knock-on effects and missing links

The source compiler verifies 35,604 demographic rows and locked source digests. A byte-exact replay check passes. The normalized packet preserves suppressed cells, source vintages, and Island Areas universes. Missing local fields remain null; no peer average supplies population or demographic counts. It is source data, not newly approved law-effect calibration.

The common income reader annualizes exact cadence tokens, including biweekly. Completed irregular shifts use actual receipts. Loans do not become pay. An owner's draw remains income without automatically becoming employee payroll for tax assessment. Medicaid, rent, wages, and taxes still require consumer wiring.

Team 1 owns overlapping resident, rent, pay, local-election, contest, and type files. Its held PR blocks those edits. Team 1 agreed in the coordinator document to settleTownCompensation(world, { flowId, onDate, periodStart, periodEnd }): World and released narrow job 05 adapters in the overlapping files. Existing law hunks remain preserved. Team 2 owns national mood; elections will consume its existing API.

## VITAL STATISTICS

No opening or ending watched-world statistics have been measured. Five-year population and work checks, nine-year elections, browser acceptance, and the speed comparison remain NOT RUN.

The focused checks cover seven population cases and four income cases. Four labor and three turnout cases also pass in separate drafts, outside this ready slice. The nine-root scoped typecheck passes with zero diagnostics. Census compilation and replay pass. The two failed income fixtures were repaired using valid ended-flow terms and a funded payer; no assertion was removed.

## NEEDS LAMONTAE

No new product decision is requested. Team 1 has agreed to the money-function contract and narrow adapter ownership. Full watched-world proofs follow merge under the current dispatch.

## PLACEHOLDERS

Suppressed demographic cells remain unknown. Official Island Areas household, labor, race, language, and tenure cells cover 42 supported keys. Two unmatched village keys remain unknown. The same-name Ta’ū record is a county/MCD rather than the requested village. Chalan Kanoa has four distinct coded villages and no unqualified matching record. No substitute geography is assigned. Labor universes are preserved rather than presented as all-resident counts. Only each place’s own observed change enters its source projection. Places without local growth observations keep an unknown growth field and no source projection. The full seeded opening model and actor-driven evolution require watched-world measurement.

Method: baseline head is cdb6e4ab1d6a26aa876d99f6831570ed0c057d92 in the registered CODEX-CTO workspace on codex/wave1-towns. The original Oak Grove run remains live in PGID 39770, Node PID 39827, with its receipt and log under test-results/team-3/baseline/. It was resumed without restart after two recorded pauses of 172.74699 and 532.260018 seconds. The second exceeded the new six-minute limit before the resume instruction arrived. No saved world or report has appeared yet. Its interrupted wall time cannot establish an uninterrupted speed result. The required post-merge baseline will run on main. Focused tests, typechecks, lint, and source preparation are unqueued. The report reviewer is NOT RUN because Wave 1 permits only the research helper.
