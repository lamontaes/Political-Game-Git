---
id: gov-territory-legislatures-no-seats
title: "Guam, American Samoa, the Northern Marianas and the Virgin Islands open with legislatures that have no seats, so no cabinet is confirmed"
area: gov
kind: bug
priority: 2
size: M
status: done
claimed-by: claude/territory-seats-s5
pr: #4850
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T00:12:50.172Z
---

**What.** Guam, American Samoa, the Northern Marianas and the U.S. Virgin Islands open with legislature bodies that have no seats, because seats come from district geography and rosters the territories lack. Seat each recorded chamber (at large until the districts are read) so a governor's cabinet can be confirmed and the legislature can sit.

**Rules.** One rule, all 56 places. Register what is assumed (all seats at large). A test is never loosened to skip the four.

**Done when.** In each of the four territories the legislature chambers hold their recorded seats, a governor's cabinet is confirmed, and a year plays through. Test in src/core2/executive.test.ts.

**Files.** src/core2/offices-state.ts, src/core2/modules/legislature.ts, src/core2/executive.test.ts, src/core2/data/stopgaps.json

**Notes.** Sent back 2026-10-16 from PR #4834 (branch claude/executive-test-governor-held): Morning check refusal: test loosened with confirmable check skipping unseated territories; finish on that branch, merge main into it first.
