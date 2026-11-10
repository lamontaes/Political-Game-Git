---
id: world-closure-sells-premises-and-equipment
title: "A business closed by its owner sells its building and equipment before the lenders and the owner are paid"
area: world
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: world-business-premises-record
blocked-on:
lead: jobs
model: opus
effort: medium
root: none
source: stand-in triage Nov 10; stopgap SG-CORE-voluntary-closure-final-pay (its earlier item world-stopgap-finance-state-business-closure was dropped Oct 25)
---

**What.** When an owner closes a solvent business by choice, the workers get their earned pay, the supplier bills owed are paid, each credit line is settled from the cash left and the owner takes the rest. No assets are sold, so a firm's building and equipment add nothing for lenders or the owner. Make the closure sell the premises and equipment to the outside market at their recorded value less a distress discount, put the proceeds in the pool of cash that pays final wages, then suppliers, then lenders, then the owner. Leased premises return to the landlord with no sale.

**Cause.** Found in code: `closeBusinessByChoice` in src/core2/finance-state.ts (marker `api.stopgap("SG-CORE-voluntary-closure-final-pay")` at line 1937); it settles wages, bills and credit lines from cash held only, and the business engine keeps no premises or equipment record yet (item world-business-premises-record).

**Fix.** Reuse what exists; add no sale or ledger path of its own. After the premises record exists, read each closing business's premises and equipment and sell them with `sellHome` in src/core2/housing-sale.ts (extend it to take a business's premises, as it already takes a counted household's home) at the distress discount, an ESTIMATED parameter with a spread. Pay the proceeds out through `transfer` in src/core2/accounts.ts into the closure's existing claims, in the state's wage-claim priority order. One balanced journal set. It runs only on the day of a closure, so it costs nothing in a normal year.

**Time box.** 5 hours for one opus session.

**Rules.** Wire to the world: the lender, the workers and the owner each receive money by journal record id. An effect is a read: the credit engine reads the lender's recovery. No dice: the discount is a parameter and the order is the law's priority. One rule, all 56 places: the wage-claim priority is law data per jurisdiction. Replace, never layer: the no-assets path is deleted.

**Done when.** In a one-year run of buildBenchWorld in a place drawn from all 56 (name the place and seed), an owner who closes a business sells its premises and equipment by premises record id, final wages, suppliers and the lender are paid in that order by journal ids, the owner's distribution is what is left and the journal balances; a second session sees the same on main in another place and seed, and the register row is resolved.

**Waits on.** world-business-premises-record.

**Files.** src/core2/finance-state.ts, src/core2/modules/business.ts, src/core2/modules/credit.ts, src/core2/data/stopgaps/core.json
