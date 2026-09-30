# Transit payments need a canonical audit join

The published Floral report contains nineteen rural-transit laws. Three take effect after the run and sixteen lack attributable evidence. Source contains appropriation, commitment, payment and paid-service writers; the audit does not join those records. The report cannot establish that payments are absent because it exports no final world or program inventory. Team 2 should add the canonical join and preserve failed or missing stages as distinct reasons.

## 1. Why-chain

A transit measure becomes authority through `enacted-law-effects.ts:applyEnactedLawEffects`. Authority becomes a saved appropriation through `program-governing.ts:appropriationFromEnactedMeasure`. The executive can commit that authority through an actual governing decision. An installment posts only with recorded public cash. A posted operating payment can produce modeled service hours through `public-program-transit.ts:recordPaidTransitProgramService`.

The chain ends at paid contract bookkeeping; its later rider assignment and favorable reaction are HARDWIRED, not a person's observed choice.

## 2. Research and source pins

Audit PR1225 published head: `8dabb887396666bc2c3ea477a7fa40353554d140`.

Its Floral receipt uses source `48739fb370b945bd5b599e25a913a765145a2856`, seed `team2-main-proof-20260930-b`, place 0524070, January 5 through December 31, 2026, twelve completed steps.

The source check compared nine transit, program and type files with candidate baseline `b921f76393a153067840624e1b395f5bc474bbaf`; they were unchanged. No current product defect is inferred from the aggregate missing count.

The report's only catalog question is rural transit. None of Team 6's five new laws appears in this Floral receipt. The sixteen operative laws each have an unproven spending row and an unproven news row. Three future laws each have two future rows. Two other untyped laws account for the remaining four rows. Thus the report is not twenty-law coverage for Team 6.

## 3. Revisions: exact evidence joins for Team 2

1. Locate each exact measure below in `history.legislativeMeasures`; pair its enactment by `measureId` and resolve the recorded operative date. Inspect its `history.legislativeDraftLineages` family/version/variant/profile and current adopted provisions. A yes answer alone is not the pinned service mandate.
2. Select `history.publicProgramRecords` where kind is appropriation and `sourceMeasureId` equals that exact measure ID. Keep id, programKey, jurisdictionId, accountOrganizationId, amount, availableFrom and availableThrough. An appropriation is authority, not cash or paid service.
3. Join kind commitment by `appropriationId`. Retain `decidedByPersonId`, authority, selected alternative, recipientOrganizationId and installments. Missing commitment needs the governing matter, executive eligibility/decision and refusal reason; it is not automatically a missing producer. Check `state-governing.ts:governingProgramAvailableHandler` and its enacted-program work route.
4. Join kind installment by `commitmentId`; keep installmentIndex, status, resourceFlowId, reason and recordedAt. A failed installment is a recorded refusal, not paid service. Its plan supplies purpose and amount.
5. Join history.resourceFlows by installment resourceFlowId. The basisReference kind must be public-program with that commitmentId and installmentIndex. Source organization must equal the appropriation account; recipient must equal the commitment recipient. Join history.resourceTransferOutcomes by resourceFlowId; require completed status, currency and transferredAmount matching the plan. Amounts are minor currency units. Capture before/after public and recipient cash if the run retains those records.
6. For paid operating transit, find the event whose stableKey is installment.stableKey plus `:paid-service-hours` and type is `transit.program-paid-service-hours`. Its involvedEntityIds include the measure ID and resource flow ID. Join `history.worldMetricStates` whose provenance sourceEntityIds contain that service event ID. Inspect metricId, scope, referencePeriod and exact quantity. Service units use the authored contract price; they do not prove actual route, fare, ridership or travel time.
7. Keep personal noticing and behavior separate. A published event, knowledge record or authored modeled ride does not establish an actual rider decision. Do not manufacture a lawExposure solely to make the audit pass.

The current audit first looks for a person's lawExposure. Its subsequent generic referenced-record loop explicitly skips non-news effects. A direct appropriation reference therefore does not yield paid spending evidence there, and indirect commitment/installment references need the joins above. Team 2 alone owns the adapter edit. This handoff changes no audit script.

## 4. What gets built

1. Team 2 exports the canonical program/payment evidence for these exact IDs or reruns with the join above. The runner's checkpoint contains metadata only; the published JSON has empty evidence arrays, not raw program records.
2. Classify each stage: future-effective; unsupported/mismatched lineage or provisions; no saved appropriation; no executive or governing decision; explicit zero commitment; cash/lapse refusal; paid installment; missing paid-service event; service recorded without actual rider decision.
3. Team 6 repairs only an actual missing production stage after that evidence. Existing source already calls the paid-service writer after a posted installment. Preserve Team 3 adapters and Team 2 audit ownership.

