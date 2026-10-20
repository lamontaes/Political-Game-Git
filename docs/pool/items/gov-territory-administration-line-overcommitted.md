---
id: gov-territory-administration-line-overcommitted
title: "A territory's administration budget line is .55 million short of the pay already committed to its posts, so its election chief is held unpaid (Pago Pago, American Samoa)"
area: gov
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr: #5725
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In American Samoa (drawn place Pago Pago, seed e5, played world from the opening day) the territory's state-level budget has an administration line whose wage share, less the yearly pay already committed to jobs on that line, is minus $155,499,490 in cents, about minus $1.55 million. `postPayCapDaily` therefore returns zero for the state's election chief, `startPublicJob` returns nothing for a post its line cannot pay at all, and the chief takes in no money. Find what is charged to that line (the territory's officials, legislature and employers) against how the budget sizes it, and make the line carry the pay it commits, or make the posts that are charged to it read the right line.

**Rules.** Wire to the world: the line's size follows the revenue and spending records and the payroll charged to it follows the jobs that exist, so the same dollars are on both sides. Estimate, never UNKNOWN: a territory's budget starts from the real average with its source and spread. One rule, all 56 places: the check draws its place and names the seed.

**Done when.** In the played world (`buildBenchWorld`, the drawn place Pago Pago, American Samoa with seed e5, one random place and one random state) the administration line's room for new posts is not negative at the opening, the state's election chief holds a paid job, and a test in src/core2/ names the place and seed and fails on main.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/budgets.ts, src/core2/modules/executive.ts, src/core2/data/budgets/spending-payees.json

**Notes.** Found Oct 18 (claude, claude/unpaid-posts-s6) with a probe of `publicPayRoom` for the post `state:chief-election-official`: line `administration`, room -155499490, cap 0. The Northern Mariana Islands chief was also unpaid at the same measure. Four states drawn showed no unpaid chief.

Sent back 2026-10-20 from PR #5046 (branch claude/territory-admin-line): merging main conflicts in src/core2/law-reach/group-b-money.ts and src/core2/modules/budgets.ts; finish on that branch, merge main into it first.
