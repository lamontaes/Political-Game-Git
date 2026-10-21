---
id: web-calibrate-labor-participation
title: "The jobs engine reads the outcome web's retirement-age-to-older-work link as a term in who works, fitted so the 62-to-67 share moves by its researched size"
area: core
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Split from web-calibrate-choice-terms Oct 21. No engine reads the web's retirement-age-to-older-work link today (it is listed unread in src/core2/data/outcome-web/coverage.json) and the old SG-LABOR-participation-scale marker is gone from the code. Add the web's factor as a term in the jobs engine's participation choice for people aged 62 to 67, and fit its weight in a played year so the group's working share moves by the researched size, as counted participation does.

**Rules.** An effect is a read, not a record; one model, two tiers; no dice; the weight lives in a parameter table tagged TUNABLE with the researched size as its check.

**Done when.** In a one-year bench world in a drawn place (place and seed named), shifting the web row for retirement-age-to-older-work moves the 62-to-67 working share by its researched size within its range, shown by job record ids, and the link is removed from the unread list in coverage.json; a test names place and seed.

**Files.** src/core2/modules/jobs.ts,src/core2/data/outcome-web/coverage.json,src/core2/data/outcome-web/outcome-web.json

**Notes.** TODO
