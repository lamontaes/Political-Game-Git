---
id: world-founded-firms-bind-supplier-terms
title: "A firm the founding engine opens carries no supplier cost terms, so its non-payroll costs are never paid to anyone"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
after:
pr: 0
blocked-on:
model: opus
effort: high
root: none
source: "World, Nov 17, 2026, found building family 10 (town size from the simulation)"
lead: world
---

**What.** A business founded after day one (the founding engine's `found`) has books with `annualOtherCostsMinor` and `costContractIds: []`. An opening firm's non-payroll costs are bound to named suppliers in its town (the supplier rule for its buyer classification, split by the suppliers' own weights); a founded firm's are not, so its supplier bill is a number no one receives. Seen: any firm founded in a played year, open its books in dev mode: no cost terms.

**Cause.** Found in code: `found()` in `src/core2/modules/business.ts` calls `api.addBusinessBooks({... costContractIds: [] ...})`; the binding exists only inside the opening's one function, `opening-finance.ts` (the per-business block around `opening-business-purchase`, which reads `data.supplierRules`, `eligibleSuppliers`, `supplierWeights` and `allocate` from that function's closure).

**Fix.** Extract that per-business block into one exported function (the opening calls it per business; `found()` calls it for the firm it opens, with the town's organizations read from the world and each term added through `api.addFinanceContract`). Replace, do not layer: the opening's copy is deleted. The new terms read from the same supplier rules, so the founded firm's suppliers are the town's own, chosen by the same weights. Check: in a drawn place over two played years, every founded firm's `costContractIds` names contracts whose payee is a firm in its town, and a supplier's receipts include the founded firm's payments by contract id.

**Time box.** 4 hours (the extraction touches `opening-finance.ts`'s tests).

**Rules.** No dice; no second contracts writer; every number stays in the supplier rule rows.

**Done when.** A second session plays two years in a drawn place in dev mode, opens a firm founded in that time, and sees cost terms naming town suppliers, and the supplier's books showing the payments (place and seed named).

**Waits on.** Nothing. Neighbors: `commercial-rent-flow` (premises and rent), which Books files, is a different cost line.

**Files.** src/core2/opening-finance.ts, src/core2/modules/business.ts
