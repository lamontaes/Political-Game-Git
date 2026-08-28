# Thin Election Contest Substrate

## Authorization and workspace

- Repository: lamontaes/Political-Game-Git.
- Workspace: `/Users/lamontae/Documents/Political-Game-Election-Contest`.
- Branch: `antigravity/election-contest-substrate`.
- Base Commit: `5bc8b131ae22515e27ff4b63b3ecaf64e3bdcfa0`.
- Required ancestor verified: PR #19 commit `0405eb206c6903bc6a31e53b90fc7ec0b9556e37` is an ancestor of `origin/main`.
- Concurrency & Ownership: Touched only generic simulation/persistence files in `src/simulation/**` and `docs/plans/completed/`. Excluded `src/player/**`, `src/presentation/**`, UI, art, CSS, and package dependencies.

## Scope and Architecture

1. **Domain Models**:
   - Added `"election-contest"` and `"election-contest-result"` entity kinds to `EntityKind`.
   - Defined `ElectiveOfficeRef` (`officeKey`, `title`, `seatKey`, `occupationClassification`).
   - Defined `ElectionContestProvenance` (`method: "authored" | "simulated" | "manual"`, `sourceEntityIds`, `note`).
   - Defined `ElectionContestRecord` (`id`, `stableKey`, `sequence`, `jurisdictionId`, `office`, `electionDate`, `candidatePersonIds`, `scheduledAt`, `provenance`).
   - Defined `CandidateTally` (`candidatePersonId`, `votes`, `voteShare`).
   - Defined `ElectionContestResultRecord` (`id`, `stableKey`, `sequence`, `contestId`, `resolvedAt`, `winnerPersonId`, `tallies`, `outcomeEventId`, `provenance`).
   - Defined `ElectionContestStatus` (`"pending" | "resolved" | "cancelled"`).

2. **Domain Operations & Future Due Integration**:
   - `scheduleElectionContest`: Validates candidates, office, jurisdiction, and future date. Appends `ElectionContestRecord` to history and registers a `FutureDueItem` with `transitionKey: "election:contest-resolution"` at the target election date.
   - `resolveElectionContest`: Resolves contest, validates `resolvedAt >= contest.electionDate` and `resolvedAt <= world.currentDate`, enforces both-or-neither manual result inputs (`winnerPersonId` and `tallies`), computes/records deterministic tallies, identifies winner, records a public historical event (`election.contest-resolved`), and appends `ElectionContestResultRecord`.
   - `cancelElectionContest`: Cancels a pending contest and its associated future due item.
   - `electionContestTransitionHandler`: Future due transition handler for automatic resolution on time advancement.
   - `evaluateDeterministicContestOutcome`: Seeded deterministic placeholder resolver producing reproducible tallies based on world seed, contest ID, stable key, and election date.

3. **Query Helpers & Integrity**:
   - Queries: `electionContestById`, `requireElectionContest`, `electionContestResult`, `electionContestStatus`, `isElectionContestPending`, `isElectionContestResolved`, `electionContestsForJurisdiction`, `electionContestsForCandidate`, `pendingElectionContests`, `resolvedElectionContests`.
   - Integrity: `assertElectionContestIntegrity`, `electionContestHistoryRecords`, `electionContestEntityExists`, `electionContestEntityAvailableAt`. Enforces that persisted `result.resolvedAt >= contest.electionDate` (mirroring canonical writer) and validates that `winnerPersonId` has the maximum vote tally regardless of tally array order (supporting tied-max manual results).
   - Integrated with `validateHistoryIntegrity` in `src/simulation/world.ts` and canonical entity checks in `src/simulation/future-transitions.ts`.

4. **Portability and Determinism**:
   - Fully compatible with the synthetic non-Lexington portability fixture (`createPortabilityFixture()`, Synthetic Tidal Basin, Pacific/Honolulu).
   - Preserves 100% byte-for-byte serialization determinism and backward compatibility with all existing world baselines.

## Validation Status

- `npm run typecheck`: Passed with 0 errors.
- `npm run lint`: Passed with 0 warnings / errors.
- `npm run format`: Prettier formatted and verified.
- `npm run test`: All 33 test files passed (547 tests).
- `npm run build`: Production client build completed successfully.
- `npm run demo -- validation-seed`: Deterministic demo passed (`reproducible: true`).
- `npm run validate:art`: Art validation passed.
- `npm run validate`: Full validation passed cleanly.
