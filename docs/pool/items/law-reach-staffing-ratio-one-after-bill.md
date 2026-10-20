---
id: law-reach-staffing-ratio-one-after-bill
title: "A schools line cut or raise through the budget bill leaves the staffing ratio at 1, so no teacher is laid off or hired (replayable town)"
area: laws
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In PR 5632's CI, budget-line-schools-staffing.test.ts failed for place key 1311000 with place seed d094ae9b79b23aa34cd1caa125d158f0cc1ec30d1e364fe1a57b2b3a8e9c136e: the mayor's proposal changed the schools line by a third (666729265 to 444486177, or up) and the budget was adopted as asked, yet 0 teachers were laid off or hired out of 30 full-person teachers. A probe after the year turned showed the staffing row for the district with baseStaff 30 and positions 30, set on the adoption date: the handler computes its ratio against baseLine(), which is adoptedLine() = the base budget plus the enacted budget changes, so a change enacted through the bill is already in the base and the ratio is 1. Replay with SCHOOLS_LINE_PLACE_KEY=1311000 SCHOOLS_LINE_PLACE_SEED=<seed> npx vitest run src/core2/budget-line-schools-staffing.test.ts (the replay variables are in PR 5632's branch claude/schools-raise-test). The staffing round should measure the line against the line before the year's own bill (lineBeforeBill in modules/budgets.ts), as services do.

**Rules.** Replace, never layer: use lineBeforeBill as the base instead of adding a second path. No dice. One rule, all 56 places: the base is read from the budget records in any fiscal-year calendar. An effect is a read: the staffing row feeds the hiring round.

**Done when.** At the place and seed above, and in two other drawn places, a third off the schools line lays off named teachers (job ids named) and a third on hires named adults; src/core2/budget-line-schools-staffing.test.ts passes for both directions; the police and fire lines that share the rule still pass src/core2/law-reach-group-a.test.ts.

**Files.** src/core2/law-reach/group-a-staffing.ts,src/core2/law-reach/group-a-money.ts,src/core2/modules/budgets.ts,src/core2/budget-line-schools-staffing.test.ts

**Notes.** TODO