| Exact measure ID                     | Jurisdiction  | Designation | Effective date | Published limit      |
| ------------------------------------ | ------------- | ----------- | -------------- | -------------------- |
| legislative-measure_07dad19d8554f8bd | California    | AB 12       | 2027-01-01     | future effective     |
| legislative-measure_c883e8d5f1068ae6 | Colorado      | HB26-1004   | 2026-04-17     | attribution unproved |
| legislative-measure_1261893324a284b8 | Connecticut   | HB 5006     | 2026-10-01     | attribution unproved |
| legislative-measure_67b3862dcea2c742 | Delaware      | HB 3        | 2026-04-17     | attribution unproved |
| legislative-measure_8311673c1cbb9d5d | Hawaii        | HB 14       | 2026-06-29     | attribution unproved |
| legislative-measure_01ecd023f3289d60 | Illinois      | HB 16       | 2027-01-01     | future effective     |
| legislative-measure_e933089fbac74151 | Maine         | LD 2        | 2026-06-29     | attribution unproved |
| legislative-measure_2c5e2c179d8566b2 | Maryland      | HB 14       | 2026-06-01     | attribution unproved |
| legislative-measure_78920adec78dc0fd | Massachusetts | H.57        | 2026-07-16     | attribution unproved |
| legislative-measure_a761035d3cdfe879 | Michigan      | SB 8        | 2026-06-29     | attribution unproved |
| legislative-measure_314da499f321a7ca | Minnesota     | HF 19       | 2026-08-01     | attribution unproved |
| legislative-measure_fa02a9d00f95c69f | New Hampshire | HB 4        | 2026-06-16     | attribution unproved |
| legislative-measure_ef2fee0639290aad | New Jersey    | A45         | 2026-07-04     | attribution unproved |
| legislative-measure_14ec160a7413a2cf | New York      | A22         | 2026-05-07     | attribution unproved |
| legislative-measure_ddd7cd32c7ea99a3 | Oregon        | HB 2        | 2027-01-01     | future effective     |
| legislative-measure_048d1addaf509a4f | Pennsylvania  | HB 6        | 2026-06-16     | attribution unproved |
| legislative-measure_2590b7f222ad205c | Rhode Island  | H 12        | 2026-07-01     | attribution unproved |
| legislative-measure_b320bf9cb61fd1b4 | Vermont       | H.3         | 2026-07-01     | attribution unproved |
| legislative-measure_7c47e25f457a4846 | Virginia      | HB 12       | 2026-07-01     | attribution unproved |

## 5. Simulated, records, world pieces, checks

SIMULATED: the twelve-step run is Team 2's published evidence, not a new Team 6 run. RECORDS: program authority, governing commitment, installments, completed transfers and paid-service events exist in source. WORLD PIECES: a valid profile, mandate, recipient and cash are necessary; a missing piece must retain its actual reason. CHECKS: sixteen operative law joins remain unverified, not sixteen demonstrated missing payments. The ninety-day explicit-request transit reader is a separate path; do not substitute its policy-realization records for the automatic state program's installments.

## 6. Proof run

Executed: read the published runner, report and JSON; enumerate nineteen exact measure IDs; verify three future and sixteen attribution-limited spending rows; compare nine source files with the run source. NOT RUN: final-world inspection, actual appropriation/payment/service counts, a new watched run, save/reopen or speed comparison. The exported runner does not provide the raw final world needed to finish those counts.

## 7. Worked example and boundary handoffs

No paid transaction is observed from the exported report. For Colorado HB26-1004, exact measure `legislative-measure_c883e8d5f1068ae6`, the report records an April 17, 2026 operative date and no attributable spending evidence. Team 2 must extract its saved appropriation and follow the joins above before any person, dollar amount or service count is reported.

Team 3 public-land adapter handoff: held Team 1 PR1131 source is `0d64e106a5c49645bc6904952c514e30d5919b96`. The exact function is `public-land-access-law.ts:nearbyPublicLandAcres`, whose population line uses townRoster(town). Team 6 has not copied or changed that adapter. Preserve Team 3's world-aware roster edit. Held dependencies include policy-bill-terms, law-outcome-calibration and public-land-access research data; none is silently represented as main behavior.

Team 3 consumer-privacy source requirements: Virginia 59.1-577 supplies authenticated access, correction, deletion, portability and targeted-advertising/sale/profiling opt-outs. It specifies a 45-day response and one justified 45-day extension. Virginia 59.1-584 supplies exclusive Attorney General enforcement, a 30-day notice/cure, up to $7,500 per violation and no private action. Coverage, exemptions, pending-request repeal, actual complaints/compliance, local legislative preemption and territorial authority remain distinct research requirements. The fixed administration fiscal estimate and earnings about-zero do not cover these rights. Primary response hashes and URLs are published in Team 6's five-law research handback at `c5c864c5a8219b02b73681654f91b921a18a3a9e`. Team 6 makes no consumer-privacy shared-reader edit.
