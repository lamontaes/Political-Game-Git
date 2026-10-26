---
id: tests-staff-work-why-records-empty-on-main
title: "The staff-work test expects five retained why records for an unfocused aide and gets zero"
area: gov
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/staff-work-why-fixture
pr: #6170
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T18:10:36.001Z
---

**What.** On clean main a53dd0ba22428d89712ebfbd06c050e35ed6b93b, staff.test.ts:150 expects workOf(api, aide.id).length to be five but receives zero. It reproduces at GOLDEN_PATH_SEED=196612b7b9cc3d9b7c955d1fdc5446b2 in an isolated one-worker run, and on PR5769 with both that seed and an independent draw. The five briefing results exist, but the fixture does not request retention for an aide outside the player circle under the current keepsWhy rule.

**Rules.** Ask why: when the test asserts a retained work record, explicitly arrange the player-circle focus or the dedicated keep-everyone’s-why debug scope that justifies retaining it. Keep why only for the player and the people they deal with in ordinary play; preserve all positive briefing, experience, quality and task-count assertions rather than restoring global retention or skipping checks.

**Done when.** The named seed and an independent drawn staff.test.ts case pass at one worker on current main, with the fixture explicitly arranging the required focus or debug retention and restoring it for ordinary-play checks. Name the positive staff/work/payroll record ids, keep task experience and quality assertions, and show that unfocused play still omits the why rows while counting tasks.

**Time box.** 3 hours. Model: Sonnet, no helpers.

**Files.** src/core2/staff.test.ts, src/core2/why-kept.ts, src/core2/modules/staff.ts

**Notes.** TODO
