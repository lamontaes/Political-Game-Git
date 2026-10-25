---
id: world-unfilled-pay-room-double-counts
title: "Raising an unfilled opening's pay subtracts wages and compliance twice, so the raise almost never fires"
area: world
kind: bug
priority: 2
size: S
status: in-pr
claimed-by:
pr: #6025
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** raiseUnfilledPay (src/core2/modules/jobs.ts, the room in a month's days) takes a trading month's sales less payrollMinor, costsMinor and complianceMinor. But the business engine's costsMinor already holds the month's wages and compliance (src/core2/modules/business.ts, the trading month's costs sum), so both are taken out twice. A business that broke even shows a loss of a month's wages, and an opening that has gone unfilled is almost never raised. Found Oct 25 by the traits lead's pay-growth helper.

**Rules.** Wire to the world: the fix moves real pay on real openings, proven in a generated world. Sliding scales: the room stays a smooth share. One rule, all 56 places.

**Done when.** In one year of buildBenchWorld in a place drawn from all 56, seed named, the room raiseUnfilledPay reads equals sales less the month's costs, a test fails when wages are subtracted twice, and at least one long-unfilled opening's pay is raised with its record id.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/business.ts

**Notes.** Filed by the traits lead (claude/traits-pay-growth), which does not touch raiseUnfilledPay.

Sent back 2026-10-25 from PR #6025 (branch claude/traits-unfilled-pay-room): required one-year buildBenchWorld proof is only120days in test:40 and body; retain positive thin-margin raise/reversal checks and finish full-year evidence before completing item; finish on that branch, merge main into it first.
