---
id: industry-1-wholesale-sells-beyond-its-town
title: "A wholesaler sells to buyers beyond its town, so a wholesale town keeps its main employer"
area: core
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: industries thread (Account lead)
pr: "#9627"
after: industry-0-a-utility-sells-beyond-its-town
blocked-on:
root: none
lead: jobs
model: opus
effort: medium
source: "Owner, Nov 16 01:58Z (cmsg_01TQLdz583SA7sRfRB4dFowZ3UgS4n8K2932PQhmyxdRRh: one session making the industries in the game); plan approved 02:08Z; factories-freight trace (Thief River Falls MN, place 2764570, seed ind-2764570), /mnt/project-files/account-lead/industry-law-traces/factories-freight.md"
---

**What.** Thief River Falls, Minnesota's wholesaler opens with 1,848 staff, most of the town's private jobs, and books of about $1.61 billion a year, but the town's firms and households buy about $80 million of it and nobody else buys the rest, so it lays off and closes on Jun 1, 2025 with no law passed. Seen: dev mode's Industries panel on the Calendar (Wholesale: open, staff in month 6) and the screen that lists the town's employers.

**Cause.** Found in code: `addOutsideMarket` (src/core2/opening-outside-market.ts) gives a business an outside-sales flow only when its kind has a row in src/core2/data/outside-market.json with a share above zero, and `addTradeArea` (the same file) lifts only businesses that have that flow. Wholesale had no row (the file's note: its sales to town firms are recorded routes), so where the town's firms buy less than its books, nothing does.

**Fix.** A `wholesale` row with a zero floor (its town sales are recorded routes, so no share is added on top), and `addOutsideMarket` opens the flow for every kind with a row, so the same trade-area step lifts a wholesaler to its books exactly where the town's own buyers fall short. No tuned number.

**Time box.** 2 hours, Opus, medium.

**Rules.** Wire to the world: sales come from the buyers the industry has, through the one outside account. No dice. Estimate, never unknown.

**Done when.** A test pinned to Thief River Falls MN (2764570, seed ind-2764570) shows the wholesaler's buyers meet its books at the opening and it stays open with its staff and carries no loss through its first trading month, red on the base. Year 1 and records at three places, with and without, twice a side, alternated. A second session sees at a drawn place it names with its seed that a town's wholesaler still employs its staff in month 6 (dev mode, Calendar, Industries: Wholesale's outside buyers a year).

**Waits on.** industry-0-a-utility-sells-beyond-its-town (#9579; this branch is stacked on its head 7deed8ee).

**Files.** src/core2/data/outside-market.json, src/core2/opening-outside-market.ts, src/core2/wholesale-outside-buyers.test.ts (new).
