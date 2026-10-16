---
id: gov-contests-with-one-name-or-none
title: "Elections with one name or none name no winner, and one-name primaries count no votes (Vermont, Washington)"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A Vermont selectboard seat with no candidate has a result that names no winner; 12 county party primaries counted no votes because a primary with fewer than two names is skipped (voting.ts near line 1317); and Washington's primary totals are fractions such as 3,261.54. Decide an uncontested race by its law (the sole candidate wins, an empty seat follows the empty-race rule) and keep vote counts whole.

**Rules.** No dice; an effect is a read; one rule, all 56 places; ask why (record ids); the chain is the acceptance.

**Done when.** In the seeds named, an unopposed race names its winner, an empty one records the rule that applied, and all vote totals are whole numbers.

**Files.** src/core2/modules/voting.ts

**Notes.** The trace audit of Oct 14 (docs/reports/trace-audit-2026-10-14/README-TRACE-5.md); not re-checked on main today beyond the code location.
