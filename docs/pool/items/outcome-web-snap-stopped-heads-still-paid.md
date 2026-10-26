---
id: outcome-web-snap-stopped-heads-still-paid
title: "SNAP work-requirement test: a stopped head is still paid (newspaper owner, Washington DC)"
area: core
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/snap-stopped-head-paid
pr: #6180
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T20:00:51.026Z
---

**What.** src/core2/outcome-web-public-finance.test.ts 'stops the heads the law reaches after their own months' fails on clean main with PUBLIC_FINANCE_SEED=5bc87701eb9c1641: Washington, District of Columbia (1150000), person:press:outlet:newspaper:3:jurisdiction_7691c6e3ae48f824:owner:0 is stopped and still paid. Found by Merger 4 on PR 6008 merge, Oct 26. The same test passes on other seeds, so the stop and the payment disagree only for some people in some places. Find which engine pays the person after the work requirement stops them.

**Rules.** No dice; the law in force and the person's records decide who is stopped and paid; fix at the root, never skip the test.

**Done when.** The test passes in a played world built with buildBenchWorld on seed 5bc87701eb9c1641 (Washington, District of Columbia) and on two fresh drawn places named with their seeds, and the cause of the stopped-but-paid owner is named by file and line, with the record id of the payment.

**Files.** src/core2/outcome-web-public-finance.test.ts

**Notes.** Found Oct 26 by Merger 4; red on clean main.
