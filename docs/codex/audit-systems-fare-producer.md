# The fare cases fail for two different reasons

Washington's governor chose to spend nothing, so no payment existed to stamp. Oregon, South Dakota and Illinois paid before the new law became operative, so their payments cannot be attributed to that law. Ohio paid once before and twice after its operative date; only the latter payments received the new law's stamps. Builders need to repair the early spending-authority producer and keep the governor's no-spending decision separate. A contract check must not require every enacted appropriation to produce a payment.

## Exact fresh trace and scope

Measured execution at d9e4b8689b24470af29262d5b38affcc9dbb360a reused the exact enactedTransitBill function from src/presentation/all-state-transit-payment.test.ts:68, with synthetic passage inputs unchanged. The audit-only entrypoint docs/codex/audit-systems/fare-producer-probe.mts:1 advanced the same ordinary clock through operative date plus 62 days. It captured appropriation, governing matters, commitments, completed transfers, canonical law on each payment date and exact spending stamps. Full identities and copied-source/function SHA256 values are saved at docs/codex/audit-systems-fare-producer-trace.json:1.

Measured denominator: five controlled state cases, each with one authored $8,000,000 appropriation. This is a fresh diagnostic replay, not the original four-failure test summary or a nationwide result. It did not add payments, edit principle strengths, substitute favorable seeds or mutate production source.

| State and named governor | New law operative date | Actual completed installments | Payments governed by this new measure | New-measure spending stamps | Recorded cause |
| --- | --- | ---: | ---: | ---: | --- |
| Washington, Philip Sanford | June 11, 2026 | 0 | 0 | 0 | No-action commitment; no money paid |
| Ohio, Jennifer Cabrera | April 19, 2026 | 3 | 2 | 2 | Two payments follow the operative date |
| Oregon, Elizabeth McBride | January 1, 2027 | 3 | 0 | 0 | All three payments precede the operative date |
| South Dakota, Sam Sutton | July 1, 2026 | 3 | 0 | 0 | All three payments precede the operative date |
| Illinois, Diana Ali | January 1, 2027 | 3 | 0 | 0 | All three payments precede the operative date |

## Washington has an actual no-spending decision

Measured named place example: Sarah Bell's controlled Washington opening is in Aberdeen Gardens. Governor Philip Sanford's appropriation opened on January 19, 2026, while its law was not operative until June 11. He chose “Commit nothing for now” on March 31 and June 13. His saved commitment has an empty installment array. A third governing matter was open on July 13, with a deadline of August 27; the diagnostic stops August 12. There is no completed payment or missing spending stamp to repair in that observed chain.

Measured source: the program decision route honors a no-action alternative at src/simulation/governing/state-governing.ts:1744. It schedules reconsideration after 30 days at line 1767. Staff advice can choose no-action at line 991; the general NPC fallback still uses a seeded option pick at line 2168. The diagnostic proves the saved choice, not which unexported advice/fallback component caused it. That decision mechanism remains a separate zero-dice design question.

## The other failed cases spend before the operative law

Measured replay: Oregon's Adair Village, South Dakota's Aberdeen and Illinois's Abingdon each record the three-month operating commitment on March 31, 2026. Payments occur March 31, April 30 and May 30. Every payment is 266,666,666 USD cents, or $2,666,666.66. Each state's three payments sum to $7,999,999.98, leaving two cents of the authored authority. All payments precede that state's operative date. Canonical law on each payment is its starting-law identity, not the authored new measure.

Measured Ohio control: Mei Miranda's opening is in Aberdeen, Ohio. Governor Jennifer Cabrera makes the same three-month choice and payment schedule. The March payment precedes April 19 and is governed by starting law. April 30 and May 30 are governed by the actual new measure legislative-measure_d78257556e122bf7. Exactly two matching stamps retain those transfers' IDs, for $5,333,333.32 of attributable new-law payments. No boarding or personal fare relief is inferred.

Measured producer defect: applyFamilyAppropriations chooses availableFrom from raw enactment.effectiveAt or the current day at src/simulation/enacted-appropriations.ts:61. It does not resolve the canonical operative date. All five diagnostic authorities consequently open on January 19. The generic appropriation route also chooses this raw adopted date at src/simulation/governing/program-governing.ts:266; only the compiled rural-transit profile branches explicitly use operativeDateInWorld at line 367 and line 474.

Measured stamp behavior: recordPaidTransitProgramService resolves the law on the actual installment recording date at src/simulation/governing/public-program-transit.ts:88. It admits ownLaw only when the governing measure matches the source measure at line 96. This prevents misattributing an early payment to a future law. The three early-paying cases therefore expose an authority-date producer defect, rather than an absent stamp for a qualifying current-law payment.

## Actionable repair and acceptance contract

Required producer repair: the enactment-to-authority owner resolves canonical operativeDateInWorld for each appropriating component and uses that supported availability start. Preserve filed amount, scope and stated duration relative to the lawful start. Cover family appropriations and the non-profile generic route, including amendments and failed/unknown operative resolution. Unknown authority dates must remain blocked rather than defaulting to immediate availability. Do not rewrite already posted historical transfers or attach the future measure retroactively.

Required service-fixture boundary: assert stamps for each actual qualifying completed payment with a valid appropriation→commitment→installment→transfer chain and the same governing measure. Report no-action, no payment, pre-operative payment and superseding-law cases separately. If a controlled fixture must test the callback, supply a supported operating commitment after availability and label that choice controlled. A canonical enacted law does not force a governor to spend.

Required builder proof: after repairing availability, rerun these same five cases and preserve authority date, choice, installment/transfer date, canonical law, stamp IDs and Save/Continue. The lawful producer may change the payment schedule; no new result is assumed here. Team 6 owns its cost callback and fixture boundaries; the coordinator assigns the shared authority hunks. Real operator/rider linkage remains after the 3:30 stamp batch as previously directed.

## Method and limitations

One fresh five-state audit-only probe invocation completed with exit code zero under the ordinary storage guard on this D9 pin. The earlier two-invocation B0 replay is preserved separately at docs/codex/audit-systems-fare-producer-trace-b0-historical.json:1 and supplies no current-main pass. These are five diagnostic traces, not five executed Vitest passes. The original source fixture and all production files remained unchanged. No new nationwide campaign, actual boarding, researched fare, operator expense, browser or save/reopen proof was created. The main head and source age must be rechecked before treating these traces as latest-main proof after later merges.
