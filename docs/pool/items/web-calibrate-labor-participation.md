---
id: web-calibrate-labor-participation
title: "The jobs engine reads the outcome web's retirement-age-to-older-work link as a term in who works, fitted so the 62-to-67 share moves by its researched size"
area: core
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/labor-participation-web
pr: #5776
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T04:01:14.378Z
---

**What.** Split from web-calibrate-choice-terms Oct 21. The jobs engine reads the earliest Social Security claim age (`retirementOnsetYears` in src/core2/modules/jobs.ts), but not the full retirement age, which is the cause the researched link is about (a two-year rise from 67 to 69 raises the 62-to-66 working share about 10 percent, range 4 to 22). Measured Oct 21 in twin worlds from one seed (Hockinson, Washington, 5331530, seed f891bf34947612bcd35379dacd2a6f4ce9efd65d730141461b6dcd7ff6f618df, a 400-day run in each world): people aged 62 to 66 working are 168 of 193 with the law at 67 and 168 of 193 with it at 69, so the law moves nothing. The retirement benefit a person would get claiming now falls as the full age rises (src/core2/retirement-claim.ts); the jobs engine's retire offer reads age and savings but not that benefit. Wire the offer to the benefit factor under the law in force, and fit its weight so the working share moves by the researched size. Also check the base: 87 percent of full people aged 62 to 66 holding a job looks high against the real employment share at those ages.

**Rules.** An effect is a read, not a record; one model, two tiers; no dice; the weight lives in a parameter table tagged TUNABLE with the researched size as its check.

**Done when.** In a one-year bench world in a drawn place (place and seed named), shifting the web row for retirement-age-to-older-work moves the 62-to-67 working share by its researched size within its range, shown by job record ids, and the link is removed from the unread list in coverage.json; a test names place and seed.

**Files.** src/core2/modules/jobs.ts,src/core2/data/outcome-web/coverage.json,src/core2/data/outcome-web/outcome-web.json

**Notes.** TODO

Oct 21 (claude, claude/labor-participation-web): wired, not fitted. The jobs engine now adds `retireWebTerm` (weight `jobsRetireWebWeight`, TUNABLE, 1) to the retire offer of full workers and to the counted retirement score: the score falls by weight times ln of the web's factor on `labor.older-employment` for the worker's age and sex; zero when no law moves the link. Checked: with the web row for retirement-age-to-older-work set to 0.1, `webReach` gives factor 1.106 for a 64-year-old man (Pagai, American Samoa). It cannot be fitted yet: a one-year paired run (Cedro, New Mexico, seed 6688ecf3…, ages 62 to 74, web row 0.1 and 0.22) moved the working share by 0.4 percent for both, because retiring starts from a score of -4 and few people retire in a year, and because full people 62 to 67 work at 88 percent while counted people work at 10 percent (new item core-older-workers-full-vs-counted-gap). Fit the weight once the tiers agree, against the 0.04 to 0.22 range.
