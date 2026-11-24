# PRESS-REACH13 — Normal reporter/adviser reachability

Status: implemented on `cursor/press-reach13-7714` from UI `302e1f0c`.
RETURN14 section E repaired the producer/casting path on the same branch.

Owner: Cursor PRESS-REACH13 (task D, continued as E).
Authority: RETURN13 section D / BUILD-OUT7 I, then RETURN14 section E.

## Trace

A legislative-office adult/member start already has public civic occurrences
the source is in. It does not create a `profession:journalism` work role, so
`projectEligiblePressReporters` is empty until `seekCivicPressContact` generates
a new fictional reporter through the character-history population writer and
employs that person only. Adviser colleagues are optional; their absence is not
a blocking gap.

## Delivered

- `src/simulation/press-reach.ts` — snapshot, pitchable public bases, authored
  civic news-desk employment of a newly generated reporter when no living,
  available journalist already holds the role. Existing adults, including
  family and colleagues, are not reassigned.
- Request pitches may convey a public basis through `told-by` knowledge; private
  and future bases remain closed.
- Reporter decisions accept, defer (unfinished assigned work) or decline.
- Arrangement no longer requires an adviser. Preparation and feedback still
  require an accepted colleague when one is used.
- `PressWorkspace` asks from public developments, not only published digest
  items, and establishes a new authored civic reporter when none exists.
- No `PlayerGame` edit. Integration note: `docs/integration/press-reach13.md`.

## Tests run

`npm test -- src/simulation/press-reach.test.ts src/simulation/press-interview-producers.test.ts src/simulation/press-interviews.test.ts` — 13 passed.
`npm run typecheck` — passed.
`npx eslint` on changed TS/TSX — passed.
`npm run release:check` — passed.

Browser/human visual acceptance was not run as a separate named review. Focused
Playwright ordinary News route passed on this checkout (`PG_RUN_ID=press-reach13-ordinary-proof2`).
Full hosted `test:e2e` remains the UI-core 45-minute timeout, not a press-spec
failure.

## Remainder

National newsroom sampling, real journalist identities and empirical response
rates stay unavailable. Ordinary play still needs the authored civic-reporter
generation when the generated population has no reachable journalism role.
