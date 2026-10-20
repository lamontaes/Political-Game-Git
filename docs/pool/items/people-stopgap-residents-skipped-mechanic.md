---
id: people-stopgap-residents-skipped-mechanic
title: "Stopgaps in residents (skipped-mechanic): 1 open"
area: people
kind: stopgap
priority: 3
status: blocked
claimed-by: claude/wages-draw-credit
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/residents.ts, kind skipped-mechanic"
claimed-at: 2026-10-20T03:26:29.054Z
after:
---

**What.** Let a counted employer that is short of cash on payday draw its approved credit line to pay wages. Today `settle` in `src/core2/modules/residents.ts` records a wage shortfall (`rt.shortfalls`, kind residents.wages) and marks SG-WORLD-wages-skip-credit-line when the payer's business book has a `creditFacilityId` with room. The reason is that `creditTrigger` in `src/core2/finance-cash.ts` accepts a draw only for a standing finance contract (the contract's `creditFacilityId` and a deficiency probe), and a residents wage flow is not one. Add a second trigger kind to the finance-cash planner and its bookkeeping verifier for a residents flow (the flow id, the facility, the requested amount up to the line's room), have `api.drawCredit` accept it, and call it from `settle` before the shortfall is recorded; the draw is journal-balanced, and only the part the line cannot cover is recorded as a shortfall. This is a core-area change.

**Rules.** Wire to the world: the draw moves lender cash to the employer's account and then to the workers by journal record, interest accruing on the facility. No dice: the draw happens because cash is short and the line has room. An effect is a read, not a record: the credit engine reads the draw as borrowing and the workers are paid on payday. Replace, never layer: the shortfall-only path for employers with a line and the stopgap marker are deleted. One model, two tiers: the same draw covers counted wage flows and full ones. Every dollar balances.

**Done when.** In a one-year run of the played world (buildBenchWorld, a place drawn from all 56 with a seed the builder did not choose, both named in the PR body) a counted employer with a credit line and too little cash on a named payday draws the shortfall as a credit-draw journal record id, its workers are paid in full by record id, the facility balance rises by the draw, and no residents.wages shortfall is recorded for that day. A test in src/core2/finance-cash.test.ts and src/core2/residents.test.ts proves it.

**Files.** src/core2/finance-cash.ts, src/core2/modules/residents.ts, src/core2/state.ts, src/core2/data/stopgaps.json

**Notes.** First row: A counted employer short of cash on payday records a wage shortfall and never draws its approved credit line, though the line has room.

Checked Oct 20: `api.drawCredit` (state.ts:975) exists, but finance-cash.ts `creditTrigger` (about line 1778) accepts a draw only for a genuine current standing contract (`standaloneDrawRequestPrefix` request id, the contract's `creditFacilityId`, a probe of its deficiency). A residents wage flow is not a finance contract, so the fix is a new trigger kind in the finance-cash planner and its bookkeeping verifier, a core-area change; nothing in residents.ts alone can draw.

Oct 20 (pool feeder): spec written; the blocker is real and core-only (the item's note, checked again: api.drawCredit at state.ts about line 975 exists; finance-cash.ts creditTrigger at line 1778 refuses a flow). The builder must be a core-area session, or the CTO assigns the finance-cash change first.
