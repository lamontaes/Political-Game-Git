---
id: roadmap-m1-06-default-witness
title: "M1-06's check passed in Bruceville, Indiana without a single missed payment, so its default clauses were never exercised"
area: world
kind: feature
priority: 2
size: S
status: dropped
claimed-by:
pr: #6032
blocked-on:
after: roadmap-m1-economy-commands
source: added with npm run pool -- add
claimed-at:
standard: 2
model: sonnet
effort: medium
root: none
lead: m0-m2
checked: fable 2026-11-10
---

**What.** The M1-06 command passed in Bruceville, Indiana (place key 1808578, seed 0aaca669c442e4369ff7e0d87575e2330a37bd2cb8947166068aa786f1cd7637): 19 personal loans and 59 payments balanced on the journal, but no payment fell short, so the clauses on what a default does to the borrower and lender ran on nothing. Payments now fall short in every place measured (St. Paul, Texas 3; Thendara, New York 11; Four Mile Road, Alaska 43 with 6 charge-offs), so Bruceville's empty year is stale, and clause 6 was added to the check. The flag stays false until a played year shows a default with its consequences, and until the mortgage and credit-line clauses pass too.

**Cause.** Found in code: src/core2/tooling/m1-06-check.ts, clause 6 (added 2026-10-25) looks for a missed payment inside `witnessIn` (line 496) and `missedPayments` (line 390), but a redrawn default world is not checked against its own lender journal or loan balance, so a witness may have no next collection bill.

**Fix.** In the witness world, require the borrower's credit, the lender's journal and the next collection bill by record id, then flip M1-06 once the mortgage item also passes.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No dice: a default comes from the borrower's own cash and income falling short, never a rate drawn for one borrower; the real delinquency rate only checks the town's total.

**Done when.** A second session runs the M1-06 command in the runner's drawn place, or the first of up to five drawn places named with seeds where a payment falls short, and sees a missed payment and its consequences by record id (the borrower's credit, the lender's books, the next collection bill), failing when a missed payment changes nothing; docs/roadmap/features.json reads passes: true for M1-06, with a bench screenshot.

**Waits on.** Nothing for the witness clause: build it now. Only the last step, flipping M1-06 to passing, waits on roadmap-m1-06-mortgage-and-line-clauses; if that has not merged, leave the flip to it and say so.

**Files.** src/core2/tooling/m1-06-check.ts, docs/roadmap/features.json

**Notes.** TODO

2026-10-25 (claude/m1-06-default-witness): payments now fall short in every place measured (St. Paul TX 3, Thendara NY 11, Four Mile Road AK 43 with 6 charge-offs), so Bruceville's empty year is stale. Clause 6 added to M1-06. The passes: true flip is blocked by two other M1-06 failures (the mortgage payout to the seller, one credit line's journal), split to roadmap-m1-06-mortgage-and-line-clauses.

Sent back 2026-10-25 from PR #6032 (branch claude/m1-06-default-witness): a redrawn default world is not checked against its own lender journal or actual loan balance, and a witness may have no next collection bill; require those positive consequences in the witness world and keep the unfinished passes-true/screenshot acceptance open or give a completed checker-only slice its own item; finish on that branch, merge main into it first.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have waited for a played year to show a borrower defaulting for the roadmap's M1-06 check; payments already fall short in every place measured, so the check is a proof ceremony.
