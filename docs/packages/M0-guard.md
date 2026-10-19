# M0-guard: the golden-path test suite and the speed and memory guard

**Contract:** M0-10 and M0-11 in `docs/roadmap/features.json`.

**Builder:** a new Codex session, CODEX-GUARD (GPT-6.1 Sol), at **medium**: it's test and CI tooling over existing commands, specified exactly here.
**Finisher:** a new Claude session, **Sonnet at high**: checking that a guard really catches failures takes care, but it's an agreed design.

## Build

1. **Branch:** `pool/M0-guard`, from `main`, with the core's test tooling read from `pool/P8-part-1` as needed. Put the suite in `tests/golden-path/` and the guard in `scripts/core2-guard/`.
2. **The golden-path suite (M0-10):** one runner reads `docs/roadmap/features.json`. For each spec with a test command, it runs the test in a place drawn from all 56 by a seed derived from the commit, so places vary across runs but any failure can be reproduced from its seed. A spec marked passing that now fails turns the check red (a regression). Specs still failing are reported as goals and don't block. Add it to GitHub's checks with a time budget, using a short run for pull requests and a longer one nightly.
3. **The speed and memory guard (M0-11):** for every change to `src/core2`, run the same seeded month on the change's base and on its head, one process at a time on the same runner, and report time per game day, peak memory and the slowest steps (reuse the profiling scripts in `docs/reports/2026-10-10-core2-slowdown-profile-tools/`). Fail the check if a year would be more than 20% slower than its base. Use the opening-input size budget the core already has.
4. **Prove they work:** a deliberately broken step-2 change must turn the suite red, and a deliberately slowed change must fail the guard. Show both in the PR body, then remove the deliberate breaks.

## Out of scope

Game behavior. Don't change `src/core2`, `src/director` or `src/rules`; if a test needs a hook the core lacks, request it in the PR body.

## Hand-off

Short PR body: how to read a red check, the time budget, and the two deliberate-failure proofs.
