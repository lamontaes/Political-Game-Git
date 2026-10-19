---
id: release-voucher-budgets-module-state
title: "Unit test red on main: payVouchers reads the budgets module in a world that does not install it"
area: laws
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/release-voucher-budgets-module-state
pr: #4628
blocked-on:
source: merger run Oct 16 after #4449
claimed-at: 2026-10-16T07:29:02.307Z
---

**What.** After the school-voucher law merged (#4449), src/core2/world-legislating.test.ts fails three of its six cases. The error is "Module has no registered state". The stack is openLawReach, runHandlers, runPolicy (law-reach/group-b.ts:474), payVouchers (law-reach/group-b-money.ts:531), then governments() in modules/budgets.ts:1358, which reads the budgets module state in a world that does not install the budgets module. Fix it at the root so the voucher payer works, or is skipped, when no budgets module is installed, without loosening the test.

**Rules.** Follow the standing rule "Wire to the world": the voucher payment must still reach the treasury and the household in a played world with every module installed. Also "Replace, never layer": no second voucher path, and no skipped or loosened test.

**Done when.** Running the world-legislating test file passes all six cases in a drawn place with a seed the builder did not choose, the school-voucher law test still passes in a played world, and the fix names the record id of one voucher payment that reached a household.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/law-reach/group-b.ts, src/core2/modules/budgets.ts, src/core2/world-legislating.test.ts

**Notes.** Found by the merger after merging #4449 (laws-family-school-vouchers); main's pre-merge baseline for this file was five failures, #4519 cut it to three. Merger oversight: the merger ran only the PR's own changed tests.
