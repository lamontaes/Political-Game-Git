---
id: tests-officials-deep-past-nonpartisan-seat
title: "The officials deep-past test fails on a nonpartisan seat that has no party fact"
area: gov
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/officials-deep-past.test.ts fails on main with GOLDEN_PATH_SEED=bf79890b90c40fd1 in Washington, District of Columbia (1150000): official:term:seat:US-DC:state-board-of-education-president:2025-01-20 lacks identity:party. The seat is nonpartisan, so the official has no party to record, and the test requires an identity:party fact for every seated official. Found Oct 24 by the traits lead; the failure is the same with and without the officials-traits change.

**Rules.** One rule, all 56 places: whether an office is partisan comes from its data, never a named place. Estimate, never UNKNOWN: a nonpartisan official's identity says so as a fact rather than leaving it missing.

**Done when.** With that seed the test passes, and either the official carries a fact that records the seat as nonpartisan or the test skips the party fact for seats the data marks nonpartisan, named by file and line.

**Files.** src/core2/officials-deep-past.test.ts, src/core2/modules/officials.ts

**Notes.** TODO
