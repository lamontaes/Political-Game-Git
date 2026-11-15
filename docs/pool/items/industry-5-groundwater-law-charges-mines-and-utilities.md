---
id: industry-5-groundwater-law-charges-mines-and-utilities
title: "The groundwater law charges mines and utilities as its reach row says, not only farms"
area: core
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: industry-4-farm-jobs-in-farm-counties
blocked-on:
root: none
lead: jobs
model: sonnet
effort: medium
source: "owner, Nov 15 21:09Z (industries, coal and farms, a town at one plant that closes, people leaving; most of it probably built); Account lead's rulings 21:15Z; survey by T54 at /mnt/project-files/account-lead/t54-industry-gaps.md"
---

**What.** The groundwater withdrawal cap's reach row names farms, mines and utilities (src/core2/data/laws/reach-group-b.json, groundwater-allocation), but only farms pay anything (survey: /mnt/project-files/account-lead/t54-industry-gaps.md, gap 6). A mine or a power plant that pumps groundwater is untouched. Seen: dev mode's Trace of the groundwater law lists farms only.

**Cause.** Found in code: `readGroundwaterLaw` (src/core2/modules/business.ts:1253) skips any business whose classification is not `enterprise:agriculture`.

**Fix.** The reader takes the classifications from the reach row instead of naming agriculture, and a mine or utility pays the withdrawal limit as a compliance cost by the existing `addRegulatoryCost` route, with an ESTIMATED share of costs labeled from memory, with spread. Farms keep their production limit.

**Time box.** 2 hours, Sonnet, medium.

**Rules.** Wire to the world: the cost reaches a named mine's books and, through losses, its staff. One rule, all 56 places. Estimate, never UNKNOWN.

**Done when.** At Gillette WY and two named places with seeds, the law in force charges the mine and the utility by record id; year 1 and time per record at three places with and without, twice a side, alternated. A second session sees in dev mode at a drawn place it names with its seed the groundwater law's "What came of it" naming a mine or utility.

**Waits on.** industry-4 in the order.

**Files.** src/core2/modules/business.ts and its test.
