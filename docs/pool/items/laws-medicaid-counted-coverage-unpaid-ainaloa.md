---
id: laws-medicaid-counted-coverage-unpaid-ainaloa
title: "A counted group's Medicaid coverage obligation is never paid in Ainaloa, Hawaii (law-reach-group-b fails on one seed)"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #5770
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** On main, src/core2/law-reach-group-b.test.ts's Medicaid payment case fails for seed fc72c0cac63ca84c1d57f7f473ec592c95abdce2fe9718478fa5e0b362c63e56 in Ainaloa, Hawaii (place 1501085). After 35 days a counted group's coverage obligation still shows paidMinor 0, so the test's paid rows are empty. Other seeds pass, so the payment path misses a case this place hits. Find why that group's obligation is never settled and fix it in the reach engine.

**Rules.** An effect is a read, not a record: the Medicaid law counts only when the payment engine pays the covered group, so an obligation that never settles is a law that does nothing. One model, two tiers: a counted group is paid by the same rule as a full person, times its count.

**Done when.** With seed fc72c0cac63ca84c1d57f7f473ec592c95abdce2fe9718478fa5e0b362c63e56 pinned (Ainaloa, Hawaii, 1501085), src/core2/law-reach-group-b.test.ts passes its Medicaid payment case with a non-empty paid row naming the counted group's obligation record id, and the unpinned test still draws places from all 56.

**Files.** src/core2/law-reach/group-b.ts, src/core2/law-reach/group-b-money.ts, src/core2/law-reach-group-b.test.ts

**Notes.** Found by the fixer while resolving #5517 (whose merged tree equals main).

Sent back 2026-10-23 from PR #5770 (branch claude/medicaid-ainaloa): New standing reserve can make have negative but borrowing clips it to zero, underpaying due budget lines; cover the full shortfall and test reserve plus actual payments and debt; finish on that branch, merge main into it first.

Looked at Oct 21 (claude/medicaid-counted-unpaid), cause found, no fix landed. Reproduced on main with GOLDEN_PATH_SEED fc72c0ca…3e56 and GOLDEN_PATH_PLACE_KEY 1501085. The unpaid obligation is `reach-b:coverage:US|residents:jurisdiction_0dd4c92d5d688a85:2026-02-05` (a counted group's fund account, 243,718 a month from `cash:organization:treasury:US:residual`), opened 2026-02-05 with its first payday 2026-02-06. On that day the federal treasury held 2,816,324 on 02-05 and 176,614 after the day's payments, so the day's due obligations (settled in id order in `settleObligations`, src/core2/accounts.ts) drained it and this one, later in the order, got `paidMinor 0, shortMinor 243718`; with `accruesArrears: false` the month is forgiven. Tried (a) pro-rata sharing of a payer's cash among the day's due obligations in `settleObligations`: this case passes, but it fails `law-wiring-health-schools.test.ts` (Akron, Alabama, no open voucher payment), `group-b-food-aid.test.ts` (place 4911435, a household paid above 130% of poverty) and a retirement-claims case, all green on main, so it changes every benefit and needs a design call; (b) `accruesArrears: true` for coverage rows plus a 70-day window: still 0 paid, because the same ordering starves the obligation on the second payday too. The underlying question for the owner or the Laws line: the federal match for a town's Medicaid is paid from a federal treasury that, in a town-scale world, holds only that town's federal taxes (about 28,000 dollars), so several benefits due the same day cannot all be met. Options: a pro-rata rule for all obligations (with the three tests' expectations re-derived), a larger federal treasury for the town's share, or paying the federal match as an outside flow. Item stays open.
