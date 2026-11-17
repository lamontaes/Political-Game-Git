---
id: pins-23d-school-outcomes-from-own-students
title: "A place's pass, graduation and college-going rates are the sum of its own students' rates"
area: world
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: lives
pr:
after:
blocked-on:
lead: lives
model: sonnet
effort: medium
root: none
source: The CTO's LIFT THE PINS line on the crew's thread (#9747, comment 6936897718), family 23, pins 14 and 15, Nov 17, 2026
---

**What.** Each place's math, reading and graduation shares were its state's 2024 level (drawn once per world) with the income gradient divided by the town's own mean so the place landed exactly on that level, and college enrollment and completion were the NCES share times a per-world factor, divided by the class's own mean the same way. A town of poor students and a town of rich ones in one state passed at the same share.
Seen: dev mode, a school measure's group rows, show the income fifths' own shares and no state base.

**Cause.** Found in code: `src/core2/school-outcomes.ts`, `baseFor` (the web's state base), the `norm` division in the measure step and `enrollNorm`, `completeNorm` and the two world factors in `decideCollege`; `src/core2/world-base-rates.ts` (the college rows).

**Fix.** One fitted national baseline per measure (`data/school/outcomes.json`, `baseline`). Each fifth's share is the baseline times the gradient over the nation's equal-fifths mean (never the town's), plus class size and the web's factors. A town's rate is the sum of its students'. The state base, the town-mean divisions, the two college world factors and their spread rows are deleted.

**Time box.** 2 hours, Sonnet medium.

**Rules.** No dice. One model, two tiers: counted students are weighed as full ones, times their count. Replace, never layer.

**Done when.**

- `src/core2/school-outcomes-from-own-students.test.ts` passes and fails on old code.
- `school-outcomes`, `class-size-scores`, `school-small-cohort`, `school-outcomes-order` pass at drawn places (one seed-dependent red also red on main, named in the PR).
- A second session sees two towns of one state pass at different shares in dev mode.

**Waits on.** Nothing.

**Files.** `src/core2/school-outcomes.ts`, `src/core2/data/school/outcomes.json`, `src/core2/world-base-rates.ts`, `src/core2/data/parameters.json`, `src/core2/law-wiring-college-step.test.ts`, `src/core2/realistic-not-real.test.ts`, `src/core2/school-outcomes-from-own-students.test.ts`.

**Notes.** Nov 17 (Lives): row 16 (the 90 percent public-school pupil share) is not in this pull request; it stays a registered stopgap until a record of who is enrolled where exists.
