---
id: world-census-scale-closures-large-cities
title: "A city far above 40,000 people closes firms at its Census size that it keeps at the sample size (Washington, D.C.: 5 against 0)"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr: #5803
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The census-scale closures test draws places from 10,000 to 40,000 people because a larger city's year does not fit one test process's memory. Washington, D.C. (census 693,645, scale 69.4), drawn once, closed 5 firms at its Census size against none at the sample size before the payroll-savings and owner-draw fixes of PR #5553, and was not rerun after them. Measure a large city at its Census size after those fixes and fix any remaining reader that does not multiply by the weight.

**Rules.** One model, two tiers: every reader multiplies by the weight the same way. No dice: a firm closes from its books and its owner's choice. Speed: the year must fit the two-minute rule, or the test runs the span the failure needs.

**Done when.** In a played world built with buildBenchWorld at Census scale in Washington, D.C. and one more drawn place above 100,000 (seeds named), closure rows in the jobs engine are within the same town's count at scale one, by job change id, shown by a test in src/core2.

**Files.** src/core2/census-scale-closures-support.ts, src/core2/modules/business.ts

**Notes.** Found working world-census-scale-closures-rise (PR #5553).
