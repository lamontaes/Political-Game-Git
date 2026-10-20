---
id: core-stopgap-parameters-authored-finance-policy
title: "Stopgaps in parameters (authored-finance-policy): 1 open"
area: core
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/stopgap-finance-policy
pr: #5375
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/parameters.json, kind authored-finance-policy"
claimed-at: 2026-10-20T00:39:28.602Z
---

**What.** Replace or clear the 1 open authored-finance-policy stopgap row(s) in src/core2/data/parameters.json: SG-P8-business-books-credit-policy. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/parameters.json

**Notes.** First row: Partial finite facility draws, cash-surplus repayment policy and primary binding-shortage labels. A plan's closing evidence is not an executed closure or loan approval.

Oct 20 (claude/stopgap-finance-policy): partial. `planBusinessFunding` and its reason strings were an unused pure calculator (no caller outside its own tests) and are deleted. The row stays open because `finishFinanceDay` in src/core2/finance-state.ts still repays each borrower's facilities from half of its cash (`businessRepaymentShare`, TUNABLE); that authored policy needs a repayment decision from the firm's need, the lender's terms and claim priority.
