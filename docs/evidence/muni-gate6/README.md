# MUNI-GATE6 bounded return

Existing PR #149 owner; this is implementation/test evidence, not independent
or human approval. Reviewed baseline remains
`93328bd76f6b191a35ec472bc0f6738f44e9c2c8`. Published DELTA5
`7698a35d9fe5f87157650321a85aefaeba167ef9` is preserved.

## Actual hosted failure

Run [34362727533](https://github.com/lamontaes/Political-Game-Git/actions/runs/34362727533)
passed repository validation and 289 browser tests. The single failing test was
`legislation.spec.ts:362`, which placed six independent provenance checks and
12 navigations under one 30-second test budget. Both original and retry traces
were downloaded from artifact 10110154017 and inspected. Completed navigations
took 751–2,402ms; retry's final navigation received only 448ms before the total
test expired. This is not evidence of a 30-second navigation stall, incorrect
municipal role/locality semantics, or generic host-load failure.

The repair parameterizes those six scenarios as six independent tests. Every
URL, helper, visibility requirement, provenance assertion, default test timeout
and assertion timeout is retained. No seed changes, skipped scenario, weakened
expectation, global budget increase, or production/root change. The small durable
lesson is encoded in the test structure. `hosted-diagnosis.json` records the
actual trace timings and artifact/run identity.

## Current normal-route evidence

UI-core consumed the complete DELTA5 source in
`3bddebdd74ba1192eff75bb24f72cdede6f62a62`, with combined prose allocation through
the accepted generator. Its currently published root is
`1119e890c471fbf83b4cd592aabe6b28c5f075b2`. A separate clean detached checkout of
that root was used without reapplying municipal changes or editing UI's workspace.
Municipal runtime/projection files compare byte-identically with this donor.

The citizen test creates and saves a real normal Carson City locality resident,
reads without writing, explicitly adds an authored session, attends with the
keyboard, verifies the civic room and exact government event, saves/reloads the
whole World, preserves every role/participation, and rejects duplicate attendance.
Member work remains disabled for the citizen. The member test explicitly seats
an authored canonical member in that real creator save before loading; normal UI
then prepares and completes exactly 20 minutes of private notes and preserves
that state and authority on reload and duplicate action. This proves authorized
member actions through normal UI, not normal election or acquisition of office.
Neither authored session timing nor notes are a real published agenda.

## Preserved repair and honest coverage

The [eight-finding disposition](../muni-delta5/README.md) and complete
[per-government operation/refusal map](../muni-delta5/coverage.json) remain valid:
1/2 fixed authored provenance and explicit mutation names; 3 generated replay
and corruption gates; 5/6 research authority and locator classification; 7 earlier
screenshot path fix preserved; 8 grounded prose classification. Finding 4 remains
a source limitation, not fictional finance. No municipal source/runtime changes
were required for the hosted browser failure.

Coverage is **144 inventory entries, zero operative ordinance packs, zero exact
capacity overlaps**. Accepted finance/employment observations cover different
GIDs; missing observations are not zero money, current balances or legal powers.
Cached Carson §2.100 and Richmond §§6.10–6.12 corrections remain admitted and
compiled. No source was reacquired or research relabeled current enacted law.
Remaining supported primary gaps are Carson introduction/post-adoption and
notice/hearing enforcement; Portland passage/post-adoption/introduction/readings;
Charlottesville post-adoption/introduction/readings; Richmond readings and
notice/hearing enforcement. These are explicit refusals, not invented procedure.

## Architecture and acceptance

Canonical World, organizations, roles, time, Work, history, saves and venue
bindings remain the only systems. Global UI stays owned by UI-core. Reconciliation
preserves both main's release check and municipal generated-data checks; generated
prose is rebuilt with accepted tooling, not manual identities or stale counts.
No release activation, deployment, merge, or monitoring is authorized by this
return. Original reviewer receives only the bounded reviewed-to-current map;
independent acceptance and human visual/prose approval remain separate.

## Executed gates and source identities

Clean donor source: `caed97597add62abca74162ddb7d58bc675f6017`. Main reconciliation:
`83f76b351cc4943472620bc2203e40cb7f910f91` includes fetched
`a73cf3860be9f04bee6981b72c97c2c72ec94133`; the final fetch retained that same main.
The required release declaration was added through the accepted command, with
truthful feature scope and no version bump or release activation.

- Full `VITEST_MAX_WORKERS=1 npm run validate`: **201 files, 3,637 passed,
  2 skipped**; formatting, lint, types, release check, source validation/replay,
  both municipal projections, build, demo and art validation all passed.
- Focused current source/runtime: **22 passed**; current consumer: **24 passed**.
  Includes actual corrupted generated-hash refusal, evidence classifications,
  canonical roles, explicit actions, closed-session refusals and saved state.
- Donor `PLAYWRIGHT_PORT=5397 npx playwright test tests/e2e/legislation.spec.ts
tests/e2e/municipal-public-work.spec.ts --workers=1`: **15 passed, 48.2s**.
  Every formerly grouped scenario is still checked, plus actual pointer/keyboard
  municipal actions in structurally different Charlottesville and Carson City.
- Normal UI at `1119e890`, unique port 5398 and run `muni-gate6-normal-tsx`:
  **2 passed, 23.9s**. Exact clean served identity and digest are in
  `normal-provenance.json`. This is new proof of that published UI root, not a
  relabeling of previous captures or later unpublished UI combinations.
- Art inventory and QA passed. Both checkouts remained clean after tests and
  both owned server ports stopped; the finite heavy slot was explicitly released
  to UI-core.

The first normal command failed before any case ran because Node required a
JSON import attribute without the TS loader. The successful command used
`NODE_OPTIONS='--import=tsx'`, exactly as UI-core confirmed for its previous
recorded run. No source, assertion, or JSON file changed to obtain the result.
Both commands' logs are retained, distinguishing startup from a test failure.
Screenshots were inspected; automated interaction and an agent's inspection are
not human visual approval. Existing source missingness warnings remain warnings,
not newly established capacity observations. No current full 295-case hosted
browser result is claimed; the original 289 passes remain attributed to their
old run and the affected current local browser matrix is separately recorded.
