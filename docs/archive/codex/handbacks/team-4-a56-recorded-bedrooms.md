# First leases use household size for bedrooms

New leases now use the recorded household size for representative bedrooms.
The previous bedroom draw could assign a different rent category to the same
household. Existing leases keep their recorded bedrooms and landlords.
This repairs the bedroom portion of the audit item. Initial landlord selection
still contains a draw and remains unfinished.

## 1. Why-chain

A lease's bedroom count chooses a HUD rent category. The old first-lease writer
chose that count from hand-set shares by home classification. It adjusted the
shares for household size, then selected a category with a seeded draw. The shares
had no read source. The chain ended at a stand-in and dice.

The replacement reads the actual primary living household members. It uses the
same representative occupancy rule already present in the old function. A single
person gets an efficiency; larger households use two people per bedroom, within
the existing zero-to-four-bedroom rent table. The terminal is a recorded household
count plus an explicitly representative occupancy assumption. This does not
establish measured dwelling geometry or a universal legal occupancy ceiling.

The calculation is in src/simulation/living-world/town-rent.ts:514. The sole
first-lease caller at src/simulation/living-world/town-rent.ts:1214 keeps the
previous home's recorded bedrooms before applying that calculation.

## 2. Research

The owner-authorized audit gap A56 requires deterministic bedrooms from household
size and retention of recorded landlords on renewal. No new empirical amount or
occupancy standard is introduced. The existing HUD rent table remains the dollar
source. The removed bedroom shares were explicitly labeled unread placeholders.

Households larger than eight people still reach the existing four-bedroom table
limit. Actual parcel geometry and larger-unit rent categories remain absent.

## 3. Revisions

This change intentionally alters first-lease bedroom categories and their linked
rent quotes. Existing saved leases are not repriced or migrated. Previous bedrooms
on the same home take precedence over a new household-size estimate. Renewal
continues to use the recorded landlord endpoint and obligation identity.

## 4. What gets built

1. Remove the unused hand-set bedroom-share table and the bedroom draw.
2. Use the existing representative household-size rule at the sole first-lease
   caller. Refuse an absent or invalid household count.
3. Preserve saved bedrooms and the existing renewal identity path.
4. Add five sampled-place writer fixtures with canonical save/reload and replay
   assertions. Initial landlord selection remains a separate unfinished part.

## 5. Simulated, records, world pieces, checks

The ordinary lease writer records a bedroom category for an actual household.
This is bookkeeping, not a housing-search decision or a measured floor plan.
The actual household, tenure, dwelling, leaseholder and landlord records already
exist. A place without its HUD rent row still receives no invented rent.

The same source rule serves every jurisdiction with those records. Five places
are scoped proof, not fifty-six natural household simulations. No law terms,
law stamps or shared registry entries change in this patch. Payment machinery is
unchanged; a different first-lease bedroom category can change rent and later
payment amounts.

## 6. Proof run

The final five-place native file passed all five cases in 62.47 seconds on the declared
composition. It retains every bedroom, landlord, obligation, transfer, reload and
replay assertion. The anniversary is a controlled writer fixture. Earlier due
activities are canceled through the canonical test-fixture writer; no natural
year or ordinary clock advancement is claimed.

Earlier fixture receipts remain preserved: five failures at the deferred reload
boundary, five at skipped due activities, then three passes and two failures at
the known old crisis-parent lookup. The final composition consumes the already
merged crisis-parent repair. No crisis diagnosis or foreign source edit occurred.

The paired original-reader run failed all five bedroom assertions in 18.85
seconds. The final saved-person receipt is recorded in
docs/codex/effect-batches/team-4/a56-saved-leases.json. Lint, formatting and whitespace passed. Strict two-root types
passed with the declared foundation reader. Main-only types instead expose the
already-known dated-reader dependency from the preceding price patch.

## 7. Worked example

The test samples five distinct state places with a logged seed. Each lease's
recorded primary living members determine its first bedroom category. Renewal
retains the lease flow, landlord and obligation; it creates no cash transfer.

Fiona Preston's saved flow resource-flow_9be04e42983d22fe now records one bedroom;
the original reader chose two. William Caldwell gets an efficiency instead of
two bedrooms. Kaitlyn Collins gets one instead of three. Thomas Rivers gets an
efficiency instead of two. Carmen Watts gets one instead of two. These are
generated households in the controlled five-place fixture, not new authored
residents. The five worlds contain 221 active leases in total.

The receipt includes their exact person, flow, obligation and landlord IDs.
Anniversary renewal retains those identities and bedrooms, and save/reload replay
leaves the same bytes. Rent dollar amounts were not collected in this receipt;
the ordinary rent calculations can change when a first bedroom category changes.

## What happens next

CTO reviews this narrow bedroom mechanism. The remaining initial landlord draw
needs its own recorded ownership or decision mechanism. This patch does not mark
all of A56 complete. Groundwater is deferred to the roadmap; its source packet
and the separate living-cost preparation remain preserved.

## Method

Owned paths are the bedroom hunks in town-rent.ts, its new focused test, this
handback and the release declaration. Runtime base is the preserved local source
with exact foundation reader files from 2c5cf28db1c4048eea89033cb6262064fa83e3ae
and the admitted crisis-records blob 7a764ede3ba48cfb2c0c9c63564447b8f460e631.
This is scoped composition evidence, not a full current-main run.
Browser, natural-year, whole-suite, nationwide effects and CI cancellation were
not run. Timeouts, integrity assertions and dice allowlists remain unchanged.
