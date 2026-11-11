---
id: world-federal-cabinet-households-evicted
title: "The households of federal cabinet officials are evicted in a played year"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: none
source: found Nov 10 by the builder of the grievance record (pull request #8231)
checked: fable 2026-11-10
---

**What.** In two drawn places a played year evicted the households of federal cabinet officials, the attorney general's among them. A sitting cabinet secretary losing their home for unpaid rent in a small town is not believable, and the player can meet these people. Either they are housed in the played town when they should not be, or their pay never reaches the household that owes the rent.

**Cause.** Needs cause. Looked at: the grievance builder's report on pull request #8231. In Packwood, Washington (seed a1b2c3d4e5f60718) and Steele Creek, Alaska (seed 9f8e7d6c5b4a3921), src/core2/grievance.test.ts's one-year runs showed `housing.eviction` events (written by `remove` in src/core2/modules/housing.ts) for households of people who hold federal cabinet posts. Nobody has printed those households' rent, income and cash by month, where the officials' pay is posted (src/core2/modules/official-pay.ts), or why a federal official's household is a renter in the played town at all.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session: replay one of the two places, list each evicted household that holds a federal or state official with its lease, its rent, each month's pay received by journal record id and its cash, and say which step fails: the pay is not posted, it is posted to someone else, the rent is out of scale with the pay, or the official should not live there. Then rewrite this item with `Found in code:` or `Measured:` and a real Fix. Seen: eviction scenes and news about federal cabinet officials' households, which no real cabinet member suffers.

**Rules.** No dice. One rule, all 56 places: nothing is fixed for one town by name. Wire to the world: an official's pay is a journal payment to their own household. This is a game: fix the cause for officials the player can meet, and add no new per-person loop.

**Done when.** A second session reads the finding: for one of the two places (place and seed named) the item names each evicted official's household, the rent, the pay by journal record id and the step that failed, and the item is rewritten with its cause and a Fix. After the fix, in a drawn place, no sitting federal or state official's household is evicted in a played year unless a record explains it.

**Waits on.** Nothing.

**Files.** src/core2/modules/housing.ts, src/core2/modules/official-pay.ts, src/core2/grievance.test.ts (new)
