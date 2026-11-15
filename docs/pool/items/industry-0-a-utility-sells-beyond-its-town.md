---
id: industry-0-a-utility-sells-beyond-its-town
title: "A town's utility sells to buyers beyond the town's households, so a plant town keeps its plant"
area: core
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: T54
pr:
after:
blocked-on:
root: none
lead: jobs
model: opus
effort: medium
source: "Account lead, Nov 15 21:52Z, from the read-only farms/mines/energy trace (Center ND, place 3813180, seed ilt-3813180); trace by T54 at /mnt/project-files/account-lead/t54-outside-sales-trace.md; owner, Nov 15 21:09Z (a town where everyone works at the power plant and it closes)"
---

**What.** Center, North Dakota's utility opens with 119 staff and books of about $185 million a year, but its only buyers are the town's household bills (about $286,000 a year), so it lays its staff off from the first month with no cause a player could find, and no energy law can act on it. Owner, Nov 15 21:09Z: "that power plant closes, and then that town" (21:09Z). Seen: the screen that lists the town's employers in month 6, with the utility still employing its staff; dev mode's Trace of its sales.

**Cause.** Found in code: `addOutsideMarket` (src/core2/opening-outside-market.ts:103) gives a business an outside-sales flow only when its kind has a row in src/core2/data/outside-market.json `shares`, and `addTradeArea` (the same file, line 221) skips any business with no outside flow. The utility kind had no row.

**Fix.** A `utility` row in outside-market.json, ESTIMATED with its spread (the non-residential share of retail electricity sales), read by the same trade-area step as every other kind. Every other kind with books has a row except wholesale (the file's note: its sales to town firms are recorded contracts) and clinic (paid by medical bills, medical-bills.ts `bookSale`).

**Time box.** 2 hours, Opus, medium.

**Rules.** Wire to the world: the utility's sales come from the buyers its industry has, through the one outside account. No dice. Estimate, never unknown: the share is an ESTIMATED row with its spread.

**Done when.** A test pinned to Center ND (3813180, seed ilt-3813180) shows the utility's buyers meet its books at the opening and its staff holds through month 6, red on the base. Year 1 and records at three places, with and without, twice a side, alternated. A second session sees at a drawn place it names with its seed that a town's utility still employs its staff in month 6.

**Waits on.** Nothing.

**Files.** src/core2/data/outside-market.json, src/core2/utility-outside-buyers.test.ts (new).
