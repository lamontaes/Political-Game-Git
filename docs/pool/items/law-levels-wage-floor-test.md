---
id: law-levels-wage-floor-test
title: "Law levels: test that a state wage below the federal floor never applies"
area: laws
kind: cleanup
priority: 3
size: S
status: done
claimed-by: law-levels-federal-floor-test
pr: #7312
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-06T05:14:10.814Z
---

**What.** Done-when 5 of the law-levels job names a test that a state law below a federal floor never applies; the resolver does it but no test showed it on a drawn place.

**Rules.** Test only; no change to the rule.

**Done when.** wage-floor-levels.test.ts shows 5.00 state leaves 7.25 governing, 9.00 state governs, a lower town wage is ignored, a higher one governs.

**Files.** src/core2/wage-floor-levels.test.ts

**Notes.** TODO
