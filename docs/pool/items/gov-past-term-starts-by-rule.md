---
id: gov-past-term-starts-by-rule
title: "A governor's past terms start on the state's own clause day, not the current term's date moved back whole years"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/past-term-starts-by-rule
pr: #5164
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:40:21.176Z
---

**What.** The terms a governor served before the opening get their start and end dates by moving the current term's date back whole years. In Florida the 2023 term shows a start of January 5, where the state's clause (first Tuesday after the first Monday in January) gave January 3, and Alaska's 2022 term shows December 7 where the first Monday was December 5. The past terms should be computed from the same term-starts rule the current term uses, for the year each one began.

**Rules.** "An effect is a read, not a record": the past term dates are read by the officials' history and the term-limit count, so they must come from the rule. "One rule, all 56 places": the day comes from the state's row in data/elections/term-starts.json, never from a name in the code.

**Done when.** In a played world from buildBenchWorld in a drawn place with a read start clause, every past governor term record starts on the day the rule gives for its year, checked in src/core2/elections-law.test.ts against the term record ids.

**Files.** src/core2/modules/offices.ts, src/core2/elections-calendar.ts

**Notes.** Found while proving gov-standins-elections: Florida term:seat:US-FL:governor:2025-01-20 starts 2023-01-05, Alaska past:1 starts 2018-12-07.
