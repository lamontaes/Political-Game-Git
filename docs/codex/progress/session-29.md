# Session 29 progress

## Done

- B07 step 3 read model added in `src/simulation/player-known-views.ts`.
- `statementsHeardByPlayer` reads only player-owned `EventKnowledgeRecord`s with `told-by` source and nonnull `claimId` resolving to a saved `ClaimRecord`, returning speaker, recorded statement, said date, learned date, and source record IDs. It does not total views or infer information from population attitudes.
- `officialViewCuesForPresentPeople` projects a stance for actual present person IDs only when `viewOfOfficial` finds that person's saved view of the player. It returns no prose and writes no records.
- Session 4 consumer seam: once Session 4 has an exported situation-reader/current interface, pass viewer/player ID and the actual present-person IDs to `officialViewCuesForPresentPeople`; include returned person stance as grounded situation facts in its existing fact packet. The current checked `INTERFACES.md` has no current presentation situation-reader seam for this cue, and Session 4's pending PR seam is not checked out here. This branch does not edit `src/presentation/life-conversation.ts` or invent dialogue.
- Session 14 placement seam: call `statementsHeardByPlayer(world, playerId)` from the player-facing read route and place its entries in the “people you know” list. The current interface ledger does not identify a Session 14 placement contract on this head; this branch adds only the independent simulation read model.
- Applied the owner handoff contract #6016331388: the player list reads told-by rows with a nonnull linked claim only, derives the speaker and statement date from that claim, and uses the knowledge date as the heard date.
- Added focused tests for record filtering and presence-gated view projection.

## Next

- Reconcile consumer contracts after the Session 4 and Session 14 owners answer the parent on #2424; preserve their file ownership and change only the call site owned by the relevant session in its own PR.
- Formatting, typecheck, lint, focused tests, and `release:check --mode pr` remain blocked because this checkout has no `node_modules` (`tsx`, Vitest, ESLint, and Prettier are unavailable); no package install was attempted. `npm run typecheck` and `npm run release:check -- --mode pr` were attempted and stop at missing `tsx`. `npm run zero-dice` passed (`nothing new; 122 allowed lines left`), and `git diff --check` passed.
- Record random-place new-game evidence when the session's evidence runner/environment is available. The tests use a seeded randomly selected place from the supported life-place identities, but do not claim a watched generated-world route.

## Exact resume

Branch `session29-b07-p3`, based on `origin/main` e591ffc. Continue with `src/simulation/player-known-views.ts` and its focused test. Confirm types and formatting first; then reconcile the exact Session 4 situation reader and Session 14 placement owner contracts without editing their protected files. Current local working tree contains this step's new read model/test and this progress file; commit after checks that can run in this environment.
