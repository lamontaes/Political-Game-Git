# Public Money & Services: funded rural transit

The first playable slice follows one rural-transit spending law from the government's recorded account to a resident's requested and completed trip. The following script is the target to build and prove, not a claim that it passes today.

## Player script

1. Open a small saved world with a controlled seated lawmaker, a seated governor and actual residents. See the government's account balance and any held cash separately; forecast revenue does not appear as spendable cash.
2. File the existing rural-transit spending law with an explicit appropriation amount and service window. See those terms in the bill and its budget trade-off; no universal hourly cost or invented receipt is supplied.
3. Take the bill through its existing legislative procedure and the actual executive desk. See its final enacted terms and effective dates; an empty executive desk cannot be skipped.
4. Open the enacted program. See the saved appropriation, its government, availability window and remaining legal spending authority. The appropriation alone moves no cash and delivers no ride.
5. Use the existing implementation path to commit and pay a saved eligible operator for operating service. See the actual payment and corresponding government-account debit. Unpaid, maintenance-only or wrong-government commitments cannot advertise a delivered trip.
6. As a resident in the service area, choose the paid service and request a trip with an actual start/end time. See a saved request, rider participation and scheduled activity. A request alone is not completed service.
7. Attend that scheduled trip through the ordinary activity control. See one named-person service receipt with the completed duration, governing law and original appropriation/payment/request/activity identities.
8. Save and Continue. See the same account balances and receipt, with no extra appropriation, payment or ride. Repeal prospectively stops new law-governed requests while preserving the completed trip and its original records.

## First build step and seam

Add a controlled-resident presentation adapter around the existing requestPublicService function; it must derive the actual controlled person and pass the saved commitment/start/end unchanged. Proposed owned files: src/presentation/public-service-work.ts and its focused test. The resident request, scheduled activity, completion and service-delivered writers survive; no second service mechanism, schema, price or taxpayer writer is proposed.

Post this seam in00d before edits. Any change to the shared request/completion/appropriation functions will be named separately before editing; the slice owner writes that piece and other slices consume it. Root's excise regression and Claude's lazy registries/governor-fixture conversion remain protected. Team3 receives the completed A33 paycheck preparation; Team6 adds no parallel tax-policy edit.

The end-to-end proof will use #1619's smallWorld and enactThroughDesk, the existing program/payment/request/completion writers, actual records and a named seed/place. Node world.ts and macro-economy.test.ts LOAD checks apply on the composed tree. Only then can the small-world test run, followed by CTO browser play. No years, broad suite or inherited test-limit expansion is part of this step.

## Actual state

SCRIPT: written. BUILD: not started. LOAD/E2E/BROWSER: NOT RUN. A33 preparation remains published separately; no slice DONE, service delivery or main-green claim.
