---
id: tests-one-sponsor-evening-no-three-seat-body-by-draw
title: "one-sponsor-one-evening-staged.test.ts finds no town body of three held seats in some draws"
area: director
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Confirmer replay of #7165's unit on main d6f72cf7c9: npx vitest run src/director/one-sponsor-one-evening-staged.test.ts fails 'a sponsor's two asks on one evening, written by the engine, play in one stop and reach their roll calls (seed 8a51dac2a079525e)' with 'no town body of three held seats' in As Rabagau, Northern Mariana Islands (territory:MP:as-rabagau), Alpine, Colorado (0801640) and the rest of its draws. On main 7898b3ea2c the same file passed on its own draw.

**Rules.** A test that needs a case draws until it finds one, from all 56, naming each place and seed; never pin a seed to pass.

**Done when.** GOLDEN_PATH_SEED=8a51dac2a079525e npx vitest run src/director/one-sponsor-one-evening-staged.test.ts passes on main, and so do ten fresh draws, each naming the town whose body it used.

**Files.** src/director/one-sponsor-one-evening-staged.test.ts

**Notes.** TODO
