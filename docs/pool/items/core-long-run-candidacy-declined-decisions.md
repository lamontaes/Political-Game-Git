---
id: core-long-run-candidacy-declined-decisions
title: "Every townsperson's decision not to run is kept forever (Montpelier, Vermont: 28,733 of 30,181 decision rows at year 4)"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The candidacy engine keeps one decisions row per person and contest, with every reason and score, and never removes one. At Montpelier, Vermont (5046000, world seed mont1, fast-forward), year 4, 28,733 of its 30,181 rows were decisions not to run in races already decided, 27 MB as JSON. Every reader asks about a race still being run or about those who ran: demotion keeps a runner full until their race, the candidate pool reads past runners from the weighed rows, and the dev path check reads the holder's own decision to run.

**Rules.** Keep results, not their history (owner, Oct 7, Nov 5, Nov 8): a decision not to run leaves the table candidacyDecisionRetentionDays after its race's election day, and every decision to run stays. Bookkeeping is a debug switch (Oct 11): tests and proofs keep every decision.

**Done when.** In play a declined decision in a race decided more than candidacyDecisionRetentionDays ago is gone after the next first of the month, and a decision to run in the same race stays; with bookkeeping on both stay; a test shows both; speed:year --seed mont1 --place 5046000 --years 2 records proof against the same main differs only in candidacy.decisions.

**Files.** src/core2/modules/candidacy.ts, src/core2/data/parameters.json, src/core2/candidacy-decision-retention.test.ts

**Notes.** TODO
