---
id: world-central-bank-nominee-records
title: "Central bank nominees are chosen by their recorded views and career, not lived inflation and a career table"
area: world
kind: stopgap
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: laws-effects
model: opus
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** src/core2/board-appointer.ts places a central bank candidate on the left-right scale by how much inflation they lived through, and scores qualification from a small table by career label. Give each seeded candidate a recorded stance and a short career history (filled in like any named person), read the stance for the president's alignment and the history for qualification, with the table's values calibrated to past governors' careers. This closes the stopgaps SG-WORLD-board-hawk-side and SG-WORLD-board-career-qualification.

**Cause.** Found in code: src/core2/board-appointer.ts marks both stopgaps (SG-WORLD-board-hawk-side at line 52 and SG-WORLD-board-career-qualification at line 87); the rows are in src/core2/data/stopgaps/world.json.

**Fix.** Give each seeded nominee a recorded stance and a short career history; read the stance for the president's alignment and the history for qualification, with weights calibrated to past governors' careers; close both stopgap rows in src/core2/data/stopgaps/world.json.

**Time box.** 6 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the pick reads the candidate's records and the president's traits. Research before building: the qualification weights cite past Federal Reserve governors' careers. Every number lives in a parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, drawn place and seed named) with a board vacancy and sees the nominee's record cite stance and career reasons by id; src/core2/board-appointer.test.ts checks that a nominee with a longer central-bank career outranks one without at equal stance; both stopgap rows are closed.

**Waits on.** Nothing.

**Files.** src/core2/board-appointer.ts, src/core2/board-appointer.test.ts, src/core2/data/stopgaps/world.json

**Notes.** Oct 20 (pool feeder): made from the open stopgap rows SG-WORLD-board-hawk-side and SG-WORLD-board-career-qualification.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have given each central-bank nominee a recorded stance and career instead of two estimated numbers; no screen shows a nominee's career, and the estimates stay labeled.
