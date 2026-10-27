---
id: roadmap-m1-06-mortgage-and-line-clauses
title: "M1-06 fails on a mortgage's payout to the home's seller and on one credit line's journal, so it cannot read passing"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after: roadmap-m1-06-default-witness
source: added with npm run pool -- add
---

**What.** M1-06 (src/core2/tooling/m1-06-check.ts) fails in two of three drawn towns for reasons other than defaults. In Four Mile Road, Alaska (0226835, seed bc9b44e021f9c5be525ef539ca9ded0c982e03ed0ab1c862f32e4904374f843d) and Thendara, New York (3673495, seed dda9cc7d63ad5f78f20a3a89912368c2cf05057810c489e010858924308b2fbb), clause 1 says a mortgage's money 'did not reach the borrower', for example mortgage-loan:household_44bb4236a3b69864:2025-03-06 paid to outside-market:jurisdiction_59b4ccc532fc959f. That is the engine's design (src/core2/modules/credit.ts lendMortgage pays the seller), so the check is wrong: the seller is the recipient of the same household's down-payment entries (down-payment:<household>:<member>:<date>, src/core2/modules/housing.ts), and the mortgage should be held to that recipient. In Thendara, clause 4 says facility:organization:bank:jurisdiction_6279c0b1c71f0416:organization_3f2d1597758cbd90 holds a principal of 2,611,928 while the journal's draws less repayments give 729,784; a line opened in play on 2025-06-01, so a draw path whose journal id the check does not read (possibly the counted wage-flow draw, finance-cash.ts transferWageFlowCreditJournal) is the first lead. Until both are right M1-06 cannot read passes: true, which roadmap-m1-06-default-witness's done-when also asks for.

**Rules.** Wire to the world: the check reads what the engines wrote; it never excuses a clause. One rule, all 56 places: towns are drawn and named.

**Done when.** M1-06 passes in the runner's drawn place and in Four Mile Road and Thendara by the seeds above, with the mortgage clause reading each mortgage's seller from its down-payment entries and the credit-line clause accounting for every draw by journal id; docs/roadmap/features.json reads passes: true for M1-06, with a bench screenshot in the PR.

**Files.** src/core2/tooling/m1-06-check.ts, docs/roadmap/features.json

**Notes.** TODO
