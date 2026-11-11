---
id: tests-staff-hire-employed-dismissed-aide
title: "The aide-from-a-job test fails when that aide is later let go for missing work"
area: office
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-tests-staff-hire-employed-dismissed-aide
pr: #8567
after:
blocked-on:
lead: governing
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T04:24:35.982Z
---

**What.** src/core2/staff-hire-employed.test.ts finds aides hired from a private job and requires each one's post still running after 400 played days. An official may let an aide go for missing too much work (reviewAttendance in src/core2/modules/staff.ts, on main), which ends the post, so a draw where such an aide is later dismissed fails the test though the hire was right. Seen Oct 26 on the integrity cases branch: Townshend, Vermont (5073225), seed e08b751381b9d0c300eb0c369cc39dd52f14125abbec67c38f2120e63ba15279, a governor's aide whose post ended 2025-03-21.

**Cause.** Found in code: src/core2/modules/staff.ts reviewAttendance (line 1091) lets an aide go when the share of missed days exceeds the official's tolerance and ends the post (the row's dismissed record, line 1144); src/core2/staff-hire-employed.test.ts requires each employed-hire aide's post still running after 400 days and never reads that dismissal (no 'dismiss' in the file). Seen at Townshend, Vermont (5073225), seed e08b751381b9d0c300eb0c369cc39dd52f14125abbec67c38f2120e63ba15279.

**Fix.** Make the test require a running post only for aides with no recorded dismissal, and for a dismissed aide check the post ended on the dismissal date. Keep the hire-from-private-job assertions.

**Time box.** 1.5 hours for one Sonnet session.

**Rules.** Ask why: the test should read the staff row's recorded dismissal before calling an ended post a defect.

**Done when.** A second session runs src/core2/staff-hire-employed.test.ts on the Townshend seed (e08b751381b9d0c300eb0c369cc39dd52f14125abbec67c38f2120e63ba15279) and on two seeds it chose, each place named; the test passes, a dismissed aide's post is shown to end on the dismissal date by the staff row's record id, and every undismissed employed hire still has a running post after 400 days.

**Waits on.** Nothing.

**Files.** src/core2/staff-hire-employed.test.ts, src/core2/modules/staff.ts

**Notes.** TODO
