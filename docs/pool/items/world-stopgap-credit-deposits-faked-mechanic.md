---
id: world-stopgap-credit-deposits-faked-mechanic
title: "Stopgaps in credit-deposits (faked-mechanic): 1 open"
area: world
kind: stopgap
priority: 2
status: in-pr
claimed-by: claude/credit-deposits
pr: #5316
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/credit-deposits.ts, kind faked-mechanic"
claimed-at: 2026-10-20T14:46:29.601Z
---

**What.** The stopgap row(s) SG-WORLD-deposit-wallet-buffer in src/core2/credit-deposits.ts mark a shortcut that is still live in play. Today savings and withdrawals are reviewed monthly with a three-month wallet reserve, so extraordinary payments and estate settlement never ask the bank for a withdrawal directly. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** Wire to the world: a payment the wallet cannot cover asks the bank for a withdrawal that moves a real dollar. Sliding scales and causes: the reserve follows the household's own needs and spending, not a threshold. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), a payment larger than the wallet triggers a withdrawal at the bank, with the deposit and withdrawal record ids and balanced books, named by record id. The test in src/core2/bank-deposits.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: pay a big bill and see the bank release the savings.

**Files.** src/core2/credit-deposits.ts, src/core2/data/stopgaps.json, src/core2/bank-deposits.test.ts

**Notes.** First row: Savings and withdrawals are reviewed monthly with a three-month wallet reserve; extraordinary payments and estate settlement do not yet request bank withdrawals directly. Dormant claims remain owed, not deleted.

Sent back 2026-10-20 from PR #5316 (branch claude/deposit-withdrawal-s13): merging main now conflicts in src/core2/estates.ts (it passed every check before main moved); finish on that branch, merge main into it first.
