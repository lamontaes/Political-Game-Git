# PRESS-REACH13 — Normal reporter/adviser reachability

Status: implemented on `cursor/press-reach13-7714` from UI `302e1f0c`.

Owner: Cursor PRESS-REACH13 (task D).
Authority: RETURN13 section D / BUILD-OUT7 I.

## Trace

A legislative-office adult/member start already has public civic occurrences
the source is in. It does not create a `profession:journalism` work role, so
`projectEligiblePressReporters` is empty until an existing adult is employed
through `seekCivicPressContact`. Adviser colleagues are optional; their
absence is not a blocking gap.

## Delivered

- `src/simulation/press-reach.ts` — snapshot, pitchable public bases, authored
  civic news-desk employment of an already generated adult.
- Request pitches may convey a public basis through `told-by` knowledge; private
  and future bases remain closed.
- Reporter decisions accept, defer (unfinished assigned work) or decline.
- Arrangement no longer requires an adviser. Preparation and feedback still
  require an accepted colleague when one is used.
- `PressWorkspace` asks from public developments, not only published digest
  items, and offers the civic reporting assignment when no journalist exists.
- No `PlayerGame` edit. Integration note: `docs/integration/press-reach13.md`.

## Tests run

`npm test -- src/simulation/press-reach.test.ts src/simulation/press-interview-producers.test.ts src/simulation/press-interviews.test.ts` — 13 passed.
`npm run typecheck` — passed.
`npx eslint` on changed TS/TSX — passed.
`npm run release:check` — passed.

Browser/human visual acceptance was not run. Full `npm run validate` was not run.

## Remainder

National newsroom sampling, real journalist identities and empirical response
rates stay unavailable. Ordinary play still needs the authored assignment when
the generated population has no journalism role.
