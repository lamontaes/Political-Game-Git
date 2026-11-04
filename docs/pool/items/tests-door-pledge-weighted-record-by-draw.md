---
id: tests-door-pledge-weighted-record-by-draw
title: "door-pledge.test.ts finds no weighted counted record a door reached in some draws"
area: elections
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Confirmer replay of #7163's unit on main 7898b3ea2c: npx vitest run src/core2/door-pledge.test.ts fails 'in a town whose counted records each stand for several households, the pledged household votes on its word and the rest as they would have' with 'seed 7f00b2b291d4f5b6fbf0f7e48b5ee7f458dfba81256a9a0258ecf560a0256416: no drawn town had a weighted counted record that a door reached and that votes in the race'. The same run's pledge-turnout line passed its own check: in place 4972170, 9 of 12 holding a yes voted (0.80) against 9 of 25 others (0.42); three other drawn places had no race two residents could file for.

**Rules.** A test that needs a case draws until it finds one, from all 56, and names each place and seed; never pin a seed to pass. No dice.

**Done when.** door-pledge.test.ts passes on main with GOLDEN_PATH_SEED=7f00b2b291d4f5b6fbf0f7e48b5ee7f458dfba81256a9a0258ecf560a0256416 and on ten fresh draws, each naming the town it used for the weighted record.

**Files.** src/core2/door-pledge.test.ts

**Notes.** TODO
