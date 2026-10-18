---
id: gov-territory-administration-line-overcommitted
title: "A territory's administration budget line is .55 million short of the pay already committed to its posts, so its election chief is held unpaid (Pago Pago, American Samoa)"
area: gov
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Built Oct 18 (claude/territory-admin-line). Cause: the island areas have no `state` block in `public-budget-bases.json` and the budgets module read `population2024` for residents, which they lack, so each island area's state treasury had residents 0 and no spending or revenue lines at all; every post charged to it was over its line. The budget now takes residents from the island-area counts in the same file, the states' residents-weighted function mix, and a total a resident from the area's own published all-funds spending (Guam, Virgin Islands, Puerto Rico) or their median (American Samoa, Northern Marianas); registered as stopgap SG-GOV-territory-budget-mix. It also replaces group B's own island population table (SG-GOV-REACH-B-territory-residents, closed). A one-year run in Aua, American Samoa (seed terr-oct18): 120.5 s against 128.7 s on main, heap 1.95 GB against 1.27 GB, money, ended-job, seat and ballot checks pass.
