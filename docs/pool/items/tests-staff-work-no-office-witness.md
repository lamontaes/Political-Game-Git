---
id: tests-staff-work-no-office-witness
title: "The drawn staff-work test can exhaust its places without a usable aide"
area: gov
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/pool-tests-staff-work-no-office-witness
pr: #8419
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
claimed-at: 2026-11-11T01:14:14.602Z
checked: fable 2026-11-10
branch: claude/pool-tests-staff-work-no-office-witness
merged-at: 2026-11-12T08:09:55.977Z
---

**What.** At seed196612b7b9cc3d9b7c955d1fdc5446b2, src/core2/staff.test.ts exhausts its bounded draws with no office could hire: KY2135362, OH3984308, OR4181300, NH3369940, WY5640120, IA1937200 and NJ3430420. The exact assertion and places reproduce on clean main d3b95c2b3e3ccf419c4fc19bdb08225b336af67a and on the timeout-only PR5837. Diagnose which seat, candidate or post-hire-work gate rejects each draw; this is not a timeout failure.

**Cause.** Measured: GOLDEN_PATH_SEED=196612b7b9cc3d9b7c955d1fdc5446b2 npx vitest run src/core2/staff.test.ts (test 'no office could hire', failure line 298), and the fresh seed c3be1ee291b4f1dee38390afc7a1c5e25df002e784aa632d8b455f55c2af8da7. The Oct 26 Notes diagnose the named seed: four places lost both first aides to absence (fixed by #5769, office-week) and the remaining gates are the noRoom branch (staff.test.ts line 216: a budget line with no room in US-OR 4181300 and US-IA 1937200) and no 'known' candidate (US-NH 3369940).

**Fix.** Rerun both seeds on main. If still red, name per drawn place the gate that rejected it (noRoom, no known candidate, no payday by the check date) and make the test keep drawing places until it finds one that can hire, naming the places passed over and why. Keep every staff, work and payroll assertion; no wider tolerance.

**Time box.** 3 hours for one Sonnet session.

**Rules.** One rule, all56 places and no dice: keep the drawn-place case and its existing work, quality, payroll and record assertions; no skipped assertions, wider tolerance or convenient seed substitution. Preserve the existing staff-aides-miss-every-scheduled-day claim and investigate any shared cause before changing it.

**Done when.** A second session runs src/core2/staff.test.ts at one worker with seed 196612b7b9cc3d9b7c955d1fdc5446b2, seed c3be1ee291b4f1dee38390afc7a1c5e25df002e784aa632d8b455f55c2af8da7 and one seed it chose; each passes with no assertion loosened, the failure message or the report names the gate that rejected each passed-over place, and a hired aide's staff, work and payroll record ids are shown.

**Waits on.** Nothing. (tests-staff-work-why-records-empty-on-main, which it once waited on, is done.)

**Files.** src/core2/staff.test.ts, src/core2/modules/staff.ts

**Notes.** Found by the merger in the third independent PR5837 draw; ordinary clean-main failure reproduced with no timeout override. The same120-second comparison also fails identically. Related attendance report: staff-aides-miss-every-scheduled-day / PR5762; this report does not assume attendance is the cause.

Oct 23, merger A, PR #5835: independent fresh seed c3be1ee291b4f1dee38390afc7a1c5e25df002e784aa632d8b455f55c2af8da7 reproduces the same staff.test.ts:254 no-office-could-hire failure on integrated head fc7b0ef8eb and clean frozen main ad3b0291cf. Attempted towns were US-UT 4939590, US-MO 2960752, US-IN 1810198, US-GA 1320932, US-WY 5615905, US-KS 2010925 and US-WV 5462764. Complete file: one pass and one failure on each head; test times 60.10 and 75.11 seconds respectively. No timeout override, seed reroll or assertion change; the broader staff-aides-miss-every-scheduled-day claim remains untouched.

Merger 2, 2026-10-26: root f3d402dc6d11da2e also reproduces the exact no-office-could-hire message on clean main b3ab4d7c92ebd0b754a774630fe3768a45a91956 and PR #5998's checked head 9fdf58914c0ee58255a02f694be25b068fc514e6: US-NM3543930, US-WY5601695, US-MT3006550, US-LA2212280, US-TN4725760, US-KS2058250, US-AK0282860, US-IA1973425. Main run170.44s, branch157.40s; one staff-work case fails and the age-weight case passes in each. Fresh failure remains visible, not replaced by a convenient seed. The additional named regression9955f92f94414e17ee0de61427ac6e80 passes both staff cases on the PR (99.792s body), records five no-room offices plus a funded aide paid46368 cents by organization:treasury:place:3112770. Retain the fresh independent witness requirement when fixing this item.

Diagnosed Oct 26 (claude/staff-no-office-witness), at seed 196612b7b9cc3d9b7c955d1fdc5446b2 on main b66a7227c1, one worker, the gate that rejected each drawn town: US-KY 2135362, US-OH 3984308, US-WY 5640120 and US-NJ 3430420, the official let both first aides go on 2026-02-04 for absence (absentShare 0.5, 10 worked and 10 missed days each) and the replacements hired that day had no payday by 2026-02-20; US-OR 4181300 and US-IA 1937200, the post's budget line had no room (aides serve unpaid, the noRoom branch); US-NH 3369940, 110 candidates, all applicants, no "known" one. The shared cause of the four absence dismissals is world-opening-city-administrator-shift-pattern: in US-KY 2135362 every aide's commitment is one slot `{offsetDays: 1, startMinute: 480, minutes: 1440}` copied down a chain (aide job:public:staff:person_73dfcd21f61bf92a:person_012639ca4ad4168e follows job:public:staff:person_73dfcd21f61bf92a:person_73dfce21f61bfadd, which follows work-relationship_fd2a899aea365fbf), so each 960-minute day is missed and each 480-minute day worked, exactly half. With PR 5769's commit b60ef68c5e (public posts work an office week) applied on this main and nothing else changed, the named seed passes on its first draw, US-KY 2135362: aide job job:public:staff:person_73dfcd21f61bf92a:person_012639ca4ad4168e paid 364,828 cents by organization:treasury:place:2135362. A fresh seed, f68bc16908d8a8ace310547786710ed6, also passes, in US-FL 1208600: job:public:staff:person_47c23ac1286e9c4b:person_004617852a44cec2 paid 364,344 cents by organization:treasury:place:1208600. No test or staff engine change is needed; this item is done when PR 5769 merges and the named seed is rerun on main. PR 5769 is a draft whose base branch claude/territory-payroll is already on main, so it needs retargeting to main and marking ready.

Merger 1, 2026-10-26 after #5769 merged: the primary office-week fix is delivered and its 120-day schedule/attendance test passed. The required named-seed staff file was rerun on merged main 6aa5524acdd1a679086455a28980a06c171a99f4 and still fails earlier at staff.test.ts:150, retained work rows0 versus5, exactly as on the clean pre-merge base and on an independent PR draw. This secondary item is not done; its blocker is now tests-staff-work-why-records-empty-on-main rather than the merged schedule item. Preserve all original staff/work/payroll assertions and rerun the named and independent seeds after the retention-fixture issue is fixed.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 01:12 UTC) on branch claude/pool-tests-staff-work-no-office-witness.

Released (2026-11-11): Cause differs: src/core2/staff.test.ts passes (2 of 2) on main 43a170eac2d at both named seeds 196612b7... and c3be1ee2..., and at seed 5d3a0c9e1b7f4a62; no red to fix. Needs a CTO close or a new repro. Continue on branch claude/pool-tests-staff-work-no-office-witness.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 01:14 UTC) on branch claude/pool-tests-staff-work-no-office-witness.
