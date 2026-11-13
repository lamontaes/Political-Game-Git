---
id: tests-country-town-part-closing-barely-moves-state-jobs
title: "Closing a town's largest employer moves its state's jobs by almost nothing a month later (country-town-part twin test)"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: nation
model: opus
effort: medium
root: none
source: Red desk, Nov 13 (seen while proving PR #8996)
---

**What.** src/core2/country-town-part.test.ts, "counts the town inside its state once, and its state's jobs follow the town's", fails on clean main 8ce733c3 at GOLDEN_PATH_SEED=1a2b3c4d5e6f7081 in Franklin, Georgia (1331292): the twin world whose largest employer (57 jobs) closed has its state's jobs only 2 lower a month later, where the test expects more than half the employer's jobs. At GOLDEN_PATH_SEED=9f8e7d6c5b4a3920 in Wilton, Minnesota (2770708) a 6-job employer's closing moves the state by 0. It fails the same with PR #8996 (2 and 5e-10). Seen: a closing in the town shows in its state's jobs on dev mode's trace of the state.

**Cause.** Measured: `GOLDEN_PATH_SEED=1a2b3c4d5e6f7081 npx vitest run src/core2/country-town-part.test.ts -t "counts the town inside"` on clean main 8ce733c3 and on PR #8996's branch. Not found: whether the closed employer's workers are rehired within the month (the test allows some), whether `townPartCounts` in src/core2/modules/macro.ts counts the closed employer's jobs by its sector after the closing, or whether `closeBusinessByChoice` ends the jobs only at a later step. Read the part row (`countryParts`, `country-part:US-GA`) in both twins on the closing day and a month later first.

**Fix.** Needs cause.

**Time box.** 2 hours

**Rules.** Wire to the world: a closing in the played town is jobs gone from its state, read from the town's own records. One rule, all 56 places: the twin test draws its place and names it.

**Done when.** A second session runs country-town-part.test.ts on main at GOLDEN_PATH_SEED=1a2b3c4d5e6f7081 and at a fresh seed, each naming its drawn place, and the closed twin's state has fewer jobs by between half and one and a half times the employer's.

**Waits on.** Nothing.

**Files.** src/core2/country-town-part.test.ts, src/core2/modules/macro.ts, src/core2/country-model.ts
