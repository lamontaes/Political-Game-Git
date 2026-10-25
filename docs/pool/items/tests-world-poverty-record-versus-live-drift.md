---
id: tests-world-poverty-record-versus-live-drift
title: "world-poverty.test compares the last monthly poverty record with live poverty ten days later, so jobs lost in between turn it red (Chamizal, New Mexico)"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/poverty-record-date
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T21:01:54.133Z
---

**What.** With WEB_POVERTY_SEED=cbf93743a0a0ec90 the test draws Chamizal, New Mexico and plays 100 days. The latest world-metrics poverty record is from April 2, 2025 (share 0.044, 2 of 45 people), but the test compares it with povertyByPlace on day 100, after full households lost their jobs between April 10 and 20 (10 of 46 people, share 0.217). It fails the same way on clean main; it is red by draw, not by a change.

**Rules.** Never weaken the check: the engine's record must still equal live poverty on the day it was recorded. Ask why: read the record's own date, not a later day.

**Done when.** src/core2/world-poverty.test.ts compares the monthly record with povertyByPlace on the record's own date (or the record taken the day the test reads it), passes on WEB_POVERTY_SEED=cbf93743a0a0ec90 and on two fresh draws named in the PR, and still fails when the record is not the engine's poverty share.

**Files.** src/core2/world-poverty.test.ts

**Notes.** TODO
