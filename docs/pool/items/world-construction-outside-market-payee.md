---
id: world-construction-outside-market-payee
title: "A builder's materials and an unassigned property tax are paid to a public employer instead of the place's outside market"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: found while tracing tests-budgets-public-pay-intermittent, Oct 24
---

**What.** Housing construction pays half of a builder's own house to the outside of the town each month, and the property tax engine pays a tax with no payee of its own to the outside too. Both pick the first organization in the place that carries an outside flow, and a government's opening employer carries one as its zero-stock paying authority. In Marlborough, New Hampshire (seed 109a7b3b1d5c1715d738e7b8ca9deec614910239) the state offices received a roofer's monthly materials payment of 1,518,438 cents (journal:2025-02-06:9016) instead of the outside market, which hid that employer's payday overdrafts.

**Rules.** Wire to the world: money for goods bought outside the town reaches the place's outside market account, the one buyers and sellers outside the town use, never a public employer. One rule, all 56 places: both engines read the shared outside-market lookup (townOutsideOf), never the first match.

**Done when.** In a played stretch of buildBenchWorld in Marlborough, New Hampshire (seed above), every construction and property-tax payment to an outside account goes to the place's outside market, named by journal entry id in a test, and the test fails with main's lookup.

**Files.** src/core2/housing-construction.ts, src/core2/housing-property-tax.ts

**Notes.** Found Oct 24, 2026 on claude/budgets-pay-intermittent. Other engines (housing.ts, place-prices.ts, campaigns.ts, business.ts) already use townOutsideOf.

Sent back 2026-10-24 UTC from PR #5982 (branch claude/construction-outside-market): new test defaults only to pinned Marlborough seed with no fresh drawn-place case beside it; retain pinned repro and add bounded positive fresh case asserting this place outside-market payee, by journal IDs; finish on that branch, merge main into it first.
