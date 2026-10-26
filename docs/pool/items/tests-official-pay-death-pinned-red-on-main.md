---
id: tests-official-pay-death-pinned-red-on-main
title: "The pinned official-pay-death case fails on main: a South Carolina sample state senator who died keeps a pay row (Whitefield, New Hampshire, seed 9a11da355dc8b557)"
area: gov
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/official-pay-death
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T05:25:56.612Z
---

**What.** src/core2/official-pay-death.test.ts pins seed 9a11da355dc8b557 (draw official-salary-payroll, Whitefield, New Hampshire, place 3384340) and checks that every official who died within the year has no pay row left. On main 8abee77ef0, Oct 26, it fails: official:seat:US-SC:upper:sample:Republican:2 is dead and its pay row is still there. payMonth in src/core2/modules/official-pay.ts removes a dead official's row only on a payday, so an official who dies after the year's last payday keeps a row until the next one; whether that is what happened here was not checked.

**Rules.** Wire to the world: an official's pay ends with them. Estimate, never UNKNOWN. A test drawn from a seed must pass on main or its failure is a bug.

**Done when.** The pinned case passes on main with its seed and assertion unchanged, and a dead official's pay row ends on the day they die or on the next payday by a rule the test states; the official pay tests pass.

**Files.** src/core2/modules/official-pay.ts, src/core2/official-pay-death.test.ts

**Notes.** Found Oct 26 by the speed lead running the official pay tests for core-speed-official-pay-outside-once; main fails it identically (one run, 91.8 s), so it is not that branch's.
