---
id: industry-3-energy-laws-reach-the-towns-plant-and-mines
title: "Energy laws reach the town's power plant and mines, and coal is its own kind"
area: core
kind: feature
priority: 1
size: L
status: open
standard: 2
claimed-by:
pr:
after: industry-2-a-towns-job-losses-make-people-leave
blocked-on:
root: none
lead: jobs
model: opus
effort: medium
source: "owner, Nov 15 21:09Z (industries, coal and farms, a town at one plant that closes, people leaving; most of it probably built); Account lead's rulings 21:15Z; survey by T54 at /mnt/project-files/account-lead/t54-industry-gaps.md"
---

**What.** Nothing in the game affects the coal industry: the clean electricity standard, the carbon price and the fuel price share pay the town's outside account, the federal power-plant carbon limit only moves emissions and particulates, and coal, oil, gas and gravel are one kind, "quarry" (survey: /mnt/project-files/account-lead/t54-industry-gaps.md, gaps 3 and 4). Owner, Nov 15 21:09Z: "if there are no laws for it that affect it... just say that". Seen: dev mode's Trace of an energy law, which ends at the outside account and never at a business in town.

**Cause.** Found in code: `readPriceLaws` (src/core2/modules/place-prices.ts, about line 1126) names no payee for the energy rules from `energyPriceRule` (place-prices.ts:1100), so the settlement pays the outside account; the power-plant carbon limit has only effect web links (data/research/outcome-web/links.json, power-plant-carbon-to-emissions and -to-particulates) and no duty in `BUSINESS_DUTIES` (src/core2/modules/business.ts:1352); NAICS 21 maps to one kind (`SECTOR_WORKPLACES`, src/core2/town-employment-mix.ts).

**Fix.** Three parts, one pull request each:

1. Money that now goes to the outside account for electricity goes to the town's utility where it has one, and fuel to a fuel seller in town where it has one (with jobs-2); the outside account shrinks and gains no second path.
2. The power-plant carbon limit is a duty on utilities that burn fossil fuel, by the same `BUSINESS_DUTIES` route, with an ESTIMATED share of costs labeled from memory, with spread.
3. Mining splits only as far as the laws need: coal apart from the rest. The coal kind's outside sales follow the power-plant rules in force (its sector demand falls when the limit binds), so a coal county's mine loses sales.

**Time box.** 8 hours over three pull requests, Opus, medium.

**Rules.** Wire to the world: each law's dollar is followed to a business in town and its workers. Estimate, never UNKNOWN: the duty's share is ESTIMATED with its spread. One engine: the price, duty and macro engines do the work. Replace, never layer.

**Done when.** At Logan WV, Gillette WY and a third named place with seeds, each energy law's dollar is followed by record id to the business it reaches, and a power-plant limit is followed to the coal mine's sales and its layoffs; year 1 and time per record at three places with and without, twice a side, alternated. A second session sees in dev mode at a drawn place it names with its seed the law's "What came of it" line naming the business.

**Waits on.** industry-2.

**Files.** src/core2/modules/place-prices.ts, src/core2/modules/business.ts, src/core2/town-employment-mix.ts, src/core2/data/business-books.json, src/core2/modules/macro.ts.
