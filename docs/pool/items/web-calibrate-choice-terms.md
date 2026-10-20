---
id: web-calibrate-choice-terms
title: "Calibrate the outcome web's terms in deterministic choices (full-tier births, labor participation)"
area: core
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/web-calibrate-terms
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T10:10:01.576Z
---

**What.** Two engines read the web's factor as a term in a choice that picks the higher score, not as a rate: full couples' plan-a-child choice (stopgap SG-WEB-births-full-tier, which has no term yet) and the jobs engine's participation pull (SG-LABOR-participation-scale, where a +0.3 older-work effect moved the share only 3%). Fit each term's weight in a played year so the group's share moves by the researched size, as counted births and counted participation already do.

**Rules.** An effect is a read, not a record; one model, two tiers; no dice; numbers live in the parameter table tagged TUNABLE with the spread checked against.

**Done when.** In a one-year bench world in a drawn place, shifting the web row for unemployment-to-births moves full couples' births by the researched 0.75% a point within its range, and retirement-age-to-older-work moves the 62-to-67 share by its researched size; both stopgaps resolved; tests name place and seed.

**Files.** src/core2/births-plan.ts, src/core2/jobs-web.ts, src/core2/modules/jobs.ts

**Notes.** TODO

Oct 20 (claude, Sonnet, claimed and released unbuilt): neither piece this item calibrates is on main yet. `SG-WEB-births-full-tier` and `SG-LABOR-participation-scale` are not in stopgaps.json on main, `src/core2/jobs-web.ts` does not exist, and `births-plan.ts` has no web term (the web factor is read only by the counted births in `births-counted.ts`; #5557 adds the age-specific factor and registers `SG-WEB-births-age-counted-only`). So there is no term to fit a weight for. Start once the PRs that add the two terms have merged (the full couples' plan-a-child term and the jobs participation term), then fit each weight against the researched 0.75 percent a point and the 62-to-67 share in a one-year bench world.
