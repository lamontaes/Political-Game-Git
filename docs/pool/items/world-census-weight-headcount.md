---
id: world-census-weight-headcount
title: "An employer's headcount, staffing and payroll read counted jobs times the worker household weight"
area: world
kind: wiring
priority: 1
size: M
status: done
claimed-by:
pr: #4603
blocked-on:
after: core-census-weight-money
source: added with npm run pool -- add
claimed-at:
---

**What.** An employer's counted workers stand for as many jobs as their households' weights say. Add one reader beside `countedJobsOf` (`src/core2/residents-economy.ts`) that returns the weighted headcount (the sum of the weight of each counted worker's household), and make the readers that count heads use it: business size and staffing (`modules/business.ts` lines near 175, 1354, 2011), the employer's payroll and cash needs (`finance-state.ts` near 1405, `finance-cash.ts` near 758). Readers that pick one worker (an owner, a first hire) keep the record.

**Rules.** One model, two tiers (a counted group is read by every engine with the same rule as a full person, times its count); no dice; one rule, all 56 places; an effect is a read; speed (a year under two minutes, no more than 20% slower than base); replace, never layer.

**Done when.** In a one-year run of a drawn town opened at scale 3, each employer's headcount, payroll and staffing read three times the scale-one town's, and a town at scale one is identical to base. Named by employer record id. A test in a random place proves both. The owner plays it: nothing yet; this is the base for the Census-size opening.

**Files.** src/core2/residents-economy.ts, src/core2/modules/business.ts, src/core2/finance-state.ts, src/core2/finance-cash.ts

**Notes.** Split from world-census-weight-economy (claude/world-census-weight-economy) when it was claimed: the original is an L. The weight is `CountedStore.weightOf` (core-census-weight-model, merged); counted money already moves times the weight (core-census-weight-money, #4467). Test by opening a drawn town with `buildBenchWorld(..., { countScale: 3 })` against the same seed at scale one.

Sent back 2026-10-16 from PR #4603 (branch claude/world-census-weight-headcount): Sent back by the merger: src/core2/counted-weight-headcount.test.ts fails twice on this branch merged with current main ('reads an employer's counted headcount times the worker households' weight, and is unchanged at scale one'). Reproduce in a drawn place, fix the root cause, rerun the test in several places, merge main and push; finish on that branch, merge main into it first.
