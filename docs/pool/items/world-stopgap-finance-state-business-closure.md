---
id: world-stopgap-finance-state-business-closure
title: "Stopgaps in finance-state (business-closure): 1 open"
area: world
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/finance-state.ts, kind business-closure"
after: world-business-premises-record
claimed-at: 
---

**What.** `closeBusinessByChoice` in src/core2/finance-state.ts lets an owner close a solvent business: it pays workers their earned wages, pays supplier bills already owed, settles each open credit line from the cash left (the rest is written off) and gives the owner the remainder, but it sells no assets, so a firm's building and equipment add nothing to what lenders and the owner receive. Once world-business-premises-record gives each business premises and equipment, make the closure sell them: the premises and equipment are sold to the outside market at their recorded value less a distress discount (the discount is an ESTIMATED parameter with spread), the proceeds join the cash that pays, in order, the final wages (wage claims first, per the state's wage-claim priority), supplier bills, the lenders' credit lines, and then the owner's distribution. Premises that were leased return to the landlord with no sale. Delete the `SG-CORE-voluntary-closure-final-pay` marker when the sale is in.

**Rules.** Every dollar balances: the sale, the payments in priority order and the owner's distribution are one balanced journal entry set. An effect is a read, not a record: the closure reads the premises record and the credit engine reads the lender's recovery. No dice: the discount is a parameter and the order of payment is the law's priority, not a roll. One rule, all 56 places: the wage-claim priority is law data per jurisdiction. Replace, never layer: the no-assets path is deleted when the sale replaces it. Wire to the world: the lender, the workers and the owner each receive money by journal record id.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), an owner who closes a business by choice sells its premises and equipment by premises record id, the workers' final pay, the suppliers and the lender's credit line are paid in that order from the proceeds by journal record ids, the owner's distribution is what remains, the cash journal balances, and src/core2/finance-state-closure-sale.test.ts proves it; the row is resolved in stopgaps.json.

**Files.** src/core2/finance-state.ts, src/core2/modules/business.ts, src/core2/modules/credit.ts, src/core2/finance-state-closure-sale.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: A business closed by its owner's choice pays its workers what they've earned (counted workers at once, full workers on their next payday from cash held back) and its supplier bills already owed; an open credit line's bal

Oct 20 (pool feeder): spec written; the row says the business engine records the assets, but it records none today (no premises or equipment in business.ts), so the record is a new item, world-business-premises-record.
