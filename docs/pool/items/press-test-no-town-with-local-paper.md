---
id: press-test-no-town-with-local-paper
title: "press.test.ts finds no town with a local paper whose reporter could file"
area: people
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/press-test-local-paper
pr: #4618
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T04:55:52.939Z
---

**What.** The case "is never the reporter who covers their own interview" in `src/core2/press.test.ts` throws "no town with a local paper whose reporter could file" for twelve drawn places, so it fails on main. The test also used `lifePlaceSearch` and `lifePlaceCoverage` without importing them, which is fixed in the president-signs-budget PR; behind that, the draw itself comes up empty. Find out whether the places drawn really have no paper, or the test's test for a filing reporter no longer matches how outlets and reporters are created, and make the test draw a place that has a reporter who can file.

**Rules.** One rule, all 56 places: the place is drawn, never named. Ask why: the reason a place has no paper is read from the press module's outlet records, by record id. Replace, never layer: the old search is replaced, not left beside a second one.

**Done when.** The case passes in a drawn place with the seed named, in `src/core2/press.test.ts`, by a reporter who files a story in a played world (`buildBenchWorld`), and the test fails if the reporter covers their own interview. The owner plays it: reads a local paper's story that is not by the reporter who interviewed him.

**Files.** src/core2/press.test.ts, src/core2/modules/press.ts

**Notes.** Reproduced on main with `npx vitest run --testTimeout=600000 src/core2/press.test.ts`.
