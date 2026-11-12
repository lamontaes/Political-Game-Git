# Returning officials keep their earlier job history

Pool item: gov-official-pay-reseating-crashes-year-four. Built and validated on the feature branch; no Lane 2 path confirmed by this unit.

## Natural failure and cause

Wolf Creek Colony, South Dakota (4672500), replay dc5525b9b709e9c4, on exact main bf4e8386cd9cfc6e93523b3db4deaaf90533d066 crashes on January 1, 2029. [The failed records](official-pay-return.json) name Kathryn Singh, her South Dakota Senate seat 019, the new term elected November 7, 2028, the treasury and her ended job. She is alive; the treasury exists; shift hours are zero. The job-start guard rejects the existing job ID. Her earlier service ended August 9, 2028; the pay engine ended its job September 1, with source office-ended:seat:US-SD:upper:019:0:2028-08-09. The current official row retains its older serviceStart, so that field cannot identify the returned term.

The producer now keeps the first job ID for uninterrupted service. If that job has ended, a returning term gets its own post ID. For an official without a term record, the actual start date identifies the new post. The old job remains ended and unchanged. No job guard, office writer, core state, payroll calculation, salary debt or payment date is changed.

The natural replay contains no supplied official, law, vote or election. The test's controlled resignation and reappointment use the actual office writers to exercise the edge case quickly; they are explicitly not a played election or a Lane 2 law-path proof.

## Checks

- Original producer, new regression: Sleepy Hollow, Wyoming (5671350), replay 471f7bb02cc1105e, fails the same duplicate-job guard at the return review: 13.52s test / 22.91s command. It first verifies the earlier earned salary is paid and the old job is ended.
- Corrected regression, unchanged replay: PASS, 17.51s test / 28.41s command. It verifies a distinct new job, unchanged ended history, no extra job on a second review, and exactly one positive paycheck for the new service.
- Six files, 10 tests PASS: the return regression plus unchanged official-salary-payroll, official-pay-withholding, official-pay-death, official-salary-table and official-salary-statewide. 502.80s tests / 519.22s command, one worker, source 9ded40f6f2.
- Normal New Game PASS: Farmington, Delaware / 70c146fea3ad55c3, player person_8f8bc4864bd47d4a, four weeks and scene/Journal reads; all requests HTTP 200.
- Changed source/test eslint and prettier PASS. Corrected Absecon four-year replay PASS for completion, record identity and the relative limit: 60.2/95.6/166.1/229.9s, all faster. Exit 1 is solely the absolute 120-second bar in years three and four. Corrected Wolf Creek completes all four years, then the natural paycheck/history observer passes. Test-only module-row casts were aligned with the existing typing convention afterward; emitted JavaScript is byte-identical to the passing test.

## Preserved timing and source control

All runs use the 8 GB heap, the approved cloud storage override and one heavy process at a time on host 4c46091479ea.

| Replay / source                                                                             | Year 1 | Year 2 | Year 3 | Year 4                  |
| ------------------------------------------------------------------------------------------- | -----: | -----: | -----: | ----------------------- |
| Wolf Creek, original main bf4e8386cd                                                        |  86.3s | 198.0s | 188.5s | salary crash            |
| Wolf Creek corrected, head df5caffa89                                                       |  78.0s | 201.8s | 164.1s | 783.2s; completes       |
| Same main, invalid-start record output only                                                 |  84.5s | 202.0s | 171.4s | same crash, named above |
| Absecon corrected, head 53397f7e5d                                                          |  60.2s |  95.6s | 166.1s | 229.9s; completes       |
| Absecon Highlands NJ3400160 / c89c92ac66b703f1, main 41f2348d9b plus diagnostic output only |  69.3s | 104.2s | 179.1s | 238.8s; completes       |

Every first-three-year fingerprint and table digest in the Wolf Creek diagnostic equals its original baseline. The diagnostic changed no record or guard; it has been removed. Absecon's older cf31d0ed63 crash no longer reproduces on current main, so its completion is not credited to this fix. Both completed baselines exceed the absolute 120-second target where shown. All four corrected Absecon fingerprints and table digests match its original baseline; each year is faster (13.13%, 8.25%, 7.26%, 3.73%). No fourth-year Wolf Creek comparison is possible against its crash. Its corrected run retained the standard benchmark loop byte-for-byte and added the read-only job/history check and actual February payday observation after the timed years, with no supplied actor, term or cash. Its first three years match every original fingerprint/table digest and stay within 20% (maximum +1.92%); year four has no complete original comparator. The completed Absecon comparison covers all four years. Wolf Creek still exceeds the absolute target in years two through four.

Commands: npm test -- --run src/core2/official-pay-return.test.ts --maxWorkers=1 (OFFICIAL_RETURN_SEED=471f7bb02cc1105e for the repeat); npm run speed:year -- --seed dc5525b9b709e9c4 --years 4 --max-seconds 120 --exclusive; the same speed command with c89c92ac66b703f1 for Absecon. Every npm command also sets OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" and NODE_OPTIONS=--max-old-space-size=8192.

Kathryn's natural returned term receives **67,760 cents** on February 1, 2029: salary:official:term:seat:US-SD:upper:019:0:2025-01-20:2029-02-01, journal:2029-02-01:907635. The South Dakota treasury loses exactly that amount and her cash account gains it; postings sum to zero. Her original job is unchanged and ended. The previous term, term:seat:US-SD:upper:019:0:2027-01-04:elected, ended August 9, 2028 by conviction; the new term records election on November 7. This payroll repair does not establish the separate election-eligibility rules after that conviction. Full records are in the linked JSON.

The corrected Wolf observation ran a temporary copy of scripts/speed-years/run.ts, resolving imports to the same files and appending the assertions only after its four unchanged timed/digest iterations. The node flags were identical, including --max-semi-space-size=64 and --expose-gc. Raw source/manifest, yearly receipts and named paycheck remain in /tmp/lane-2-official-pay-wolf-after.mts, wolf-observer-source.json, wolf-after.json and wolf-paid.json under that same prefix. Absolute-target exit 1 is retained after the observation; no timing or assertion is suppressed.
