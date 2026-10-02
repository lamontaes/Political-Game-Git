# A39 federal/local receiving delta

Current receiving parent: #1879, 2765bd94be0c2e8ad3c2e673f4d01a4ead7abcc2. This is a bounded extraction of the already published #1801 donor 83f5363710c48ef23bf91907e3ababe0ecd4ce70; #1801 and its historical dependency remain preserved. No whole old stack, pay writer, schema, registry or state reader is imported.

## Ownership and reuse

Production changes only minimum-wage.ts's released federalMinimumSchedule, federalMinimumHourlyMinorAt, initial federal-setting arm, localMinimumSettingAt, and obsolete federal/local constants/imports. canonicalMinimumTerm is the existing donor's private query helper, with no new production export. federalMinimumHourlyMinorAt keeps the donor's number|null contract. Cache keys follow world snapshots; future phases cannot become current operation. Canonical starting law and adopted text use the same numeric reader.

Replaces: FEDERAL_RAISE_PLACEHOLDER and CITY_PREMIUM_RATIO, not statutory amounts with another estimate. Root stateMinimumSettingAt, computeStateMinimumSetting, historical cutoff, data and fallback are preserved byte-for-byte. STATE_RAISE_TERM/stateRaiseAfterDays remain pending their exact zero-caller release; no complete A39 claim.

Changed test/helper blobs are byte-identical to #1801:
- src/simulation/minimum-wage-final-terms.test.ts: 33bf585a26d66e1ffa3e601d803dc00e94ea0633.
- tests/fixtures/authored-wage-term.ts: 65860e7736a2ccc7af189e71b1f2c9b328d38d9e.
- tests/nationwide/town-federal-minimum-wage-law.test.ts: 1d1cbd6accb7b03d40b6b702b27590741263c3c0.
- tests/nationwide/city-minimum-wage-bill-terms.test.ts: e2913dfc4f7aceb15133eeaff5e4aa61c67ff935.

No assertion/timeout/filter change. The all56 adopted-text controls are not natural legislative passage. Six player-script steps remain explicit TODOs. Existing root fallback is not imported from the donor; any receiving failure there must be routed to its owner, not hidden.

## Executed checks and limits

Exact five changed TypeScript files: parser diagnostics0, scoped ESLint0errors/0warnings and PrettierPASS. git apply --check of the five-source portable delta against isolated exact2765 file baselines exited0. SHA256 of that delta: 27507d64ba17266f94641c5bdd6eb2b8c11792192b6814055f18a7688ab018fb.

Canonical npm run -s audit:scan -- --only A39 executed twice, exit0: maince219003d9223c69eabf80d0d97f04886d52d37d 2/6; candidate5/6. These were scoped file-backed snapshots containing all three production files named by A39's six checks, exact main scanner/rules/metadata, and only the candidate minimum-wage.ts substituted. Scanner/rules were unchanged. No other audit item, full repository scan, behavioral test or entire Git checkout is claimed. Receipts: /tmp/team3-a39-scoped-scan/main-A39.json and candidate-A39.json. Scanner timings14ms/16ms (command elapsed0.338s/0.380s). Missing-state average remains the sixth FAIL.

AUDIT: A39 2/6 → 5/6, checks flipped: minimum-wage.ts calls readFinalEnactedLawTerm; FEDERAL_RAISE_PLACEHOLDER is absent; CITY_PREMIUM_RATIO is absent. Counts are static scoped source checks, not evidence that payroll fired. Receiving branch/full canonical scan, complete three changed native test files, scoped semantic types and release validation remain NOT RUN here. Local Git checkout0452b1d and inherited untracked proof config remain untouched.

Why: a legal wage is the amount adopted by the governing law, operative on the work date. A vote answer does not create a dollar amount. Missing numeric text cannot establish a new floor; the lawful authority/preemption readers still govern whether a local rule applies. No new calibration, rate, person outcome or second engine is introduced.
