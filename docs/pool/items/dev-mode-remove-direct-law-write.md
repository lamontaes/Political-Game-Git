---
id: dev-mode-remove-direct-law-write
title: "Remove the dev routes nothing in the game calls: set a law directly, the experiments and the saved experiments file"
area: play
kind: cleanup
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** With the /dev page deleted, dev mode's server still serves a direct set-a-law write (setLaw through enactLaw, no bill, vote or signature), the built-in and saved experiments and the saved-experiments file, and dev-mode.test.ts tests them. The Bills panel and Run until do the same through the game's own code, so these are leftovers. Delete the routes, the methods, the saved-experiments storage and the tests that only cover them, and keep any test that proves a law's effect by another route.

**Rules.** Replace, never layer: the direct write and the experiments are deleted in the change that removes their tests, and the PR counts what was removed.

**Done when.** A search of src finds no setLaw, no experiment route and no dev-experiments file, dev-mode.test.ts passes in a drawn place on a named seed, and the Bills panel still passes a law through a bill in dev-bills.test.ts.

**Files.** src/bench/dev-mode.ts, src/bench/dev-api.ts, src/bench/dev-mode.test.ts, src/bench/data/dev-experiments.json

**Notes.** TODO
