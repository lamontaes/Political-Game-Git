---
id: traits-accept-interview-reasons
title: "A candidate accepts a press interview by how much they need the coverage, not almost always"
area: people
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/traits-accept-interview
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T23:27:56.806Z
---

**What.** press.accept-interview's case is closeness to the reporter less any grudge less interviewShyness (-1), so it is at least 1 for every candidate with no grudge: all 120 asks were accepted in Halfway, Missouri and all 70 in Marblehead, Ohio (gap row 'circumstances saturate the choice'). Real candidates answer about half of such requests: the League of Women Voters' VOTE411 2024 report gives a national median candidate response rate of 51%, and incumbents respond less than challengers. Weigh what the interview brings the candidate: the coverage they still need (less the more of the town already knows them, so an incumbent needs it least), their standing with the reporter and any grudge, with temperament at the study's size.

**Rules.** No dice: the case and the lean decide, through the shared rule. Real rates check totals only. Ask why: each interview record keeps the reasons it was weighed on, so a test can trace every answer.

**Done when.** In the named candidates of drawn race towns' played windows (src/core2/trait-test-kit.ts drawnRaceWorld), seeds named, the share who accept is within 0.4 to 0.62 and the crossed net odds between thirds of lean are within a factor of 1.5 of the study's 2.47; the base and known-share weights carry their sources and spreads; a test checks every answer against its kept reasons; and the press.accept-interview gap row is removed.

**Files.** src/core2/modules/press.ts, src/core2/data/press/parameters.json, src/core2/modules/press.traits.test.ts

**Notes.** TODO
