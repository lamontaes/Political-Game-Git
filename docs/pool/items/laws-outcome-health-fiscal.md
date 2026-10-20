---
id: laws-outcome-health-fiscal
title: "Medicaid expansion, its work requirement, universal preschool, the grocery sales-tax exemption and the sales tax reach households and sellers as a read"
area: laws
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/outcome-health-fiscal
pr: #5517
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T13:17:23.835Z
---

**What.** Five policies in src/core2/data/laws/reach-group-b.json run the mechanic "records", so the law is written down and nothing downstream reads it: expanding Medicaid eligibility, the Medicaid work requirement, universal preschool, exempting groceries from sales tax, and the sales tax itself. Give each a payment, price or eligibility effect another engine reads, such as who is marked eligible and then served, or the tax on a grocery receipt. Counted households must be reached by the same rule as full people, times their count.

**Rules.** "An effect is a read, not a record": a policy counts only when a different engine reads it when it decides or pays. "The chain is the acceptance": follow one dollar or rule to a named person and the choice, view and journal line that moved.

**Done when.** A one-year run of buildBenchWorld in a drawn place (name and seed in the PR body) shows, for each policy here, the law record id, the payment, price or eligibility record that changed, the person record id reached and the knowing source, checked by a new test in src/core2/law-reach-balance.test.ts. The owner plays it: pass one of these laws and meet a neighbor it changed.

**Files.** src/core2/law-reach/group-b.ts, src/core2/law-reach/group-b-money.ts, src/core2/data/laws/reach-group-b.json

**Notes.** Split from laws-outcome-map (Oct 19) because the parent covers 22 policies.

Sent back 2026-10-20 from PR #5179 (branch claude/laws-outcome-health-fiscal): Test assertion in law-reach-group-b.test.ts was deleted/loosened and new payment loops can run vacuously with 0 iterations; finish on that branch, merge main into it first.
