---
id: release-red-law-reach-group-b-handler-count-sales-tax
title: "law-reach-group-b.test.ts fails on main: the handler count is 34 not 35, and a city sales tax test sees no price records in Pecktonville, Maryland"
area: release
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Two tests in src/core2/law-reach-group-b.test.ts fail on origin/main's src/core2, checked Oct 20. 'registers a handler for every group B policy and budget line' expects 35 handlers and gets 34, so a policy row was added or a handler removed without the other. 'a city sales tax rate reaches every household and seller as a price record' fails with seed fe0ccacfdc69466b7eaf7b6844dcd892c394fb70e12524e00314298c091b21de in Pecktonville, Maryland (place 2460770): expected 253 price records and got 0. Find the change that broke each and fix the code or the registry, not the test's bound.

**Rules.** Wire to the world: a policy row without a handler is an unregistered placeholder; fix the handler or remove the row in the same change. One rule, all 56 places: the sales-tax check names its place and seed and must hold in any drawn place. A test is never loosened to pass.

**Done when.** src/core2/law-reach-group-b.test.ts passes in full on a drawn place and on seed fe0ccacfdc69466b7eaf7b6844dcd892c394fb70e12524e00314298c091b21de (Pecktonville, Maryland), with the handler count equal to the policy rows, named by policy id, and 253 price records for the sales tax in that world.

**Files.** src/core2/law-reach-group-b.test.ts, src/core2/law-reach/

**Notes.** TODO
