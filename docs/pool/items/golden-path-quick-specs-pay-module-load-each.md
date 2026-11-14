---
id: golden-path-quick-specs-pay-module-load-each
title: "Golden path quick specs each pay 25 to 38 seconds of module load for tests that take seconds"
area: gov
lead: governing
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: account lead thread, Nov 14, found while splitting M2-06
claimed-at:
standard: 2
model: opus
effort: medium
root: none
---

**What.** The golden-path quick job runs each spec as its own vitest process, and each process loads and transforms the core modules again. That load, not the tests, is most of what the quick job's 450-second budget goes on, so the 14 specs through M3-09 already take about 480 seconds with M2-06 fixed. Seen: the golden-path table in CI and the run times of the specs below.

**Cause.** Measured: with `npx vitest run src/core2/candidacy.test.ts src/core2/news.test.ts src/core2/corruption.test.ts` against the same three files run one at a time with `node node_modules/vitest/vitest.mjs run --config src/core2/tooling/vitest.config.ts <file>`, on the train head M2-09 (news) took 46.4 s of which import and transform 38.6 s and tests 7.7 s; M3-09 (corruption) 32.0 s of which import 30.3 s and tests 1.5 s; M2-04 (candidacy) 26.2 s of which import 25.3 s and tests 0.7 s. Run in one vitest process, those three files took 33 s in all (transform 32.7 s, import 65.4 s summed over files, tests 10.3 s), against about 105 s as three separate runs, so the load is paid once per process and is shared when files run together. M2-07 is different: 22 of its 35 s is its own weeks loop.

**Fix.** Run the quick specs whose tests are short (M2-04, M2-09, M3-09 and the other one-line `npx vitest run <file>` specs) as one vitest run of several files, or share the transform cache between specs, keeping each spec's own row, result and limit in the golden-path table. Measure the saving on the same machine before and after; no spec's limit is loosened and none is skipped.

**Time box.** 2 hours for one opus session.

**Rules.** Speed: a spec's own limit is not loosened to get green; no test is skipped.

**Done when.** In a drawn place run of the golden path on the train head, the quick job's total is measured before and after grouping, the saving in seconds is written in the PR body, and the quick job finishes under its 450-second budget with every spec reached; a second session sees the golden-path table pass.

**Waits on.** Nothing.

**Files.** tests/golden-path/runner.mjs, docs/roadmap/features.json, scripts/core2-guard/policies.json

**Notes.** Found while fixing golden-path-m2-06-campaigns-timeout-at-ci. The coordinator asked for this as its own item and said no spec is moved and the budget is not raised in that PR. Filed by hand.
