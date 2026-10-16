---
id: core-counted-births-read-web
title: "Counted births follow the outcome web's birth-rate factor for the place"
area: core
kind: wiring
priority: 2
size: S
status: claimed
claimed-by: claude/web-births
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T15:44:46.545Z
---

**What.** The outcome web keeps a `births.rate` index per place, moved by unemployment (and, once wired, home prices), and no engine read it (`outcomeWebFactor` had no callers). Counted women (`src/core2/births-counted.ts`, `applyCountedFlows`) used the state's NCHS rate alone, so a town losing work had the same counted births as one gaining it. Now the monthly expected births of the counted women are their state rate times the web's factor for the place, and each month's counts row keeps the factor and the web month record it was read from.

**Rules.** An effect is a read: the web is written by the outcome web and read by the births flow. One model, two tiers: full couples already decide from their own work and income, so the counted women take the same causes through the place's factor. No dice: a factor, not a roll. One rule, all 56 places: places the web does not cover read a factor of 1.

**Done when.** In a played world (buildBenchWorld, a drawn place and seed named in the PR body) the monthly counts rows carry the web factor and its web month record id, the factor matches that record, and the expected births scale with the factor; the tests are src/core2/births-counted-web.test.ts and src/core2/births-counted-web-factor.test.ts.

**Files.** src/core2/births-counted.ts

**Notes.** Counted women in other places keep a factor of 1 until the web covers them.
