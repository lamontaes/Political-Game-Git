---
id: tests-staff-work-no-office-witness
title: "The drawn staff-work test can exhaust its places without a usable aide"
area: gov
kind: bug
priority: 2
size: S
status: blocked
claimed-by: claude/staff-no-office-witness
pr:
blocked-on: tests-staff-work-why-records-empty-on-main
source: added with npm run pool -- add
claimed-at: 2026-10-26T02:56:19.248Z
---

**What.** At seed196612b7b9cc3d9b7c955d1fdc5446b2, src/core2/staff.test.ts exhausts its bounded draws with no office could hire: KY2135362, OH3984308, OR4181300, NH3369940, WY5640120, IA1937200 and NJ3430420. The exact assertion and places reproduce on clean main d3b95c2b3e3ccf419c4fc19bdb08225b336af67a and on the timeout-only PR5837. Diagnose which seat, candidate or post-hire-work gate rejects each draw; this is not a timeout failure.

**Rules.** One rule, all56 places and no dice: keep the drawn-place case and its existing work, quality, payroll and record assertions; no skipped assertions, wider tolerance or convenient seed substitution. Preserve the existing staff-aides-miss-every-scheduled-day claim and investigate any shared cause before changing it.

**Done when.** The named seed passes the staff-work case at one worker without loosening its assertions, and an independent random draw passes. Name the gate that rejected each place and the positive staff/work/payroll record ids. If an engine changes, a drawn buildBenchWorld run demonstrates the corrected staff behavior with place and seed named. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/staff.test.ts, src/core2/modules/staff.ts, src/core2/work-attendance.ts if that is the diagnosed cause

**Notes.** Found by the merger in the third independent PR5837 draw; ordinary clean-main failure reproduced with no timeout override. The same120-second comparison also fails identically. Related attendance report: staff-aides-miss-every-scheduled-day / PR5762; this report does not assume attendance is the cause.

Oct 23, merger A, PR #5835: independent fresh seed c3be1ee291b4f1dee38390afc7a1c5e25df002e784aa632d8b455f55c2af8da7 reproduces the same staff.test.ts:254 no-office-could-hire failure on integrated head fc7b0ef8eb and clean frozen main ad3b0291cf. Attempted towns were US-UT 4939590, US-MO 2960752, US-IN 1810198, US-GA 1320932, US-WY 5615905, US-KS 2010925 and US-WV 5462764. Complete file: one pass and one failure on each head; test times 60.10 and 75.11 seconds respectively. No timeout override, seed reroll or assertion change; the broader staff-aides-miss-every-scheduled-day claim remains untouched.

Merger 2, 2026-10-26: root f3d402dc6d11da2e also reproduces the exact no-office-could-hire message on clean main b3ab4d7c92ebd0b754a774630fe3768a45a91956 and PR #5998's checked head 9fdf58914c0ee58255a02f694be25b068fc514e6: US-NM3543930, US-WY5601695, US-MT3006550, US-LA2212280, US-TN4725760, US-KS2058250, US-AK0282860, US-IA1973425. Main run170.44s, branch157.40s; one staff-work case fails and the age-weight case passes in each. Fresh failure remains visible, not replaced by a convenient seed. The additional named regression9955f92f94414e17ee0de61427ac6e80 passes both staff cases on the PR (99.792s body), records five no-room offices plus a funded aide paid46368 cents by organization:treasury:place:3112770. Retain the fresh independent witness requirement when fixing this item.

Diagnosed Oct 26 (claude/staff-no-office-witness), at seed 196612b7b9cc3d9b7c955d1fdc5446b2 on main b66a7227c1, one worker, the gate that rejected each drawn town: US-KY 2135362, US-OH 3984308, US-WY 5640120 and US-NJ 3430420, the official let both first aides go on 2026-02-04 for absence (absentShare 0.5, 10 worked and 10 missed days each) and the replacements hired that day had no payday by 2026-02-20; US-OR 4181300 and US-IA 1937200, the post's budget line had no room (aides serve unpaid, the noRoom branch); US-NH 3369940, 110 candidates, all applicants, no "known" one. The shared cause of the four absence dismissals is world-opening-city-administrator-shift-pattern: in US-KY 2135362 every aide's commitment is one slot `{offsetDays: 1, startMinute: 480, minutes: 1440}` copied down a chain (aide job:public:staff:person_73dfcd21f61bf92a:person_012639ca4ad4168e follows job:public:staff:person_73dfcd21f61bf92a:person_73dfce21f61bfadd, which follows work-relationship_fd2a899aea365fbf), so each 960-minute day is missed and each 480-minute day worked, exactly half. With PR 5769's commit b60ef68c5e (public posts work an office week) applied on this main and nothing else changed, the named seed passes on its first draw, US-KY 2135362: aide job job:public:staff:person_73dfcd21f61bf92a:person_012639ca4ad4168e paid 364,828 cents by organization:treasury:place:2135362. A fresh seed, f68bc16908d8a8ace310547786710ed6, also passes, in US-FL 1208600: job:public:staff:person_47c23ac1286e9c4b:person_004617852a44cec2 paid 364,344 cents by organization:treasury:place:1208600. No test or staff engine change is needed; this item is done when PR 5769 merges and the named seed is rerun on main. PR 5769 is a draft whose base branch claude/territory-payroll is already on main, so it needs retargeting to main and marking ready.
