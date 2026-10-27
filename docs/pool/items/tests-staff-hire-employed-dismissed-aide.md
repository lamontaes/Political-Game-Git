---
id: tests-staff-hire-employed-dismissed-aide
title: "The aide-from-a-job test fails when that aide is later let go for missing work"
area: office
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/staff-hire-employed.test.ts finds aides hired from a private job and requires each one's post still running after 400 played days. An official may let an aide go for missing too much work (reviewAttendance in src/core2/modules/staff.ts, on main), which ends the post, so a draw where such an aide is later dismissed fails the test though the hire was right. Seen Oct 26 on the integrity cases branch: Townshend, Vermont (5073225), seed e08b751381b9d0c300eb0c369cc39dd52f14125abbec67c38f2120e63ba15279, a governor's aide whose post ended 2025-03-21.

**Rules.** Ask why: the test should read the staff row's recorded dismissal before calling an ended post a defect.

**Done when.** staff-hire-employed.test.ts checks the post still runs only for aides with no recorded dismissal (or checks that a dismissed aide's post ended on the dismissal date), and passes on the Townshend seed.

**Files.** src/core2/staff-hire-employed.test.ts

**Notes.** TODO
