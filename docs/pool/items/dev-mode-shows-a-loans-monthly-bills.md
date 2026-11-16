---
id: dev-mode-shows-a-loans-monthly-bills
title: "Dev mode shows each month's bill on a loan: due day, amount, the borrower's cash that morning, paid or missed"
area: play
lead: lane
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: none
source: "Owner, Nov 16 00:59Z (what a session traces by script, dev mode traces in the game); Account lead's ruling 5, 01:07Z"
checked:
---

**What.** Why a promise to pay on time broke took a script: at Ragland, Alabama the Sep 1 payment of $161 came due with the borrower at $0 and their first paycheck four days away, while the housemate held $2,169. Dev mode's Watch lists a town's loans (asked, lent, the web factor) but not one loan's months, so none of that can be read in the game. Seen: in dev mode a player opens a loan from Watch or Trace and reads, for each month, the due day, the amount billed, the borrower's cash that morning, and whether it was paid (with the payment's record id) or missed (with the missed-payment record id).

**Cause.** Found in code: the credit engine's monthly loop in src/core2/modules/credit.ts (the `open` loans query, `due`, `cashBefore = borrowerCash(...)`, the transfer `loan-payment:<loan id>:<date>` and the `credit.payment-missed` event) computes every one of these figures, but keeps only the transfer and the missed event; src/bench/ui/dev-watch.mjs shows the loans list from `/api/dev/loans` with no per-month rows.

**Fix.** Read the months back from what the engine already keeps (the `loan-payment:` journal transfers and the `credit.payment-missed` events for the loan id), adding the borrower's cash before the bill to the payment transfer's facts where it is not kept, and show them as a table under the loan when it is opened in dev mode's Trace or Watch. No second ledger. Dev mode's other half, a scene promise's life (made, due, what would keep it, what was checked, kept or broken), is the promise builder's item dev-mode-traces-a-promise; this item does not build it.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: every row names the record id that settled that month, so the trace answers why a payment was missed by record. No hand-written player text in code: the column labels come from the bench's label data.

**Done when.** A second session in dev mode, in a drawn place named with its seed and at Ragland, Alabama (seed promises-real-loan-1 draw loan:16, born 1995), opens the player's bank loan and reads the Sep 1, 2025 row: $161 due, the borrower's cash that morning $0, missed, with its credit.payment-missed record id, and the Oct 1 row paid with its loan-payment record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/credit.ts, src/bench/ui/dev-watch.mjs, src/bench/dev-trace.ts
