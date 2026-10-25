---
id: people-coverage-commuter-employer-size
title: "Employer health coverage ranks a commuter's outside employer by its commuters in town, so a spouse's new commuter job takes the household's policy"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/modules/coverage.ts holdersToday ranks every working adult by staffOf(api) for their employer, then pay. A commuter's employer is the town's outside-market organization, whose staff count is the town's commuters, not the size of the firm they work for. In Gallina, New Mexico (place 3528180, test seed aa11bb22cc33dd44, health-coverage-counted.test.ts) a filled-in household's policyholder worked for the public schools (staff 5); on July 1, 2025 the spouse started job:commuter:person_f93e020db38b6634:2025-07-01 at outside-market (staff 10, a third of the pay), and the review moved the household's policy to the spouse.

**Rules.** One model, two tiers: counted and full workers are ranked by the same rule. No dice: who holds a plan comes from the employer and pay, not a draw. Sliding scales and causes: an employer's size is what the records say, not a fixed number. Estimate, never UNKNOWN: an outside employer's size starts from a sourced average with a spread.

**Done when.** holdersToday ranks a commuter by an estimate of their outside employer's size (a sourced firm-size distribution for the commute's destination, per place, with its spread) or by a rule the people lead names, not by the count of commuters in town; health-coverage-counted.test.ts and health-coverage.test.ts pass on aa11bb22cc33dd44 and three fresh drawn places named in the PR body; the PR shows by record whose policy it is in Gallina on July 1.

**Files.** src/core2/modules/coverage.ts, src/core2/health-coverage-counted.test.ts

**Notes.** TODO
