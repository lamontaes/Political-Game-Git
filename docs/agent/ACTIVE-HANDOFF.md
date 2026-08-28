# Active Handoff

## Current state — 2026-08-28

- Repository: `lamontaes/Political-Game-Git`.
- PR #16 generated-person foundation and PR #18 jurisdiction portability are
  merged. The previous PR #16 open/unmerged status and "Remaining Defects: None"
  statement were stale; the four reproduced DOB/name/route defects required this
  follow-up.
- Verified starting `origin/main`: `e8a84a315a4385268f87251cb38efbb85919f5e9`.
- PR #18 accepted head `9b429567de99377d9d310c7fa643a4f07e8ac128` is an ancestor.
- Writer: Codex, isolated worktree
  `/Users/lamontae/Documents/Political-Game-Generated-Person-Correctness`.
- Branch: `codex/generated-person-correctness-followup`.
- Follow-up PR: [#19](https://github.com/lamontaes/Political-Game-Git/pull/19),
  OPEN / UNMERGED against main.
- Scope: valid DOB construction, selected-age agreement, canonical role prose,
  and explicit-override routing. No Stage 6 calendar change, art work, PR #13
  convergence, or Slice E.

## Verification and next action

The [repair plan and proof](../plans/completed/generated-person-correctness-followup.md)
records regression, validation, stress, portability, baseline, browser, and
scope evidence: 527 unit tests, 78,000 DOB cases plus exact replay, both 100x100
stress runs, and successful 36-test browser completion (35 passed plus the
unmodified Run C geometry assertion passing on retry). The six player-seed
browser tests passed without retries. Final-head CI is reported separately in
the PR verification comment; do not infer human visual acceptance from tests.

Next authorized action: verify final-head CI, then review PR #19 without
merging. No other implementation scope is authorized by this handoff. Existing
saves are not migrated; local Run C geometry-test flakiness and the pre-existing
image-size development dependency advisory remain documented limits.

## LEARN

Boundary tests must compare the generator's selected age with canonical age,
not merely check an age range or test the date helper in isolation. Route tests
must distinguish absence of an override from a seed value equal to the default.
Generated-person browser proof must traverse authored role-dependent text, not
stop at the scene nameplate. These lessons are encoded in the existing person,
Run B/C/D-Lite, and player-seed replay test suites, without adding process gates
or a second identity model.
