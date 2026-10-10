# Proposed golden-path and performance checks

The proposed checks protect golden-path steps that the finisher has accepted and
detect slower core changes. This commit records the contract for CTO approval.
No runner, workflow, performance measurement, or deliberate-failure proof has
been implemented yet.

## M0-10: golden-path regressions

After approval, build one runner in `tests/golden-path/` that reads the approved
feature list without changing its tests, commands, or passing flags. The CTO owns
command registration; the finisher owns acceptance.

- Derive a reproducible seed from the tested commit and spec ID. Draw a state or
  territory from the full 56-place corpus, then a locality from its records.
  Record the commit, seed, place, command, exit status, and duration.
- Run accepted specs first. A failing or timed-out accepted test makes the check
  red. An accepted spec with no command also makes it red.
- Report unaccepted specs as goals, including missing commands and tests not
  reached before the deadline. A passing goal does not change its acceptance.
- Propose an overall five-minute PR budget and thirty-minute nightly budget.
  Kill timed-out command trees. Never replace an approved test with a shorter,
  weaker assertion to fit a budget.
- Wire short PR and longer nightly checks into GitHub Actions. Keep artifacts
  small: a result table and reproduction instructions, without world snapshots.

Proof: use the registered step-2 command in a reproducibly drawn place. Apply a
temporary broken variant, confirm that an accepted step turns the check red,
restore it, and repeat successfully. Detector fixtures also cover goal failures,
missing commands, deadlines, and reproducible selection. Fixtures do not prove
that the game's meeting behavior works.

## M0-11: speed and memory

After approval, build the guard in `scripts/core2-guard/`, outside game modules.
For core changes, compare the actual base and head on the same cloud runner with
one process at a time. Use the core's public generators and clock for a matched
seeded month; add no second engine or game behavior.

- Measure one warmup and three independent measured runs per revision. Compare
  median simulation milliseconds per game day. Initialization is reported
  separately. A relative year estimate comes from the identical month window;
  it is not evidence that a complete year meets the two-minute target.
- Require matching seed, place, horizon, opening-input hash, and measurement
  settings. Invalid or incomparable receipts fail explicitly.
- Fail when head exceeds 120% of base. Report process peak RSS and enforce the
  existing opening-input byte and Source-share budgets from the core, rather
  than inventing a new memory ceiling.
- Reuse the existing CPU-profile summarizer to name the slowest functions and
  their source locations. Profiled runs stay outside the timing comparison.
- Propose a forty-five-minute performance-job deadline. Reuse the same
  registered checkout for sequential revision measurements; no repository
  copies. Store compact summaries, not copied worlds or heap dumps.

Proof: introduce a temporary computational slowdown in the measured step,
confirm that it exceeds the allowed ratio and exits red, restore it, and show
the ordinary result. A fabricated timing receipt cannot count as this proof.
Also check the opening-input guard with a deliberately oversized fixture.

## Dependencies and ownership

Main currently has no `src/core2`, bench command, or registered feature test
commands. The core is on `pool/P8-part-1`. Its existing measurement command runs
an opening, a year, or the pre-run; the historical drives-proof command used by
the profile scripts is absent from that core branch.

Before the game-level failure proofs, the CTO must register the step-2 command
and provide a core revision to test. A guard wrapper can use the public core
APIs for the month without editing `src/core2`, `src/director`, or `src/rules`.
Missing benchmark dependencies remain explicit failures, never green results.

The proposed budgets are engineering policies pending CTO approval. When built,
numeric policies belong in a tagged parameter table. Both specs remain
unaccepted until the separate Sonnet finisher verifies the package.
