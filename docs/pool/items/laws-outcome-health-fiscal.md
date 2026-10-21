---
id: laws-outcome-health-fiscal
title: "Medicaid expansion, its work requirement, universal preschool, the grocery sales-tax exemption and the sales tax reach households and sellers as a read"
area: laws
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr: #5517
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Medicaid expansion, its work requirement, universal preschool and the grocery sales-tax exemption reach households and sellers as a read: an engine reads the law at the moment it pays or prices.

**Rules.** An effect is a read, not a record. One model, two tiers: counted groups are paid by the same rule as full people, times their count. No dice.

**Done when.** In a one-year played world in a drawn place (place and seed named), Medicaid expansion pays each covered named adult and each counted group through the treasury with a non-empty paid row, the work requirement ends it for those it reaches, preschool pays the household of each 3- and 4-year-old, and the grocery exemption removes the sales tax on food at the town's retail sellers.

**Files.** src/core2/law-reach/group-b-money.ts,src/core2/law-reach/group-b.ts,src/core2/modules/budgets.ts,src/core2/law-reach-group-b.test.ts

**Notes.** Oct 21 (claude): already on main, so PRs #5179 and #5517 (which carry the same Medicaid wiring and conflict with it) duplicate it and can be closed. Medicaid and preschool payments: commit 01366fe85c (group-b-money.ts `payCoverage`, preschool) and f70538f9c2 (federal match, SNAP work requirements); the federal share is now paid in a small town by PR #5770's treasury reserve. The grocery exemption is read by `syncSalesTax` in src/core2/modules/budgets.ts (`groceryExemption`, `GROCERY_SELLERS`). Checked on main: the Medicaid payment case passes pinned (Ainaloa, Hawaii, seed fc72c0ca…, with #5770) and the grocery household case in law-reach-group-b.test.ts passes in a drawn place.
Sent back 2026-10-20 from PR #5179 (branch claude/laws-outcome-health-fiscal): Test assertion in law-reach-group-b.test.ts was deleted/loosened and new payment loops can run vacuously with 0 iterations; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5517 (branch claude/political-game-pool-yucp92-pp): Merging current origin/main conflicts again in src/core2/law-reach/group-b.ts. Resolve that code conflict against the current Medicaid, preschool and SNAP wiring, preserving the nonempty payment-row assertions, then rerun the changed-file gate. The previous main-merge fix is present, but it no longer yields a merged result that can be checked.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5179 (branch claude/laws-outcome-health-fiscal): Merging current origin/main conflicts in code: src/core2/law-reach-group-b.test.ts, src/core2/law-reach/group-b-money.ts and src/core2/law-reach/group-b.ts. Resolve those on this branch against the current health/assistance paths, retaining nonempty payment assertions and both population tiers, then rerun changed-file checks and the required law-to-person payment chain. The stopgap-register conflict is resolvable; the code conflicts prevent gating this result.; finish on that branch, merge main into it first.
