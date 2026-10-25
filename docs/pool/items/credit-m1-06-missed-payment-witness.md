---
id: credit-m1-06-missed-payment-witness
title: "M1-06's check names a missed payment and every consequence on its records, in a place drawn from all 56"
area: world
kind: feature
priority: 2
size: S
status: done
claimed-by: claude/m1-06-default-witness
pr: #6032
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T20:09:14.485Z
---

**What.** The M1-06 command (src/core2/tooling/m1-06-check.ts) never showed what a missed loan payment changes, so its default clauses ran on nothing in Bruceville, Indiana. This is the checker-only slice of roadmap-m1-06-default-witness, which keeps its own passes: true and bench screenshot acceptance. A missed payment must show, by record id, that the payment goes late, that the lender was paid on its own journal only what the borrower paid, that the loan balance keeps the rest, and that the next bill collects it.

**Rules.** No dice: a default comes from the borrower's own cash and income falling short, never a rate drawn for one borrower. One rule, all 56 places: a redrawn place is held to the same journal clauses as the runner's. Wire to the world: the evidence is the journal and the loan records of the same world that supplies the witness.

**Done when.** The M1-06 command, in the runner's drawn place or the first of up to five drawn places named with seeds, accepts a short payment as its witness only when that same world's journal paid the lender exactly what the borrower paid, the loan record's balance is the replay that keeps the rest, the payment reads late, and a next bill exists for the regular payment plus the unpaid amount capped at what the loan owes, playing on until that bill is written; it fails naming the records when no short payment shows all of them, and the PR names the witness by record id with its place and seed and shows the check failing with the past-due carry removed from the bill.

**Files.** src/core2/tooling/m1-06-check.ts

**Notes.** Split Oct 25 from roadmap-m1-06-default-witness per Merger 0's send-back of PR 6032: the checker slice gets its own item; the roadmap item keeps its passes: true and screenshot acceptance, which also wait on roadmap-m1-06-mortgage-and-line-clauses.
