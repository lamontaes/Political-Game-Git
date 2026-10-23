---
id: words-install-partnerships-module
title: "Add the partnerships module to the played world's people list (one line in src/director/play-modules.ts)"
area: words
kind: wiring
priority: 1
size: S
status: blocked
claimed-by:
pr:
blocked-on: people-partnership-forms
source: added with npm run pool -- add
---

**What.** Add the partnerships module to the played world's people list: in `src/director/play-modules.ts`, import `partnershipsModule` from `../core2/modules/partnerships` and add it to the list `peopleModules()` returns, after `movesModule` and before `beliefsModule`. The module (a young adult leaves a parent's home, two single adults who know each other partner, a strained couple separates) is built and tested on the People stack (PRs 4959, 4961, 4963 and 4970) but the merger's rule is that only the Words session edits `src/director/`, so the stack does not install it and its tests install it themselves. Until the line lands, a played world does not run the module.

**Rules.** Edit only that file, two lines. Nothing else in the module list changes. No hand-written player text. The tests that install the module themselves keep passing once it is installed, since they register it only when it is absent.

**Done when.** `buildBenchWorld` (a drawn place from all 56, the seed named in the PR body) opens a world whose module list includes `core2-partnerships-v1`, and in a year of that world `leftHomeOf` shows at least one young adult who left a parent's home in one of the first eight drawn places, shown by the `people.left-home` event record id. `src/core2/home-leaving.test.ts` passes unchanged.

**Files.** src/director/play-modules.ts

**Notes.** Filed Oct 17 (claude/leave-parents-home). Take it after the stack's first PR (4959) is merged, since the module file arrives with it.
