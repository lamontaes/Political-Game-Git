---
id: gov-legislative-district-results-2024
title: "Each state legislative district's own 2024 result as sourced data, replacing the state's vote at a typical margin"
area: gov
kind: research
priority: 3
size: M
status: open
claimed-by:
pr: #5360
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-20 from PR #5352 (branch claude/tender-mendel-ijzjo8): merging main conflicts in src/core2/modules/world-races.ts; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5352 (branch claude/tender-mendel-ijzjo8): The PR changes research data, its compiler and the live legislative electorate/world-races readers, but its changed files contain no docs/release/changes declaration. Add an accurate patch declaration for the district-result behavior, naming the actual sourced coverage and fallback limits, then merge main and rerun changed-file checks.; finish on that branch, merge main into it first.

Oct 21 (claude): already on main. `src/core2/legislative-district-results.ts` with `data/research/elections/medsl-2024-legislative-district-results.json` gives each state legislative district its own 2024 result, read by `legislativePlace` in `electorate-places.ts`, with the typical margin only where a district has none. PR #5352 duplicated it (its own data file and compiler); merged main into it, dropped the duplicates, and it now carries no diff; suggest closing it. A merger can mark this item done after checking the reader's test. Claim released.
