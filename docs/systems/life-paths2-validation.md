# LIFE-PATHS2 validation checkpoint

Base: `1eb0b0d09be40e3e10bedd2a1d9fa301eae47f4b`.
Shared staff/time dependency: `4327921ed7da3ad891fe15630498e86bc69472e2`.
This is a draft implementation checkpoint, not release or human acceptance.

- Agent preflight passed on the isolated `codex/life-paths2` worktree.
- Initial three-case feature suite passed, followed by a negotiated-payment case.
- Seven-case feature suite: six passed; full 24-session college completion timed
  out at its 30-second limit (44 seconds elapsed under shared host load).
- App TypeScript check passed with a private external build-info file.
- Art validation passed; inventory passed with 329 entries unchanged.
- Source validation passed with existing warnings and explicit source gates.
- Independent civic-prose grounding review: PASS after two copy corrections.
- Registration patch passes `git apply --check` against the base checkout.
- One-worker browser proof on isolated port 5193 failed its 30-second budget
  after pointer enrollment and keyboard scheduling. Attendance, interruption,
  reload and recruitment controls were not proved by that run. No timeout was
  relaxed. The screenshot was inspected; no human visual acceptance is claimed.

The final run results are appended below. Browser artifacts are local at
`/private/tmp/life-paths2-evidence`; text logs use `/private/tmp/life-paths2-*`.
The active plan remains open for unpassed proofs and UI-core integration.

## Final finite run

- `source:replay` passed: tracked artifacts regenerate byte-identically.
- `demo -- validation-seed` passed.
- `vite build` and `prepare-sites-build.mjs` passed; existing bundle-size warning.
- The three-file one-worker regression attempt reached D-Lite: 31 of 33 cases
  exceeded ordinary limits under concurrent host load. The runner was stopped;
  the new nine-case feature suite and Stage 5 file have no completed verdict from
  that attempt. A full repository test suite was not run.
- Full lint, node TypeScript, whole-tree formatting and art QA were attempted but
  remained unfinished after approximately 15–18 minutes. Only this task's verified
  processes were stopped. These gates are inconclusive, not passes.
- No test limits were relaxed in response to those final failures. The initial
  long college-case limit is explicitly 30 seconds; ordinary cases retain defaults.
- The last consent/revalidation changes and added progression/contention cases
  still require a green feature-suite run. Campaign treasury behavior requires
  its dedicated integration proof as well as the existing personal-pay proof.
- The browser screenshot was inspected; the semantic proof remains failed.
- UI-core handoff posted on PR #133; implementation draft is PR #141.

The delivery is incomplete. Keep the plan active, PR draft and unmerged. No
monitoring or automatic continuation was created. A clean validation environment,
remaining proofs and UI-core integration are required before acceptance.

A dedicated campaign-account regression was added after the finite broad run. Its
first attempt exposed a missing rival in the test fixture; the fixture now uses
the existing canonical opponent setup. Focused lint passed for the feature and
UI files. The campaign case and final app typecheck are recorded separately.

The corrected campaign-account case passed (1 passed, 9 skipped), and the final
app TypeScript check passed. The account case verifies campaign ownership of the
pay flow, no transfer at acceptance, absent-authority refusal and exact save/load.
The ten-case rerun passed nine, including complete college study, and caught a one-cent floating-point rounding defect in the pay progression calculation. The fix adds the integer-cent 10% increment rather than multiplying by 1.1. The corrected suite is recorded below; broader gates remain unpassed.

## Historical pre-FINISH-WAVE4 verdict

The corrected ten-case feature run passed nine, including pay progression and
campaign account separation; the college case timed out at 32 seconds against its
30-second limit. That college case passed in the preceding run. This is not an
all-green suite at the final implementation.

The final browser retry passed the actions/assertions through study attendance,
keyboard interruption, persisted reload and return. It exhausted its unchanged
30-second test budget before recruitment selection. Recruitment UI activation is
still unproved. Artifacts: `/private/tmp/life-paths2-evidence-final`.

All own test/browser processes ended; the browser slot was released to JUD.
Focused formatting passed before the final documentation append. No full lint,
node-typecheck, art-QA or full-repository-test success is claimed. The implementation
and added regression coverage are committed, but delivery acceptance is incomplete.

## FINISH-WAVE4 current checkpoint

The earlier timeouts above are historical. On LIFE donor 74dbc76, all 15 LIFE
cases pass, including full college/associate/trade completion, materially
different work, refusal, interruption/return, scheduled pay, willingness,
contention, employee resignation and save/reload. Full test run: 3,220 passed,
two skipped, six failed. One stale corpus count pin was corrected from actual
scanner output; the other five were localhost binding denied by the sandbox.
Both affected files reran with binding permitted: 45/45 passed. No time limits
were relaxed. Exact measured corpus pins remain: 52,400 literals, 1,914
inventoried sentences and 346 source files.

Format, lint, both TypeScript projects, source validation/replay, production
build/preparation, deterministic demo, art validation, inventory and QA passed.
The feature-local browser proof passes in 2.5 seconds after locating Person by
its actual combobox role/name. Pointer and keyboard actions covered attendance,
interruption, reload, return, recruitment, delegation completion and departure.
Logs: `/private/tmp/life-exec4-life-browser-retry.log` and
`/private/tmp/life-exec4-life-final`, with remaining gates in
`/private/tmp/life-exec4-life-remaining`.

This is feature-level evidence. Normal UI entry/Work integration and human visual
acceptance remain open. Existing draft PR #141 stays unmerged.
