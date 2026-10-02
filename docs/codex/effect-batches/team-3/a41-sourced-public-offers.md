# A41 — Your Money: sourced vacant public-body offers

## MERGED

Not merged. This is a narrow main-based A41 reader build on fecced182, following the October 1, 9:47 p.m. owner ruling. The released job-market public-body pay/import/provenance surface, the retained Team3 townPayAreas county-GEOID reader hunk, the new test and documentation change. Root tax/metric/settlement hunks remain untouched. Existing A40 #1798 and A38 #1801 source remains preserved.

## WHAT EMERGED

HARDWIRED: publicBodyRolePay first reads an active actual employer/work/occupation relationship and its saved pay through the existing staffPay reader. Otherwise stateMedianAnnualWage supplies the approved sourced vacant-role estimate. HARDWIRED: openWeeklyListings saves the estimate label and BLS source in the opening's existing provenance. These are implemented paths, not executed outcomes. No personless tenure, credential percentile, employer count or government account is invented.

## VITAL STATISTICS

Initial official Claude gate at92eed0a84 composed with main14e0668ed returned57PASS/4FAIL/1TODO in28.5seconds; LOAD passed. The four original staff-precedence failures found real public employers with missing offers. The first all56 expected-set filter had repeated the null-median defect. Read-only helper source inventory identified the actual county GEOID mismatch, not missing employer identity. The retained townPayAreas reader now accepts sourced five-digit county GEOIDs alongside seven-digit localities, with unchanged territory exclusions and wage tables. The all56 source oracle was strengthened; original failing assertions remain. At committed4db032f3019ca12bf6a49218f2be1b3b0dc8e21c the complete changed file returned61PASS/1TODO in15.16seconds under stock limits/maxWorkers1. This is a permitted builder-helper receipt, not an official GATE RESULT; Claude re-gate remains required. The first sandbox attempt failed before collection at Vite git EPERM and is NOT RUN; the identical authorized retry supplied that terminal receipt. No full suite or official self-approval. The changed test contains seeded all56 opening/median/negative-binding/repeat/reload controls, five seeded actual staff-pay precedence controls, and one explicit natural hire/payday TODO. Only the exact changed-file builder assertions above are reported passed; types/lint/release/renewed LOAD and the official final-head gate remain NOT RUN here. The new reader never writes wages or transfers. Existing legal floors, offered hours, rounding, vacancies, role counts, hiring and scheduling remain in their existing owners' paths.

## 1. Why-chain to bedrock

Why could a vacant public clerk offer ignore its workplace? The old public-body branch used one2164-cent hourly constant. Why could that represent a particular employer's offer? It could not: no employer pay scale was read. Why may a sourced median stand in now? The owner explicitly approved it as a representative vacant-role estimate, labeled with source. Why does actual employer pay supersede it? A saved active matching work agreement supplies that employer's existing rate rather than a population estimate. Bedrock: actual saved agreement first, an explicitly approved source-backed estimate only in its absence.

## 2. Research

Reuse the existing BLS May2025 OEWS state/territory occupation median and its documented national fallback for withheld cells, via stateMedianAnnualWage. Source: https://www.bls.gov/oes/. OEWS annual wages use2080hours; the existing role's37–40weekly hours are preserved and the annual base is scaled to their midpoint. No new wage table, coefficient, random draw or guessed employer pay scale is introduced. The role identity and holder count remain the existing separately labeled public-body profile, not researched by this repair.

## 3. Revisions

Replaces: the locality-only GEOID assumption in townPayAreas with the existing canonical county sourceGeoid, countyArea and countyGeoidsForPlace readers. No workplace substitution, national-when-geography-unknown fallback or new state table is added. Remove PUBLIC_BODY_ROLE_PLACEHOLDER.hourlyMinor2164. Replace the public annual pay calculation with the existing sourced reader. When an active actual worker has the same employer and recorded occupation, read staffPay and normalize its actual recorded weekly hours to the unchanged offered hours. Ended/future work cannot supply the observed staff rate. Existing opening records are append-only and do not acquire new terms or a changed provenance when the current role reader finds actual pay.

## 4. What gets built

A private publicBodyRolePay helper inside job-market.ts connects existing work/role/status/pay queries to the released annual offer hunk. The existing public-body record still supplies identity, workplace, title, occupation, hours and holder count. The estimate is saved as an authored provenance note labeled ESTIMATE FROM SOURCE, with occupation, workplace, source and annual base; it does not claim an observed employer scale. Recorded staff pay follows the existing staff-pay provenance path. New production exports: none. Replaces/deletes: the fixed public-clerk hourly amount and the rate description calling that constant the public body's pay.

## 5. Simulated, records, world pieces, checks

SIMULATED: no new worker or employer decision. RECORDS: actual sourced local-government organization/profile, active paid work/role, compensation flow/terms and existing JobOpeningRecord. WORLD PIECES: canonical workplace, occupational data, staffPay and existing offerTerms/openWeeklyListings. CHECKS requested from Claude: complete changed job-market-public-offer-a41.test.ts, original limits/no filter, applicable gates. The tests use actual local-government producers rather than fabricated public bodies; absent source bindings are negative evidence, not numeric coverage claims.

## 6. Proof run

Builder-helper receipt61PASS/1TODO at4db032f30, official re-gate pending. Seed a41-sourced-vacant-public-offer-all56 selects every jurisdiction once and the first five for actual staff-pay controls. Tests require saved estimate source/amount inputs, preserved role/hours, actual opening records, no money settlement, repeat and Save/Continue. Authored staff agreements are marked controls and do not claim observed public pay. The natural application/hire/first-payday route remains it.todo rather than a fabricated pass.

## 7. Worked example

The authored staff control records an actual forty-hour agreement paying140000USD cents weekly. The reader therefore uses3500cents/hour and scales the unchanged offered38.5hours to7007000annual cents. This authored input and calculation passed in the five selected staff-precedence controls; it is not observed employer research or a natural hire. An already saved median-based vacancy remains unchanged; reopening still reads the same actual staff agreement. With that work ended, the current rate reader returns to the explicitly sourced estimate. A50's dated employer→PublicGovernmentIdentity field remains with Audit and its supported producers; no payroll/account redirection occurs here.
