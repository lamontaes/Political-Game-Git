---
id: world-apply-runway-both-tiers
title: "Job seekers in both tiers weigh their household money runway"
area: world
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The applying half of world-apply-and-buy-reasons-vary is implemented on PR #5812. Unemployed job seekers with shorter household money runways need work more, using one rule for named and counted residents. Track that bounded delivery separately so merging it leaves the unfinished home-buying acceptance open.

**Rules.** No dice and sliding scales: household money and living costs determine the need continuously. One model, two tiers: both application paths read the same household runway rule and filling a counted seeker in preserves the result.

**Done when.** In a drawn place named with its seed, actual unemployed seeker records in each tier show different needs for different household runways, the shorter runway higher; jobs-apply-need-varies.test.ts checks both tiers and unchanged need across fill-in, and world-apply-and-buy-reasons-vary stays open for home buying.

**Files.** src/core2/modules/jobs.ts,src/core2/jobs-apply-need-varies.test.ts

**Notes.** Bounded applying slice split by Merger 0 for PR #5812 on Oct 25; its original item remains open for the home-buying half.
