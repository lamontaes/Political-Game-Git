---
id: play-staff-dismissal-after-attendance
title: "Staff attendance dismissal ends a job after its shift under the player clock"
area: gov
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/staff-dismissal-after-attendance
pr: #5894
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T04:16:31.875Z
---

**What.** The drawn offer-deadline test crashes in reviewAttendance when staffReview ends a job after that person has already worked today. The error is A job ends before its day’s work, from calendar work, at job-lifecycle.ts:126, called from staff.ts:1076 under player-v1 closeDay. It reproduces identically on clean main ed02fd2beb and the main-integrated offer branch before the offer assertion, so the player cannot continue that day.

**Rules.** Wire to the world: dismissal must follow the recorded attendance and end the job before its next shift, using the existing job lifecycle ordering. No dice: the end date follows actual attendance rather than a roll or an arbitrary exception.

**Done when.** The named Bruceton Mills repro and a second drawn place run the player clock through a year without the staff-review job-end exception, naming seeds and staff job IDs. A regression proves an aide who has worked today is dismissed at the correct subsequent boundary, with attendance, pay and replacement records preserved.

**Files.** src/core2/modules/staff.ts, src/core2/job-lifecycle.ts, src/core2/player-v1.ts, src/core2/jobs-offer-deadline-held.test.ts

**Notes.** Merger 3: found gating PR #5651. Test seed f3a19e9b0b076c3226803a277a9c30fd5b0454de, salt offer-deadline-held, Bruceton Mills West Virginia 5410852, world seed 8d0fcf463ca39a970d415a603f3341fd46157149cfa3c6106afe896bf8a4d305. Same new test on clean main ed02fd2beb fails in 51.1s with reviewAttendance -> endJob -> endRecordedJob -> closeDay. This is dismissal, distinct from the previously fixed staff hiring-after-work path.
