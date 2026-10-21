---
id: core-speed-guarded-record-play
title: "Payday calendar records are copied for the read guard only when bookkeeping is on"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/speed-guarded-record
pr: #5392
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:44:23.421Z
---

**What.** A profile of a played year in Discovery Harbor, Hawaii (seed m7a) shows guardedRecord in work-pay-period.ts at 0.6 seconds of self time, 1.2 percent of the year. It copies every payday calendar, basis, shift and request record into a fresh null-prototype object on every read, which only the bookkeeping read guard needs. Read tracing runs in tests and the bench, not in play.

**Rules.** Bookkeeping is a debug switch (AGENTS.md): read tracing, validation and copying run in tests and the bench, not in play; Speed: no change may make a year more than 20 percent slower.

**Done when.** A fresh profile of npm run speed:year on seed m7a shows guardedRecord under 0.2 percent of the year in play, and the work-pay-period tests pass with bookkeeping on, shown in the PR body.

**Files.** src/core2/work-pay-period.ts

**Notes.** TODO
