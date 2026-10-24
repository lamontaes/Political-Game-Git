---
id: world-federal-treasury-too-small-for-medicaid-match
title: "The federal treasury in a town world holds too little to pay its Medicaid share"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr: #5780
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In Guymon, Oklahoma (seed f28d686032d0850a26acef3082270a78f69609b37910a396c2c07c5e2dd13196, law-reach-group-b.test.ts), Medicaid expansion's federal share for the town's counted adults (2,763.82 a month, obligation reach-b:coverage:US|residents:jurisdiction_4280d54eb76ada09) was paid nothing for two months while the state's share was paid in full. The federal treasury account in the town world held 7,415.38 and was empty when the payment fell due, so the federal match the law sets never reaches counted residents. A treasury pays what it holds, so the federal government's cash in a town must reflect the federal revenue and borrowing that pays its programs there.

**Rules.** Wire to the world: the federal match is a dollar from the federal treasury to the people the expansion covers, so the federal account must hold what federal programs in the town draw, from its revenue and borrowing, never a fixed top-up.

**Done when.** In a played year of buildBenchWorld in Guymon, Oklahoma (seed above) and two places drawn at random from all 56, Medicaid's federal share obligations are paid each month (paidMinor above zero, named by obligation id), and the federal treasury's balance and inflows are reported in the PR body.

**Files.** src/core2/budgets-treasury.ts, src/core2/law-reach/group-b-money.ts

**Notes.** TODO

Sent back 2026-10-23 from PR #5780 (branch claude/federal-medicaid-match): federal-medicaid-match.test.ts advances only 360 days and checks cumulative paidMinor plus the final receipt after the loop; an early missed month followed by a final full payment still passes, so assert every due payment through the actual year target; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5780 (branch claude/federal-medicaid-match): federal-medicaid-match.test.ts:31-47 and :151-175 check the first payment and observed amounts but not every recurring due date; the actual checker accepts Jan21 and Mar21 with February missing, or only Jan21 through year end; assert middle/trailing monthly payments from cadence and active interval and correct the body date-check claim; finish on that branch, merge main into it first.
