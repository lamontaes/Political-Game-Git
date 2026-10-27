---
id: world-central-bank-nominee-records
title: "Central bank nominees are chosen by their recorded views and career, not lived inflation and a career table"
area: world
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/board-appointer.ts places a central bank candidate on the left-right scale by how much inflation they lived through, and scores qualification from a small table by career label. Give each seeded candidate a recorded stance and a short career history (filled in like any named person), read the stance for the president's alignment and the history for qualification, with the table's values calibrated to past governors' careers. Closes SG-WORLD-board-hawk-side and SG-WORLD-board-career-qualification.

**Rules.** No dice: the pick reads the candidate's records and the president's traits. Research before building: the qualification weights cite past Federal Reserve governors' careers.

**Done when.** In a one-year run of the played world (buildBenchWorld, drawn place and seed named) with a board vacancy, the nominee's record cites stance and career reasons by id, and src/core2/board-appointer.test.ts checks a nominee with a longer central-bank career outranks one without at equal stance.

**Files.** src/core2/board-appointer.ts, src/core2/board-appointer.test.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): made from the open stopgap rows SG-WORLD-board-hawk-side and SG-WORLD-board-career-qualification.
