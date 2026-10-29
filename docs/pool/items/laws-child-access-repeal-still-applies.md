---
id: laws-child-access-repeal-still-applies
title: "Child-access prevention still applies after its repeal in a drawn place (law-wiring-justice test red by draw)"
area: laws
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/laws-child-access-repeal
pr:
blocked-on:
source: added with npm run pool -- add
lead: laws
claimed-at: 2026-10-29T19:05:20.327Z
---

**What.** law-wiring-justice.test.ts fails on clean main with seed 2d779733f866f2e2bae37ad62eca5bf460d5c076, which draws Richmond, Maine. After the child-access-prevention law is repealed, the test still finds the law applied to a person or household. Found by the laws lead's crime and justice helper on Oct 29, which ran main's own version of the file on the same seed to confirm the red is not its branch's.

**Rules.** Wire to the world: a repealed law must stop moving money and decisions on the day its repeal takes effect, and the justice engine must read the law in force, not a cached copy. Ask why by record: name the record that still applies after repeal.

**Done when.** With LAW_WIRING_SEED-style seed 2d779733f866f2e2bae37ad62eca5bf460d5c076 (Richmond, Maine), src/core2/law-wiring-justice.test.ts passes in a played world built with buildBenchWorld, and the PR names the law-applied record id that outlived the repeal and why.

**Files.** src/core2/law-wiring-justice.test.ts,src/core2/modules/justice.ts,src/core2/law-reach/

**Notes.** TODO
