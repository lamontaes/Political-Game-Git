---
id: campaign-day-test-spring-election-weeks
title: "campaign-day.test.ts fails by seed where the town's spring election ends the campaign before 20 weeks"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The test that every week a candidate knocks reaches someone expects more than 20 weeks of knocking, but a town with a spring election closes its campaign first. It fails on main in about 2 of 200 draws: Highgate Center VT (5033175, run seed wk-104) gives 9 weeks and Hobart WI (5535150, run seed wk-142) gives 14. The rule is right and the test's fixed week count is wrong.

**Rules.** One rule, all 56 places: the test reads each drawn place's own election date from its contest record instead of a fixed twenty weeks, so every place's calendar passes by the same rule.

**Done when.** src/core2/campaign-day.test.ts passes with GOLDEN_PATH_SEED=wk-104 and wk-142 and on fresh draws, expecting weeks of knocking up to the drawn place's own election date, with the place and seed in any failure message.

**Files.** src/core2/campaign-day.test.ts

**Notes.** TODO
