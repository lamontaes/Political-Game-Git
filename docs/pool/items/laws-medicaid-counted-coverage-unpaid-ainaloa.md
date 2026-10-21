---
id: laws-medicaid-counted-coverage-unpaid-ainaloa
title: "A counted group's Medicaid coverage obligation is never paid in Ainaloa, Hawaii (law-reach-group-b fails on one seed)"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** On main, src/core2/law-reach-group-b.test.ts's Medicaid payment case fails for seed fc72c0cac63ca84c1d57f7f473ec592c95abdce2fe9718478fa5e0b362c63e56 in Ainaloa, Hawaii (place 1501085). After 35 days a counted group's coverage obligation still shows paidMinor 0, so the test's paid rows are empty. Other seeds pass, so the payment path misses a case this place hits. Find why that group's obligation is never settled and fix it in the reach engine.

**Rules.** An effect is a read, not a record: the Medicaid law counts only when the payment engine pays the covered group, so an obligation that never settles is a law that does nothing. One model, two tiers: a counted group is paid by the same rule as a full person, times its count.

**Done when.** With seed fc72c0cac63ca84c1d57f7f473ec592c95abdce2fe9718478fa5e0b362c63e56 pinned (Ainaloa, Hawaii, 1501085), src/core2/law-reach-group-b.test.ts passes its Medicaid payment case with a non-empty paid row naming the counted group's obligation record id, and the unpinned test still draws places from all 56.

**Files.** src/core2/law-reach/group-b.ts, src/core2/law-reach/group-b-money.ts, src/core2/law-reach-group-b.test.ts

**Notes.** Found by the fixer while resolving #5517 (whose merged tree equals main).
