---
id: director-floor-debate-bill-brought-on-meeting-day
title: "A bill brought on the day of its own meeting has its floor debate played after the roll"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: filed by hand by the meetings and floor builder, Nov 14 2026
checked: meetings and floor builder 2026-11-14
---

**What.** A seated member hears a floor debate before the roll only when the bill has at least a day of notice. A bill brought on the day of its meeting has its debate recorded that day and staged the next, after the vote (the pinned test counts these as late). Seen: a seated member at Klamath Falls, Oregon, who is brought a bill the day before its meeting.

**Cause.** Measured: Klamath Falls OR (seed meet-a1:2), bill introduced 2025-03-03, meeting 2025-03-04, debate recorded 03-04, scene 03-05. Columbus IN (seed meet-s:0), bill 13, scene 2025-02-24 after its roll. Found in code: the director stages a circumstance the day after its record (src/director/ledger.ts produceCircumstances), and holdPlayerIfDue (src/core2/modules/office-day.ts) records the debate on the meeting's own day when the agenda was posted that day.

**Fix.** Stage a circumstance whose record is dated the day of the meeting on that same day, before the meeting's own stop, read from the situation type's data row (a same-day flag), not a second path.

**Time box.** 8 hours.

**Rules.** One scene engine; no new stopgaps; plain American English.

**Done when.** A second session seats a member at a drawn place (Klamath Falls, Oregon, seed meet-a1:2, and Columbus, Indiana, seed meet-s:0), and sees and the debate for each of those bills is heard before its roll, named by record id.

**Waits on.** Nothing.

**Files.** src/director/ledger.ts, src/director/data/circumstances.json, src/core2/modules/office-day.ts, src/core2/office-day-state.ts

**Notes.** Counted in src/director/floor-debate-ahead.test.ts as late scenes.
