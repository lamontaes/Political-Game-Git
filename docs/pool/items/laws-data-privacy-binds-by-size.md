---
id: laws-data-privacy-binds-by-size
title: "A data privacy law binds only businesses as large as the statute names, not every employer in town"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: "owner, Nov 16, 2026, 01:58Z (effects session: laws that reach industries wrongly); plan approved 02:08Z, item 3"
model: opus
effort: medium
root: none
---

**What.** A state or national consumer data privacy law charged every employing business in town a yearly compliance cost, down to a barber shop or a two-person repair shop. Real privacy statutes bind only large data holders: California's a business over $25 million in yearly revenue, Virginia's and most later states' a business holding the data of 100,000 consumers. So in a small town the law reached businesses it never would, and their owners joined groups to fight a bill that would not touch them. Seen: dev mode's reach of a data privacy law (who the law reached), which listed every employer in town.

**Cause.** Found in code: `readBusinessDuty` in src/core2/modules/business.ts binds every employing enterprise with other operating costs, with no size test, and `businessDataPrivacyCostYear` (read by interest-groups.ts for a business's stake in the bill) charges any business its share. Measured: at Pierre, South Dakota (place 4649600), seed ilt-pierre, the law bound 14 businesses, 10 of them under $25 million in yearly sales.

**Fix.** A parameter row, businessDataPrivacyMinSalesMinor (role law, ESTIMATED with spread), is the statute's size test. The duty reader and the stake reader both skip a business whose yearly sales are under it, for the state and the national law alike.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN: the size test is an ESTIMATED row with its spread and citation. Wire to the world: the one duty reader and the one stake reader read it, and no second path is added.

**Done when.** A second session in a drawn place (named, with its seed) passes a state data privacy law through dev mode, runs a month, and sees on the bill card's reach only the town's businesses over the size test (none in a town without one), and the twin's Industries check showing cost only at those businesses.

**Waits on.** Nothing.

**Files.** src/core2/modules/business.ts, src/core2/modules/interest-groups.ts, src/core2/data/business/parameters.json, src/core2/data-privacy-law.test.ts, src/core2/federal-data-privacy-law.test.ts, src/core2/data-privacy-stake.test.ts

**Notes.** Effects thread, Nov 16, 2026. data-privacy-law.test.ts and federal-data-privacy-law.test.ts drew their place at run time and expected some employer bound anywhere; with the size test most small towns bind none, so both are pinned to Pierre, South Dakota.
