---
id: tests-life-emotion-choice-unexpected-log
title: "Life emotion-choice test expects an empty durable log but clean main keeps one record"
area: core
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/life-emotion-log
pr: #5989
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T06:45:50.482Z
---

**What.** On clean main c8b5e8ce165a53a4ebff032fb2344cc97013197b, src/core2/life.test.ts fails its mood and stress choice case at line 432. It expects core.durableLog.size to be zero after scoring choices but finds one record. The same file passes its other sixteen cases, and PR #5920 reproduces the identical failure, so this is a main defect independent of its weekly contact shortlist.

**Rules.** Preserve the assertion that reading or scoring choices creates no facts. Identify the unexpected record and producer before changing code or assertions; only compare against an initial log snapshot if evidence shows that record already existed before choice scoring.

**Done when.** src/core2/life.test.ts passes its mood and stress case and the rest of the file on clean main, names the unexpected record id and producer, and proves reading or scoring choices creates no facts.

**Files.** src/core2/life.test.ts, src/core2/choice.ts, src/core2/life.ts, src/core2/state.ts

**Notes.** Merger 0 measured 1 failed and 16 passed on both #5920 integrated head 92e2e93c392d281d64065fea82407cb6a0ae6928 and clean main c8b5e8ce165a53a4ebff032fb2344cc97013197b, one file at a time on 2026-10-24. Logs: same assertion life.test.ts:432:36, expected0 received1.
