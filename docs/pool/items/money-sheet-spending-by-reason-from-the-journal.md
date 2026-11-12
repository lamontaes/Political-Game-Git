---
id: money-sheet-spending-by-reason-from-the-journal
title: "The Money sheet's where-it-went list groups every outflow of the month by the transfer's own reason, not the standing bills' latest receipts"
area: play
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage of Nov 10 (SG-BENCH-money-spending-reasons)
lead: money
standard: 2
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** The Money sheet shows where last month's money went. Today it lists only each standing bill's latest receipt and the everyday living plan; a one-off purchase, fee or gift never shows. After this item the sheet lists every outflow of the month, grouped by the reason the transfer was made. Seen: on the Money sheet's where-it-went list, one line per reason.

**Cause.** Found in code: src/bench/bank.ts:94 (stopgap SG-BENCH-money-spending-reasons) builds the list from `core.finance.latestReceiptsByContract`. The accounts engine (src/core2/accounts.ts:384 to 404) returns the transfer's `reasonKey` on its receipt but writes only postings and a source id to the cash journal, so no record of a one-off transfer's reason exists for the sheet to read.

**Fix.** In src/core2/accounts.ts keep each household transfer's `reasonKey` on its cash journal entry (one string on the row already written, nothing new scanned). In src/bench/bank.ts read the month's journal entries for the household's accounts through an index by household and month (built when the sheet opens, not a scan of the journal), group them by `reasonKey`, and delete the receipt-and-living-plan grouping and the stopgap marker and register row in the same change.

**Time box.** 4 hours for a Sonnet session.

**Rules.** Replace, never layer: the old grouping goes in the same change. A screen is a view of the records: no totals computed in the screen beyond the grouping. Speed: one string per journal row, and the sheet's read is built on open. Player text from labels, never raw reason keys (player-screen-text).

**Done when.** A second session, in a place and seed it draws, makes a one-off purchase for the player's household in the running game, opens the Money sheet next month and sees that purchase in the where-it-went list under a worded label, with the total matching the household's cash journal for the month; and `npm run speed:year` is no more than 20 percent slower than its base.

**Waits on.** Nothing.

**Files.** src/bench/bank.ts, src/core2/accounts.ts, src/core2/data/stopgaps/bench.json
