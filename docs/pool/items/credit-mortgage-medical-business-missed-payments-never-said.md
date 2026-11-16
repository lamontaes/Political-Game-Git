---
id: credit-mortgage-medical-business-missed-payments-never-said
title: "A missed mortgage, medical bill or business loan payment never starts a quarrel or a promise to pay on time"
area: world
lead: effects
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: "Account lead's ruling on #9517, Nov 15 18:26Z (each name that fills a line must be seen said)"
checked:
---

**What.** A housemate who quarrels over a missed payment, and holds the player to a promise to pay on time, names the payment ("You paid the loan on time. I noticed."). Only the personal loan is said in a played talk now (the payday loan was too until its played borrower stopped borrowing, pool item world-counted-households-flood-lenders-month-one), so the mortgage, the medical bill, the business loan and the payday loan were taken out of data/english/payment-words.json, and a pay-on-time promise on any unnamed kind is never said (`paymentNamed` in src/director/promise-talk.ts, checked by src/director/promise-talk-names.test.ts). Seen: a player who owns a home with a mortgage, owes a hospital, or founded a business on a loan, and falls behind on it, never hears a housemate quarrel over it, never promises to pay on time and never hears about keeping or breaking that word.

**Cause.** Measured: in the credit and housing engines at #9517's head: (1) a medical debt row is written `open: false` with no payment (`recordMedicalDebt`, src/core2/modules/credit.ts), so the monthly payment loop never bills it and it can never be missed; (2) a business loan is lent to the business, not a person (`lendForFounding`, the borrower is the organization id), and the payment loop writes `credit.payment-missed` only when the borrower is a person, so no household quarrels over it; (3) a mortgage a household opens the game with lives in the housing module's own `mortgages` table, which counts `missedMonths` when its bill is in arrears but writes no `credit.payment-missed`, so no quarrel reads it. Only a house bought in play writes a billed mortgage (`lendMortgage`), and its borrower is the household's head. Town-wide, those do get missed: in a played year from Jan 2025, seed promises-real-loan-1, 14 missed mortgage payments at Ingram, Pennsylvania (loan:11), 14 at Patillas, Puerto Rico (loan:12), 5 at Hoberg, Missouri (loan:15) and 5 at Livingston, South Carolina (loan:21). But in 24 played lives in those towns (players born 1960 to 1995), only one player's household bought (Livingston, born 1990), and its head, not the player, holds the mortgage; `quarrelOverMoney` (src/core2/modules/quarrel.ts) holds the borrower to it, so the player is never the one who promises. No played player reached a mortgage of their own in the one-hour hunt.

**Fix.** Make the housing module's arrears month on a full household's mortgage write the same `credit.payment-missed` record the credit engine writes (facts `loanId`, `loanKind: "mortgage"`), from the one place that counts `missedMonths`, so the quarrel, the promise and the talk read it with no second path. A medical bill the household is billed for monthly, and a founder's personal guarantee on a business loan, are each their own unit after that: build the mortgage first. When a played borrower is seen to miss and is held to a promise, the Words lead puts the name back in payment-words.json and the played file shows the talk said.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine: the missed-payment record is the credit engine's kind, written where the arrears are counted, never a copy kept beside it. No dice: whether a household falls behind comes from its money. A name comes back only once a played talk says it.

**Done when.** A second session plays a homeowner whose own household falls behind on its mortgage in a played world (buildBenchWorld) at a named drawn place and seed, sees the housemate's quarrel and the pay-on-time promise with their record ids, and reads the talk that names the mortgage in the pay test.

**Waits on.** Nothing.

**Files.** src/core2/modules/housing.ts, src/core2/modules/credit.ts, src/core2/modules/quarrel.ts, data/english/payment-words.json, src/director/promises.test.ts
