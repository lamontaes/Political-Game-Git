---
id: laws-outcome-health-fiscal
title: "Medicaid expansion, its work requirement, universal preschool, the grocery sales-tax exemption and the sales tax reach households and sellers as a read"
area: laws
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/outcome-health-fiscal
pr: #5775
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T04:08:36.564Z
---

**What.** Five policies in src/core2/data/laws/reach-group-b.json run the mechanic "records", so the law is written down and nothing downstream reads it: expanding Medicaid eligibility, the Medicaid work requirement, universal preschool, exempting groceries from sales tax, and the sales tax itself. Give each a payment, price or eligibility effect another engine reads, such as who is marked eligible and then served, or the tax on a grocery receipt. Counted households must be reached by the same rule as full people, times their count.

**Rules.** "An effect is a read, not a record": a policy counts only when a different engine reads it when it decides or pays. "The chain is the acceptance": follow one dollar or rule to a named person and the choice, view and journal line that moved.

**Done when.** A one-year run of buildBenchWorld in a drawn place (name and seed in the PR body) shows, for each policy here, the law record id, the payment, price or eligibility record that changed, the person record id reached and the knowing source, checked by a new test in src/core2/law-reach-balance.test.ts. The owner plays it: pass one of these laws and meet a neighbor it changed.

**Files.** src/core2/law-reach/group-b.ts, src/core2/law-reach/group-b-money.ts, src/core2/data/laws/reach-group-b.json

**Notes.** Split from laws-outcome-map (Oct 19) because the parent covers 22 policies.

Sent back 2026-10-20 from PR #5179 (branch claude/laws-outcome-health-fiscal): Test assertion in law-reach-group-b.test.ts was deleted/loosened and new payment loops can run vacuously with 0 iterations; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5517 (branch claude/political-game-pool-yucp92-pp): Merging current origin/main conflicts again in src/core2/law-reach/group-b.ts. Resolve that code conflict against the current Medicaid, preschool and SNAP wiring, preserving the nonempty payment-row assertions, then rerun the changed-file gate. The previous main-merge fix is present, but it no longer yields a merged result that can be checked.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5179 (branch claude/laws-outcome-health-fiscal): Merging current origin/main conflicts in code: src/core2/law-reach-group-b.test.ts, src/core2/law-reach/group-b-money.ts and src/core2/law-reach/group-b.ts. Resolve those on this branch against the current health/assistance paths, retaining nonempty payment assertions and both population tiers, then rerun changed-file checks and the required law-to-person payment chain. The stopgap-register conflict is resolvable; the code conflicts prevent gating this result.; finish on that branch, merge main into it first.
