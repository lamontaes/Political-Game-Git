# Eviction proof resolves the recorded household

The eviction proof reader now resolves a household by its saved record when the separate lease projection is unavailable. It no longer treats the first event ID as a household. This improves failure detection; the corrected eviction producer still needs its watched replay.

## 1. Why-chain

An order-linked destination names its involved entities. The canonical event writer sorts those IDs, so the first can be a dwelling. The old fallback used that first ID to find later household occupancy. That could miss a return to the former home. The terminal is a record lookup by an incorrect assumed position, not a housing decision.

## 2. Research

The inspected canonical history writer deduplicates and sorts involvedEntityIds. The proof fallback in scripts/governance-proof/systems.ts previously read index zero. Recorded households have exact IDs and formation dates; those records now identify a unique household in the destination event. No legal authority, cost or causal rate is introduced.

## 3. Revisions

An available typed lease projection remains the first source. The fallback accepts exactly one involved household already formed by the destination date. Missing, future or ambiguous household identities remain unresolved. No household, occupancy or host answer is created.

The earlier Cedar Hills failure used an available typed lease projection. This reader correction does not invalidate that actual former-home return or turn it into success.

## 4. Numbered parts

1. Replace the positional fallback with a unique recorded household lookup.
2. Verify dwelling-first event IDs still expose a later household return.
3. Verify absent, future and ambiguous identities are not guessed.
4. Preserve Team3's producer source and the prior failure receipt unchanged.

## 5. Simulated, records, world pieces, checks

SIMULATED: no new decisions. RECORDS: the existing order-linked destination, household, tenure and occupancy states. WORLD PIECES: the saved household must exist before the destination. CHECKS: former-home return detection and unchanged world serialization.

The reader file passes 12/12 tests in 11.05 seconds. Strict scoped types have zero diagnostics; scoped lint, formatting and whitespace pass. The new fixture exercises the projection-unavailable branch. Independent helper review and producer replay are NOT RUN.

## 6. Proof run

The retained Cedar Hills, Utah replay remains at product 3ffad216e1c567eb3f396b65e1b40cd7665e6b52 and collector 0494e6c8845a49ee191111fb83e2b97910d5cb24, seed team2-law-proof-20260930-a. It observed four filings, three evictions, three no-fixed-home destinations and one later former-home return. Exact records remain in team-2-host-replay.md and .json.

Next producer input is Team3 aa6575a9b03175e46b342d35cdffcea72543c958, PR1189. Its watched replay remains NOT RUN behind the top filing/terms checkpoint. Unit fixtures do not certify that producer.

## 7. Worked example

The authored reader fixture lists the dwelling before the household in the destination event. A saved household occupancy becomes primary three days after its eviction order. The corrected fallback detects that state; removing the household record leaves identity unresolved. No person-money result or cost is invented.

The prior actual Deborah and David Carlson return remains a failure receipt, with the exact order, dwelling and January 4 occupancy in team-2-host-replay.md. The corrected producer must be replayed before reporting their after-repair result.
