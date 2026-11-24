---
id: words-county-office-meeting-at-courthouse
title: "A full-time county officeholder's meeting is set at the courthouse, not at a business they once worked for"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: words-office-meeting-set-at-treasury
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Account lead, Nov 15 (seen in the class table of words-office-meeting-set-at-treasury: a county board member's "office" resolves to Willard Manufacturing)
claimed-at:
checked: words builder A 2026-11-15
---

**What.** A county officeholder's scene set "at the office" opens at their own day-job employer, a business. A part-time commissioner may meet at their business; a full-time county officeholder is found at the courthouse. Seen: a county board member at Sheridan WY, seed 7, whose office setting is Willard Manufacturing. Seen: a county board member's scene opens at the courthouse, not at a business.

**Cause.** Found in code: `resolveSetting` (src/director/scheduling.ts) "office" returns the subject's job organization when it is not a payroll body, and `seatSetting` finds no seat for a county office (no county row in the seat lookup), so nothing else places the scene.

**Fix.** First, which county offices are full time and which part time, from the offices data (the term's pay and hours, not a name): a record the offices module already keeps, read by the one resolver. A full-time county office's "office" resolves to the county's seat of government from the same lookup `seatSetting` uses (extending it to county jurisdictions, not a second lookup); a part-time one keeps the employer. Printed at three drawn places: each county office, its class, and where "office" resolves.

**Time box.** 3 hours for one Sonnet session at medium effort; stop after the class list if the data does not say.

**Rules.** One resolver. No names in logic. Sliding scale where pay or hours are a measure, never a threshold flip; if the data holds only a yes or no, say so.

**Done when.** At three drawn places (named, with seeds) every county office is listed with its class and where "office" resolves, a full-time one resolves to the county seat, and a pinned test at one place is red before and green after. A second session (not the builder) plays a county officeholder's scene in the running game at a drawn place from all 56 and sees it set at the courthouse.

**Waits on.** words-office-meeting-set-at-treasury.

**Files.** src/director/scheduling.ts
