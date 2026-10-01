Before: Purchase quotes moved with consumer prices while rent read the housing market.

After: The quote uses the county's opening median home value times the existing modeled home-price level. This addresses A54's price reader. Existing contracts and mortgage estimates retain their behavior. The controlled reader tests pass; no completed purchase or mortgage-servicer proof is claimed.

## 1. Why-chain to bedrock

The quote changes because homePurchaseTerms reads the town's dated housing level. That level follows saved macro months through the existing housing-price model. Its inputs are income growth, policy-rate changes and the price-to-income gap. The opening value comes from the county ACS table. Bedrock is the recorded macro inputs and sourced county median. Code-derived: home-purchase.ts:133 uses homePriceLevel for priceMinor; no extra price draw or law multiplier is added.

## 2. Research

No new estimate or mechanism is introduced. The existing county reader cites ACS 2020–2024 table B25077 at county-home-value.ts:14. The existing housing model cites the FHFA state panel from 1980–2024 at living-world/housing-price-model.ts:4. Their limitations remain: county medians approximate a particular home, output stands in for income, and policy rates stand in for mortgage rates (living-world/housing-market.ts:8). A54 authorizes consuming that existing model, not recalibrating it.

## 3. Revisions

One consumer handles every jurisdiction. With no local history, the housing reader uses national months. With no jurisdiction, the quote uses the national housing series. With no recorded months, the level stays one. Historical contracts are never repriced. The fixed mortgage estimates and A57's housing-law uplifts remain separate unfinished items.

## 4. What gets built

1. Route only the purchase price through the existing housing-level reader.
2. Retain the legacy down-payment and monthly-payment calculation.
3. Update the existing price expectation and add five controlled saved-record cases.

## 5. Simulated, records, world pieces and checks

RECORDS: this is a pure quote reader; it writes no flow, debt, payment or decision. WORLD PIECES: county home-value data and the housing market already exist. SIMULATED: no person's purchase decision is tested. CHECKS: divergent consumer and housing levels must produce the housing-based quote; canonical reload preserves the result and reading preserves all bytes.

## 6. Proof run

Measured: five cases passed in 11.06 seconds, with 99 milliseconds in test bodies. Seed: team4-a54-home-price-level-all56-20261001. The cohort was sampled from the existing 56-place representatives: Illinois, Minnesota, Kentucky, Alaska and Nevada. The identical tests against the original production reader failed five cases in 10.43 seconds at the price assertion. Candidate source was restored byte-for-byte afterward.

Two earlier fixture attempts failed five cases each before any price assertion. The first incorrectly initialized an overdue macro schedule (12.80 seconds). The second omitted required national housing/local exposure fields (12.52 seconds). Canonical validation was retained and the controlled records were corrected. A sandbox EPERM prevented an earlier launch before tests; the supported approval route then ran the native test.

Two-root strict types returned zero diagnostics. Changed-file lint, formatting and whitespace passed. Zero-dice reported zero new lines and five inherited removals, exit 1; its list was not changed. The changed existing 60-day presentation test, broad suites, browser, year/speed and clock diagnosis were NOT RUN. Local simulation base is main1d24; current-main readback confirms both changed existing files are byte-identical before this patch. This is not a full latest-main composition run.

## 7. Worked example and next dependency

Measured controlled Illinois quote: the original reader returned $547,000 from the synthetic consumer-price ratio of three. The housing-based expected quote was $184,000. These are fixture quote amounts, not an observed sale or a named person's payment. No named purchase trace was produced.

Next: CTO reviews A54's narrow consumer and current-main composition. A52 needs the exact medical/vehicle category-overlap ruling for the sourced BLS basket. A57 needs the operative inclusionary share and same-kind affordable-designation contract; its requested dated G2 reader input is absent from current main. Audit owns clock diagnosis. Method: reused the existing workspace and native focused test runner; no new checkout or production schedule change.
