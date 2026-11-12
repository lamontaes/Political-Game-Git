---
id: tests-door-pledge-weighted-record-by-draw
title: "door-pledge.test.ts finds no weighted counted record a door reached in some draws"
area: elections
kind: bug
priority: 3
size: S
status: merged
standard: 2
claimed-by: claude/pool-tests-door-pledge-weighted-record-by-draw
pr: #8580
blocked-on:
source: added with npm run pool -- add
after:
lead: governing
model: sonnet
effort: medium
root: design-one-model-two-tiers
checked: fable 2026-11-10
claimed-at: 2026-11-11T04:41:58.534Z
merged-at: 2026-11-12T19:25:56.961Z
---

**What.** A confirmer replay of the door-pledge unit on main 7898b3ea2c shows npx vitest run src/core2/door-pledge.test.ts failing "in a town whose counted records each stand for several households, the pledged household votes on its word and the rest as they would have" with "seed 7f00b2b291d4f5b6fbf0f7e48b5ee7f458dfba81256a9a0258ecf560a0256416: no drawn town had a weighted counted record that a door reached and that votes in the race". The same run's pledge-turnout line passed its own check: in place 4972170, 9 of 12 holding a yes voted (0.80) against 9 of 25 others (0.42); three other drawn places had no race two residents could file for. The failure is the test's own search giving up.

**Cause.** Measured: GOLDEN_PATH_SEED=7f00b2b291d4f5b6fbf0f7e48b5ee7f458dfba81256a9a0258ecf560a0256416 npx vitest run src/core2/door-pledge.test.ts fails at the throw near line 682 of src/core2/door-pledge.test.ts ("no drawn town had a weighted counted record that a door reached and that votes in the race"), because the places it draws held no such record where a door reached it.

**Fix.** Let the test keep drawing from all 56 (advancing the world weeks, bounded, until a race is open) or build the weighted-record case through the core's own seams, naming each place passed over, without pinning a seed.

**Time box.** 2 hours.

**Rules.** One rule, all 56 places: a test that needs a case draws until it finds one, from all 56, and names each place and seed; never pin a seed to pass. No dice.

**Done when.** A second session runs src/core2/door-pledge.test.ts with GOLDEN_PATH_SEED=7f00b2b291d4f5b6fbf0f7e48b5ee7f458dfba81256a9a0258ecf560a0256416 and on ten fresh draws and sees every run pass, each naming the drawn place it used for the weighted record and the places it passed over.

**Waits on.** Nothing.

**Files.** src/core2/door-pledge.test.ts

**Notes.** TODO
