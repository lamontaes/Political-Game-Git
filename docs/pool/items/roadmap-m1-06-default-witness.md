---
id: roadmap-m1-06-default-witness
title: "M1-06's check passed in Bruceville, Indiana without a single missed payment, so its default clauses were never exercised"
area: world
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr: #6032
blocked-on:
after: roadmap-m1-economy-commands
source: added with npm run pool -- add
claimed-at:
---

**What.** The M1-06 command (src/core2/tooling/m1-06-check.ts, PR #5876) passed in Bruceville, Indiana (place key 1808578, seed 0aaca669c442e4369ff7e0d87575e2330a37bd2cb8947166068aa786f1cd7637): 19 personal loans and 59 payments balanced on the journal, but no payment fell short, so the clauses on what a default does to the borrower and lender ran on nothing. The flag stays false until a played year shows one.

**Rules.** No dice: a default comes from the borrower's own cash and income falling short, never a rate drawn for one borrower; the real delinquency rate only checks the town's total.

**Done when.** The M1-06 command, in the runner's drawn place or the first of up to five drawn places named with seeds where a payment falls short, shows a missed payment and its consequences by record id (the borrower's credit, the lender's books, the collection) and fails when a missed payment changes nothing; M1-06 reads passes: true with a bench screenshot.

**Files.** src/core2/tooling/m1-06-check.ts

**Notes.** TODO

2026-10-25 (claude/m1-06-default-witness): payments now fall short in every place measured (St. Paul TX 3, Thendara NY 11, Four Mile Road AK 43 with 6 charge-offs), so Bruceville's empty year is stale. Clause 6 added to M1-06. The passes: true flip is blocked by two other M1-06 failures (the mortgage payout to the seller, one credit line's journal), split to roadmap-m1-06-mortgage-and-line-clauses.
