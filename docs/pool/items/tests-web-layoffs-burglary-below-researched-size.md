---
id: tests-web-layoffs-burglary-below-researched-size
title: "The web test's layoffs-to-burglary case falls short of the researched size in some drawn places"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/outcome-web.test.ts fails on clean main with seed aadb30b90a2c6e19e2d43de3106378f7 in Little Creek, Delaware: the case 'layoffs raise unemployment and burglary follows by the researched 3% a point' expects burglary to rise more than 3.69 and gets 3.55. Whether the town's layoffs moved unemployment less than the test assumes, or the burglary link reads a different month, is not yet known. The fix finds which one by record in that town and corrects the engine or the test's expectation, never loosens the researched size to make it pass.

**Rules.** Ask why (owner, Oct 14): name the cause by record before changing the test or the link. Never weaken a test to get green: no widened tolerance without the measured reason.

**Done when.** The cause is named by record id in the item Notes, and src/core2/outcome-web.test.ts passes on seed aadb30b90a2c6e19e2d43de3106378f7 and on three fresh seeds with the burglary case asserting the researched size.

**Files.** src/core2/outcome-web.test.ts,src/core2/modules/crime.ts

**Notes.** TODO
