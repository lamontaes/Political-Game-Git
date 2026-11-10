---
id: tests-web-layoffs-burglary-below-researched-size
title: "The web test's layoffs-to-burglary case falls short of the researched size in some drawn places"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
---

**What.** src/core2/outcome-web.test.ts fails on clean main with seed aadb30b90a2c6e19e2d43de3106378f7 in Little Creek, Delaware: the case 'layoffs raise unemployment and burglary follows by the researched 3% a point' expects burglary to rise more than 3.69 and gets 3.55. Whether the town's layoffs moved unemployment less than the test assumes, or the burglary link reads a different month, is not yet known. The fix finds which one by record in that town and corrects the engine or the test's expectation, never loosens the researched size to make it pass.

**Cause.** Needs cause. Looked at: src/core2/outcome-web.test.ts line 98 (case 'layoffs raise unemployment and burglary follows by the researched 3% a point'), which expects burglary to rise more than 3.69 and gets 3.55 in Little Creek, Delaware (seed aadb30b90a2c6e19e2d43de3106378f7); src/core2/modules/crime.ts exists. Unknown whether the layoffs moved unemployment less than the test assumes or the burglary link reads a different month. To find it: print the unemployment change and the web month row ids used in Little Creek and compare them to the link's lag and size.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session, which finds the cause and rewrites this item with it.

**Rules.** Ask why (owner, Oct 14): name the cause by record before changing the test or the link. Never weaken a test to get green: no widened tolerance without the measured reason.

**Done when.** A second session sees the cause named by web month record id in this item (the unemployment change and the rows the link read in Little Creek, Delaware, seed aadb30b90a2c6e19e2d43de3106378f7, against the link's lag and size), then runs src/core2/outcome-web.test.ts on that seed and three seeds in drawn places it chose; the burglary case asserts the researched size and passes.

**Waits on.** Nothing.

**Files.** src/core2/outcome-web.test.ts, src/core2/modules/crime.ts

**Notes.** TODO
