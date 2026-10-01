# Eligibility records stop applying a population death-rate estimate

Before: Medicaid eligibility records applied a population mortality estimate to each eligible person's hazard, without a saved enrollment or care mechanism.

After: Those records keep their legal decisions and law attribution but no longer supply an individual mortality multiplier. CTO mechanism review is requested before admission. Actual application, enrollment and care producers remain missing, and the existing monthly review cadence remains unchanged. This is a partial A27 repair.

## 1. Why-chain

Source inspection at crisis/health-coverage.ts:611 shows that the existing writer now saves the neutral multiplier. The compatibility reader at :634 returns no coverage hazard intervals, including for older saved study-derived fields. Legal eligibility does not establish enrollment. Enrollment alone does not identify treatment, access or a person's clinical response. Bedrock: this record lacks the actual care mechanism needed to change that person's hazard.

The independent health-episode consumer remains at crisis/mortality.ts:162. This proposal does not say insurance has no health benefit; it removes an unsupported individual inference.

## 2. Research

Inherited repository evidence at data/research/outcome-web/links.json:2341 cites Miller, Johnson and Wherry (2021, QJE): 9.4% lower annual mortality among low-income adults aged 55 to 64, and 11.9% by year three. This is a population comparison, not each eligible person's treatment response. Primary-study verification was NOT RUN for this boundary repair. Existing metadata remains available for population calibration; no new rate, conversion or amount is authored.

## 3. Revisions

New legal records retain their existing IDs, decisions, reasons, dates and stamps. The compatible covered-record date shape is preserved; its date no longer represents a study lag. Saved older records remain intact, while the compatibility reader stops interpreting their mortality fields as personal effects.

The existing fifteenth-of-month review still runs. It is not described as a statutory enrollment deadline. Its replacement requires a real application/enrollment activity contract, which is pending with Audit. No application, enrollment or care event is fabricated.

## 4. What gets built

1. Save neutral mortality fields in the existing legal eligibility writer.
2. Stop the old coverage interval reader from applying a population estimate to individual hazards.
3. Keep the prior converted-handler canonical stamp correction and DEFAULT registry tests; that A19 payload is already with the coordinator.
4. Retain eligibility, attribution, repeat and canonical reload assertions, and add neutral-field assertions.

No shared schema, registry, catalog or mortality core writer changes. The A19 prerequisite remains part of this branch until coordinator integration lands.

## 5. Simulated, records, world pieces, checks

Existing eligibility decisions still read actual age, household, pay, work, residence and law records. Missing facts still cannot revoke an existing entitlement. The existing record family is retained for compatibility; its covered field remains a legal projection, not proof of enrollment.

Missing capabilities: an actual application decision and saved submission, real enrollment, an applicable renewal deadline, and a recorded care/access mechanism. This patch creates none of them. Clinical episode records retain their separate hazard consumer.

## 6. Proof run

Measured against main f7ffc61a71950ffaecea76c6ec77214253622ed3 plus this candidate: 63 selected cases passed in 29.22 seconds; 60 were unselected. These include the existing 56-jurisdiction handler cases with saved subjects, canonical reload and repeats, five legal change/repeal fixtures, and the legacy interval boundary. This is controlled fixture proof, not naturally occurring enrollment or a watched mortality benefit.

A separate trace export passed the same five legal fixtures in 22.04 seconds. Recorded people were Alicia Franco in Quantico, Maryland; Travis Hubbard in Rockland, Idaho; Yasmin Farmer in Tab, Indiana; Jonathan Stevenson in Sacramento, California; and Ravi Howell in Seattle, Washington. Their recorded seeds and person IDs are retained in the ignored evidence file named in docs/codex/effect-batches/team-8/a27-evidence-manifest.json.

## 7. Worked example

Measured controlled fixture at crisis/health-coverage.test.ts:329, exported in the file hashed by docs/codex/effect-batches/team-8/a27-evidence-manifest.json: Alicia Franco, person_cb11ba35944a617e, seed coverage-stamp:2464475: January 5, 2026 records eligibility under the starting expansion law. January 6 records a work-rule loss; January 7 restores eligibility after repeal of that rule. January 8 records loss after expansion repeal. All four records carry the existing law attribution and a neutral 1,000,000 multiplier. They do not record enrollment or treatment. The fixture has no measured mortality outcome.

Next: CTO exact-head mechanism review; Audit supplies the real application/enrollment activity contract before the remaining A27 scheduler and producer work. Resignation and active-goal mogul producer contracts are separately requested from Audit.

Method: four scoped strict type roots produced zero diagnostics; ESLint, formatting and whitespace passed. Changed-test selection and configured storage reserve/timeouts were unchanged. An earlier local candidate failed covered-record integrity with a null date; the compatible date shape was restored without relaxing validation. Zero-dice found zero new entries and five removed inherited entries, exited 1, and retained its baseline. Release validation is pending until this candidate is committed. The long watched clock test was changed but NOT RUN; full changed files, browser, year-speed, full suite and final-main acceptance are NOT RUN. No team merge or A27 completion is claimed.
