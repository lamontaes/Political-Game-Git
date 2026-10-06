# Session 29 progress

## Done

- B07 step 3 read model added in `src/simulation/player-known-views.ts`.
- `statementsHeardByPlayer` reads only player-owned `EventKnowledgeRecord`s with `told-by` source and nonnull `claimId` resolving to a saved `ClaimRecord`, returning speaker, recorded statement, said date, learned date, and source record IDs. It does not total views or infer information from population attitudes.
- `officialViewCuesForPresentPeople` projects a stance for actual present person IDs only when `viewOfOfficial` finds that person's saved view of the player. It returns no prose and writes no records.
- Session 4 consumer seam: once Session 4 has an exported situation-reader/current interface, pass viewer/player ID and the actual present-person IDs to `officialViewCuesForPresentPeople`; include returned person stance as grounded situation facts in its existing fact packet. The current checked `INTERFACES.md` has no current presentation situation-reader seam for this cue, and Session 4's pending PR seam is not checked out here. This branch does not edit `src/presentation/life-conversation.ts` or invent dialogue.
- Applied the Session 14 handoff #6016331388: no existing player-facing heard/told screen exists; developer diagnostics do not count as a player consumer. The player “people you know” list reads only controlled-person `told-by` knowledge with a nonnull `claimId` joined to `world.history.claims`, deriving speaker and statement from the claim, said date from `claim.madeAt`, and heard date from `knowledge.learnedAt`. No hearer is invented and no totals/meters are added.
- Added focused tests against a new game in the seeded random place selected by `drawRandomPlace`, covering saved-record filtering and presence-gated view projection.

## Next

- Reconcile consumer contracts after the Session 4 and Session 14 owners answer the parent on #2424; preserve their file ownership and change only the call site owned by the relevant session in its own PR.
- After composing the branch onto current `origin/main` (`e597ec933`), focused Vitest passed (2 tests), test-inclusive `npm run typecheck` passed, `npm run release:check -- --mode pr` passed, and Prettier/ESLint/`git diff --check` passed. The #2470 merge fixed the previous unrelated press fixture errors; no duplicate fixture patch was added. The explicit `impact: none` release declaration is present because no interface is connected by this read-model change.
- The focused tests are the available new-game/random-place proof; no separate watched generated-world route was run.

## Exact resume

Branch `session29-b07-p3`, composed onto `origin/main` e597ec933. PR #2536 remains a draft. Continue consumer contract reconciliation only when a real Session 4/14 consumer seam becomes available, preserving their file ownership.
