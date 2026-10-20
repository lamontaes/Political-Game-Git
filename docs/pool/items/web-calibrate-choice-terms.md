---
id: web-calibrate-choice-terms
title: "Calibrate the outcome web's terms in deterministic choices (full-tier births, labor participation)"
area: core
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/web-calibrate
pr: #5654
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T10:18:11.482Z
---

**What.** Two engines read the web's factor as a term in a choice that picks the higher score, not as a rate: full couples' plan-a-child choice (stopgap SG-WEB-births-full-tier, which has no term yet) and the jobs engine's participation pull (SG-LABOR-participation-scale, where a +0.3 older-work effect moved the share only 3%). Fit each term's weight in a played year so the group's share moves by the researched size, as counted births and counted participation already do. The fitted weight goes in the parameter table tagged TUNABLE with the researched size as its check, and the choice itself still reads each person's own records.

**Rules.** An effect is a read, not a record; one model, two tiers; no dice; numbers live in the parameter table tagged TUNABLE with the spread checked against.

**Done when.** In a one-year bench world in a drawn place, shifting the web row for unemployment-to-births moves full couples' births by the researched 0.75% a point within its range, and retirement-age-to-older-work moves the 62-to-67 share by its researched size; both stopgaps resolved; tests name place and seed.

**Files.** src/core2/births-plan.ts, src/core2/jobs-web.ts, src/core2/modules/jobs.ts

**Notes.** TODO

**Findings (first attempt, branch effect-web-calibrate, not merged).** The branch adds a `web` term to full couples' birth circumstances (`renewalWebWeight` times the log of the web's births factor, leaving out unemployment, which already lowers the couple's income). A fitted weight of 1.4 did not hold across towns. With effects raised 0.1 in Independence, Iowa (seed 7665614cbdecb770), a factor of 1.222 raised planning couples from 11 to 24, about five times the researched move. With effects raised 0.2 in Rockville, Connecticut (seed bb6e4dc7335205a6), they went from 11 to 12. Samples of 11 to 30 planning couples are too small for a stable fit, so the measure needs a larger pooled sample or a smoother term before refitting. The participation half was not built; the suggested route is a weight on the log in `participationShift` in src/core2/jobs-web.ts, checked against counted entry.
