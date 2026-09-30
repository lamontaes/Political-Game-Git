# Getting a voter ID costs a work trip

Before: the policy question had no direct operation for these costs or people.

After: A photo-ID requirement now books an actual service visit for residents whose recorded civic intent calls for one. A completed visit charges the state and reduces hourly pay when it overlaps recorded work.

## Measured result

The watched integration test passes. One actual resident receives an ID after two ordinary days. A matched hourly job pays less after the service trip. An uncured provisional ballot is excluded; a timely documented return changes the winner. The exact dollar loss and the full-year result are pending the proof receipt.

Measured evidence: `src/simulation/voter-photo-identification-law.test.ts:150` contains the assertions for these controlled results.

## Implementation and remaining estimates

Implementation read: `src/simulation/voter-photo-identification-law.ts:191` books the visit from recorded intent and availability. This is implementation evidence; the proof report will provide the matched year receipts.

Estimation evidence: `data/research/laws/voter-photo-identification.json:18` records the research baselines and their limits. The cited implementation shows the supported producer boundary.

PLACEHOLDER: Missing license and car fields use a sourced age, income and liquidity estimate. Service times, outreach and card costs use disclosed fiscal and travel proxies. Most state cure deadlines remain a seven-day estimate. Individual ballot casting and return have canonical writers but no autonomous resident producer or player UI.
