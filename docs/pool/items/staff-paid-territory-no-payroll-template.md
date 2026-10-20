---
id: staff-paid-territory-no-payroll-template
title: "A territory with no payroll calendar anywhere leaves every aide unpaid (Charlotte Amalie East, seed p3)"
area: gov
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr: #5712
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Merge audit fix 5 asked for a pinned regression of #5559 (staff paid in a territory). On main it does not hold: in Charlotte Amalie East, U.S. Virgin Islands (place territory:VI:charlotte-amalie-east, seed p3) all 19 aides of the delegate, governor, lieutenant governor, boards and legislature are unpaid after 120 days of play, because startPublicJob finds no job to take a schedule from: of 1,426 running jobs at the start, none has a work commitment with a payroll calendar (the territory's workers are counted, not full people), so even taking the longest-hours job anywhere finds no template, and the post is held unpaid. Give a post with no template a schedule built from the parameters (the full-time week and the paydays the opening's work builder uses) so the aide is paid.

**Rules.** Wire to the world: every aide is on a treasury payroll in any place, proven by record id in a played world. One rule, all 56 places: nothing names a territory. Replace, never layer: the template lookup and the built schedule are one path. Every dollar balances.

**Done when.** In the played world for Charlotte Amalie East, U.S. Virgin Islands (place territory:VI:charlotte-amalie-east, seed p3) after 120 days every aide of a seated official has a job id and a work commitment with a payroll calendar, and a first payment posts to the aide by journal record id; the pinned case is a test in src/core2/staff-paid-every-place.test.ts that passes, and the random-place case still passes.

**Files.** src/core2/public-payroll.ts, src/core2/opening-work.ts, src/core2/staff-paid-every-place.test.ts

**Notes.** Found Oct 20 by fs11vb while doing fix 5 of release-merge-audit-oct20-morning-fixes. The pinned case written for that fix fails on main (19 aides unpaid); it is not in a PR because it would turn a test red. A first attempt that let the schedule fall back to the longest-hours job anywhere did not help: no job in this world has a payroll calendar.

Oct 20 (fs11vb, diagnosed, nothing built): logged every `startPublicJob` call in the repro world. The 19 jobs in the town are the officials' own seat jobs (`job:office:seat:US-VI:unicameral:At-large:N:…`), and none has a work commitment or payroll calendar, so every candidate template is skipped ("no commitment/calendar"). Letting the lookup fall back to the longest-hours job anywhere (a change in `src/core2/public-payroll.ts`, tried and reverted) found nothing either: commitments and calendars exist only for full people whose opening schedule was built, and none of the territory's workers is one. So the fix has to build a schedule and a payroll calendar for the post from the parameters (the full-time week `openingFullTimeWeeklyHours`, `daysPerWeek`, and the paydays the opening's payroll calendar builder uses in `src/core2/opening-payroll-calendar.ts`) when no template exists, replacing the template lookup rather than sitting beside it.

Sent back 2026-10-20 from PR #5712 (branch claude/territory-payroll): merging main conflicts in src/core2/public-payroll.ts (#5668 changed the schedule template order there); finish on that branch, merge main into it first.
