# PR79 post-M3 finalization

Authority: user request to finalize the existing PR79 branch without merging.

Preflight: isolated `/private/tmp/pg-pr79-finalize`; same branch
`claude/legislative-bargaining-dialogue-realism`; clean local/upstream
`931d186162441fbed3669eac605b596d7cde90e4`. The older integration worktree
is read-only during takeover. Live main is
`25b7e7a291e22374566c30d31552dcc4d8314d51`, already ordinarily merged by
`931d186`; another ordinary merge correctly reports already up to date.

1. Preserve canonical M3 judicial guard byte-for-byte.
2. Restore ownership helper from main after checking its frozen 120-file range:
   no added PR79 exception or widened allowed path matches; violations and
   strays are empty. Other consumers reuse only unchanged history helpers.
3. Preserve D-081/D-082, with no collision in main (ends at D-077), and all
   runtime code. Run focused, full, art and browser verification.
4. Verify remote heads, push same branch, and await exact-head CI/browser proof.

The PR85 player route remains banked: build from canonical player World,
governing seat/chamber, measure and people; fail closed without content; prove
residence/governing jurisdiction and no fixture leakage. This task adds no route
seam and grants no new ownership. Independent and human visual acceptance remain
separate from automated validation.

## Verification record

- Focused regressions: 204 tests passed across 15 files, covering bargaining,
  commitment standing/later votes, ordinary conversation, legislation,
  persistence and all five ownership suites.
- Floor route: all four pointer/replay scenarios and keyboard integration passed
  (5/5), served exclusively from this worktree on port 4279.
- Source validation: 13 domains passed. Source replay regenerated every tracked
  artifact byte-identically.
- Art validation, inventory (322 items) and QA passed; no tracked art changed.
- Two validation-seed demos matched byte-for-byte, SHA-256
  `23577a0dbaf87b9f126d63017b5f75ab8e6db24854aa9711fe5a010bf7aa6cfd`.
- Full local `npm run validate` passed format, lint and typecheck, then hit
  existing five-second test timeouts under shared-host load above 300. The disk
  subsequently filled, test modules failed to load, and a separate build failed
  with explicit `No space left on device`. The degraded test run was stopped;
  only this worktree's incomplete build output and installed dependencies were
  removed. This is not a local full-validation pass. No assertion or timeout was
  modified. Exact-head CI must pass full validation and the full browser suite
  before readiness is reported.
- Both ownership files now match canonical main byte-for-byte; runtime and
  D-081/D-082 are unchanged. `git diff --check` passed.

## LEARN

An exception in a frozen-range ownership helper can be executable dead code
while still making a misleading ownership claim. Check actual path matches and
all consumers, then restore canonical authority rather than preserving inert
branch declarations. Record environmental failures separately from correctness
proofs; never relabel a resource-failed local run as green.

## Main advanced during exact-head proof

Head `a4067b431b4fdf55002cb3026d6bf8ead34ab4a7` passed CI run
`34083142957`: full validation (2,555 tests, 146 files) and all 254 browser
proofs. The final fetch found accepted PR111 on main at
`87b9206e2c7e8721792c136afa1d7911bc100db1`. Its ordinary merge was clean.
Both ownership files and D-081/D-082 remain unchanged. Obtain fresh exact-head
proof for this merged tree rather than presenting the older green head as
current-main evidence. The PR85 seam remains banked.
