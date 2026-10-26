---
id: outcome-web-snap-stopped-heads-still-paid
title: "SNAP work-requirement test: a stopped head is still paid (newspaper owner, Washington DC)"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/outcome-web-public-finance.test.ts 'stops the heads the law reaches after their own months' fails on clean main with PUBLIC_FINANCE_SEED=5bc87701eb9c1641: Washington, District of Columbia (1150000), person:press:outlet:newspaper:3:jurisdiction_7691c6e3ae48f824:owner:0 is stopped and still paid. Found by Merger 4 on PR 6008 merge, Oct 26.

**Rules.** No dice; the law in force and the person's records decide who is stopped and paid; fix at the root, never skip the test.

**Done when.** The test passes on that seed and on two fresh drawn seeds, named with places; the cause is named by file and line.

**Files.** src/core2/outcome-web-public-finance.test.ts

**Notes.** TODO
