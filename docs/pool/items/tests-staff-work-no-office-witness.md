---
id: tests-staff-work-no-office-witness
title: "The drawn staff-work test can exhaust its places without a usable aide"
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

**What.** At seed196612b7b9cc3d9b7c955d1fdc5446b2, src/core2/staff.test.ts exhausts its bounded draws with no office could hire: KY2135362, OH3984308, OR4181300, NH3369940, WY5640120, IA1937200 and NJ3430420. The exact assertion and places reproduce on clean main d3b95c2b3e3ccf419c4fc19bdb08225b336af67a and on the timeout-only PR5837. Diagnose which seat, candidate or post-hire-work gate rejects each draw; this is not a timeout failure.

**Rules.** One rule, all56 places and no dice: keep the drawn-place case and its existing work, quality, payroll and record assertions; no skipped assertions, wider tolerance or convenient seed substitution. Preserve the existing staff-aides-miss-every-scheduled-day claim and investigate any shared cause before changing it.

**Done when.** The named seed passes the staff-work case at one worker without loosening its assertions, and an independent random draw passes. Name the gate that rejected each place and the positive staff/work/payroll record ids. If an engine changes, a drawn buildBenchWorld run demonstrates the corrected staff behavior with place and seed named.

**Files.** src/core2/staff.test.ts, src/core2/modules/staff.ts, src/core2/work-attendance.ts if that is the diagnosed cause

**Notes.** Found by the merger in the third independent PR5837 draw; ordinary clean-main failure reproduced with no timeout override. The same120-second comparison also fails identically. Related attendance report: staff-aides-miss-every-scheduled-day / PR5762; this report does not assume attendance is the cause.

Oct 23, merger A, PR #5835: independent fresh seed c3be1ee291b4f1dee38390afc7a1c5e25df002e784aa632d8b455f55c2af8da7 reproduces the same staff.test.ts:254 no-office-could-hire failure on integrated head fc7b0ef8eb and clean frozen main ad3b0291cf. Attempted towns were US-UT 4939590, US-MO 2960752, US-IN 1810198, US-GA 1320932, US-WY 5615905, US-KS 2010925 and US-WV 5462764. Complete file: one pass and one failure on each head; test times 60.10 and 75.11 seconds respectively. No timeout override, seed reroll or assertion change; the broader staff-aides-miss-every-scheduled-day claim remains untouched.
