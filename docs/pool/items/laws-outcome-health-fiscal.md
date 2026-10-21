---
id: laws-outcome-health-fiscal
title: "Medicaid expansion, its work requirement, universal preschool, the grocery sales-tax exemption and the sales tax reach households and sellers as a read"
area: laws
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/outcome-health-fiscal
pr: #5517
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T04:08:36.564Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO
Sent back 2026-10-20 from PR #5179 (branch claude/laws-outcome-health-fiscal): Test assertion in law-reach-group-b.test.ts was deleted/loosened and new payment loops can run vacuously with 0 iterations; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5517 (branch claude/political-game-pool-yucp92-pp): Merging current origin/main conflicts again in src/core2/law-reach/group-b.ts. Resolve that code conflict against the current Medicaid, preschool and SNAP wiring, preserving the nonempty payment-row assertions, then rerun the changed-file gate. The previous main-merge fix is present, but it no longer yields a merged result that can be checked.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5179 (branch claude/laws-outcome-health-fiscal): Merging current origin/main conflicts in code: src/core2/law-reach-group-b.test.ts, src/core2/law-reach/group-b-money.ts and src/core2/law-reach/group-b.ts. Resolve those on this branch against the current health/assistance paths, retaining nonempty payment assertions and both population tiers, then rerun changed-file checks and the required law-to-person payment chain. The stopgap-register conflict is resolvable; the code conflicts prevent gating this result.; finish on that branch, merge main into it first.
