---
id: gov-state-races-where-town-matches-no-district
title: "No state legislative race is held where the town sits in no district (Virginia, seed a0b90e61b6e6)"
area: gov
kind: bug
priority: 2
size: M
status: done
claimed-by:
pr: #4715
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The Virginia House of Delegates serves two-year terms, yet none of its 100 seats had a race on November 4, 2025: the town matched no district, both chambers were marked as not covering it, and contests open only for seats that cover it (elections.ts near line 289). The state's other seats are still elected. Open contests for the seats the town does not cover, at the coarser level the rest of the state runs at.

**Rules.** No dice; an effect is a read; one rule, all 56 places; ask why (record ids); the chain is the acceptance.

**Done when.** In the seed named, the 2025 House of Delegates seats have contests, and a result for each, by contest ids.

**Files.** src/core2/modules/elections.ts

**Notes.** The trace audit of Oct 14 (docs/reports/trace-audit-2026-10-14/README-TRACE-5.md); not re-checked on main today beyond the code location.

Sent back 2026-10-16 from PR #4715 (branch claude/gov-state-races-no-district): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
