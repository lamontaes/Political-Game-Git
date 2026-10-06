# Session 35 progress

Updated: 2026-10-06

## Current work

### b12-p1 — delay rules as data

- Branch: `session35/b12-part1`, based on main `e591ffc63`.
- Complete per-chamber rows are attached to compiled/generated state packs, Congress, sourced municipalities, and local game-profile councils.
- Chamber quorum is reused; a cloture threshold is read from the chamber's existing cloture stage. Shared motion, suspension, and attendance defaults are explicitly marked as comparable-chamber estimates.
- Focused tests pass 5/5, including a fresh Seattle-area game. Test import scan, changed-file lint and `git diff --check` pass.
- Full typecheck passes when temporarily supplying `personalLifeDepiction: "full"` to two unrelated existing fixtures in `src/simulation/press/press-premise.test.ts`. Those temporary edits were reverted. Without them, the current main baseline fails at those two fixture lines.
- Remaining p1 work: add the required chamber/state source survey rows and replace estimates wherever sources have been read. This draft does not claim the per-state research table is complete.

### b12-p2 — recorded procedural motions / sine die

- Branch: `session35/b12-part2`, pushed at `ab768b6d0`; draft PR #2346.
- The carried motion uses the existing chamber-vote evaluator and retains its actual roll-call vote ID.
- Session 53's exact producer is now published on PR #2459 at `5d05d67e415d16a20deb5670bf6122d4ae108b60`: `recordLegislativeSessionCompletion` from `governing/legislative-session-completion.ts`. Inputs: jurisdiction ID/key, chamber keys, session ID, date, cause (`legal-limit`, `sine-die-vote`, or `scope-disposed`), and `estimate` only for `legal-limit`. It requires `date === world.currentDate`; stable event key is `event:legislative-session-completion/v1:<sessionId>`.
- Next p2 action: rebase the draft on the published producer, call it only after the actual chamber vote carries, then verify save/continue and pending-measure carryover/dying behavior. No appropriation gate; do not touch Session 53/56 clock hunks.

## Next resume order

Keep both numbered-part drafts separate. Continue p2 integration and actual vote/carryover proof; then continue p1 source research and proof. Rebase whichever PR merges second.
