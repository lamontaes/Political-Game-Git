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
