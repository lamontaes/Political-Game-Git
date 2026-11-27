---
id: world-press-owners-no-income-evicted
title: "A press outlet's owner has a wealthy household's living cost and no income, so a housed owner runs out of savings and is evicted within the year"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: people
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** Every press outlet's owner is given the savings and living cost of a wealthy household (world-press-outlet-owners-no-household), but nothing pays them: an owner is on no payroll, and the outlet they own never hands them its earnings. Once the housing engine houses them, their savings run out and they are evicted. In a played year at Washington, D.C. (1150000, drawPlace("talkmerge3:0", "told-talk")), five owners were removed: the television owners of outlets 0, 1 and 3, the newspaper owner of outlet 2 and the radio owner of outlet 1, owing about $8,150 each. Seen: an eviction notice and removal for a newspaper, radio or television owner in the town's news and housing records.

**Cause.** Measured: Washington, D.C. (1150000), seed talkmerge3:0, a year of buildBenchWorld on history/journal-chain 63124326. Removed: household:person:press:outlet:television:3:jurisdiction_7691c6e3ae48f824:owner:0 on 2025-07-26 (owed 815,664 cents), :newspaper:2:...:owner:0 on 2025-09-25, :television:1:...:owner:0 on 2025-10-26, :radio:1:...:owner:0 and :television:0:...:owner:0 on 2025-11-26. Found in code: src/core2/press-staff.ts, the staff builder: an owner's role has no pay (pay null), so no payPostFromOutside or startPublicJob runs for them, while giveLivingCost gives them a living cost at ownerHouseholdIncomeMinor and the savings a family at that income keeps; src/core2/modules/press.ts spends that cost each month (spendLivingCost). Nothing pays the owner from the outlet's account.

**Fix.** Pay each outlet's owner from the outlet's own account, as a business owner's draw: in src/core2/modules/press.ts, on the outlet's monthly books, pay the owner what the outlet earned beyond its costs (a share of its profit, never more than it holds), as a journal payment from the outlet to the owner with the outlet's books as its source. Where the outlet loses money the owner takes nothing that month. Estimate the share from research (the share of a small business's net income its owner draws), marked ESTIMATED with its source and spread. Read how the outlet's revenue and costs are kept before writing it, and add no new money engine.

**Time box.** 3 hours

**Rules.** No dice: the draw follows the outlet's own books. Everything comes from the simulation: research sets only the share, never the amount. One rule, all 56 places. Wire to the world: the draw is a journal payment from the outlet to the owner.

**Done when.** A second session plays a year at Washington, D.C. (seed talkmerge3:0, drawn with "told-talk") and at one fresh drawn place (named, with its seed). No press outlet owner's household is evicted. Each owner's account shows a monthly draw from their outlet by record id in a month the outlet earned more than it spent, and none in a month it lost money.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts, src/core2/press-staff.ts, src/core2/official-living.ts, src/core2/press-owner-household.test.ts
