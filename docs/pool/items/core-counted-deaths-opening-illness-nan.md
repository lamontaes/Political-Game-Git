---
id: core-counted-deaths-opening-illness-nan
title: "No counted person dies for the first months: the opening's illnesses under way were never booked (a baby born since made the past-month death chance NaN)"
area: people
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #4886
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-17 from PR #4886 (branch claude/counted-deaths-opening-illness): The new counted-deaths-opening test fails on the checked head ac0b3284a3: seed 140bb7872bc46f5202d12ae8c4c52ca2364da2da170593f43aeb7f7810bd5366, Centennial, Wyoming (5613440), records 4 deaths against 11.8 expected, below the asserted 50% minimum (5.8785). This newly added test has no clean-main counterpart. Fix the generated-world opening behavior or establish and correct the test premise without weakening its assertion; preserve this seed as a regression case.; finish on that branch, merge main into it first.
