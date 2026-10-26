---
id: core-standins-tuning-dials
title: "Tag the tuning-dial parameters TUNABLE with a spread (from the #4151 audit rows)"
area: core
kind: stopgap
priority: 2
size: M
status: done
claimed-by: claude/core-standins-tuning-dials
pr: #4602
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T04:31:42.598Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Finding (Oct 16, the claiming session, not built): main has 33 open registry rows of kind `uncalibrated-tunable` (and about 49 rows named for the SG-P8, SG-P10, SG-P13 and SG-P15 dials). The #4151 audit closed them by tagging each dial TUNABLE with a spread and a `checkedAgainst` line, but AGENTS.md defines TUNABLE as a value with "the spread it's checked against". Relabeling a dial whose check was never run would write a claim nobody verified, so this item should be done dial by dial: run the check named for the dial (a generated-world measurement against its real-rate target), record the result in `checkedAgainst`, and only then close its row. Start with the dials a test already measures (the corruption weights against the offering and taking rates in corruption.test.ts; the party weights against party unity in party-loyalty.test.ts).
