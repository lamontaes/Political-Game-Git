---
id: core-counted-weight-money-small-town-red
title: "counted-weight-money.test fails on main in a town with too few rents to compare: 2 compared where it needs more than 5 (Solen, North Dakota, seed d586312f9642b0ad7d9e60b31eed90c61450622f5bcb1c78447eb8b1eb4cd407)"
area: core
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/political-game-pool-76ksvw
pr: #5180
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:11:58.883Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

**Result (Oct 20).** The test now draws up to five places until a town has more than 8 counted rents and 8 payrolls, and fails with a clear message if none does; Solen-sized towns no longer fail the compare count. A rerun then reached a different failure in Western Springs, Illinois (seed 7948de2094a32969f465293c52050d63bce0e46645b5a0729d7fd22ccbc0190c): a counted payroll paid 37,454,550 against an expected ceiling of 36,991,745 (about 1.2 percent over). Filed as core-counted-weight-wage-overpays.
