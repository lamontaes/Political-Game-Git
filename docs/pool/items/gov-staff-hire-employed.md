---
id: gov-staff-hire-employed
title: "An official's aide can be hired from among people who work for less, not only the jobless"
area: gov
kind: stopgap
priority: 3
size: S
status: done
claimed-by: claude/gov-staff-hire-employed
pr: #5368
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:54:06.270Z
---

**What.** An official's aide can be hired from among people who work for someone else, not only the jobless. This is built in PR #5248 (branch claude/staff-hire-employed): the out-of-work filter is removed from the monthly staff review, the department-head refill and the governor's appointment, and taking the post ends the person's old job. This shell now points at that PR instead of repeating its text, and the item closes when #5248 merges.

**Rules.** Replace, never layer: the old out-of-work filter is deleted in the same change; No dice: the hire follows the post's pay against what the candidate earns now, never a roll.

**Done when.** PR #5248 merges: `src/core2/staff-hire-employed.test.ts` draws a place from all 56 in a played year and shows an aide hired from a private job, with the books balanced, and `SG-GOV-staff-hire-out-of-work` is resolved in stopgaps.json.

**Files.** src/core2/modules/staff.ts, src/core2/modules/executive.ts, src/core2/staff-hire-employed.test.ts, src/core2/data/stopgaps.json

**Notes.** Filled Oct 20 from the pool shell; the work is gov-stopgap-staff-missing-engine's PR #5248.
