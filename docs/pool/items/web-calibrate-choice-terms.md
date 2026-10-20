---
id: web-calibrate-choice-terms
title: "Calibrate the outcome web's terms in deterministic choices (full-tier births, labor participation)"
area: core
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/web-calibrate
pr: #5654
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T16:36:06.620Z
---

**What.** Two engines read the web's factor as a term in a choice that picks the higher score, not as a rate: full couples' plan-a-child choice (stopgap SG-WEB-births-full-tier, which has no term yet) and the jobs engine's participation pull (SG-LABOR-participation-scale, where a +0.3 older-work effect moved the share only 3%). Fit each term's weight in a played year so the group's share moves by the researched size, as counted births and counted participation already do. The fitted weight goes in the parameter table tagged TUNABLE with the researched size as its check, and the choice itself still reads each person's own records.

**Rules.** An effect is a read, not a record; one model, two tiers; no dice; numbers live in the parameter table tagged TUNABLE with the spread checked against.

**Done when.** In a one-year bench world in a drawn place, shifting the web row for unemployment-to-births moves full couples' births by the researched 0.75% a point within its range, and retirement-age-to-older-work moves the 62-to-67 share by its researched size; both stopgaps resolved; tests name place and seed.

**Files.** src/core2/births-plan.ts, src/core2/jobs-web.ts, src/core2/modules/jobs.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5654 (branch claude/web-calibrate): src/core2/births-full-web.test.ts fails with main merged (run seed 85f1ab6ee110a92f: the factor-0.9 planning share equals the base, 0.0756 vs 0.0756, in all nine drawn places); finish on that branch, merge main into it first.
