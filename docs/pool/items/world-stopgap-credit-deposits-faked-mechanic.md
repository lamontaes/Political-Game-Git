---
id: world-stopgap-credit-deposits-faked-mechanic
title: "Stopgaps in credit-deposits (faked-mechanic): 1 open"
area: world
kind: stopgap
priority: 2
status: dropped
standard: 2
claimed-by:
pr: #5316
after:
blocked-on:
lead: money
model: sonnet
effort: medium
root: none
milestone:
source: "src/core2/data/stopgaps.json, src/core2/credit-deposits.ts, kind faked-mechanic"
claimed-at:
size: S
checked: fable 2026-11-10
---

**What.** Savings and withdrawals are reviewed monthly with a three-month wallet reserve, so extraordinary payments and estate settlement never ask the bank for a withdrawal directly. A payment the wallet cannot cover should ask the bank for a withdrawal that moves a real dollar, with the reserve following the household's own spending. The estate-only slice was sent back, and a big payment still never asks the bank. The row stays open until the real mechanic replaces the fake, and this item replaces it and clears the row.

**Cause.** Found in code: `reviewBankDeposits` in src/core2/credit-deposits.ts (line 30) calls stopgap("SG-WORLD-deposit-wallet-buffer") and keeps a wallet of `creditDepositWalletMonths` months of costs; the row is open in src/core2/data/stopgaps/world.json.

**Fix.** Make a payment the wallet cannot cover ask the bank for a withdrawal that moves a real dollar, with the reserve following the household's own spending, and resolve the stopgap row.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: a payment the wallet cannot cover asks the bank for a withdrawal that moves a real dollar. Sliding scales and causes: the reserve follows the household's own needs and spending, not a threshold. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** A second session, on main in a drawn place (place and seed named in the PR body), plays a year in dev mode, pays a bill larger than a household's wallet, and sees a withdrawal at the bank with the deposit and withdrawal record ids and balanced books. The test in src/core2/bank-deposits.test.ts and the stopgap tripwire test show SG-WORLD-deposit-wallet-buffer resolved.

**Waits on.** Nothing.

**Files.** src/core2/credit-deposits.ts, src/core2/data/stopgaps/world.json, src/core2/bank-deposits.test.ts

**Notes.** First row: Savings and withdrawals are reviewed monthly with a three-month wallet reserve; extraordinary payments and estate settlement do not yet request bank withdrawals directly. Dormant claims remain owed, not deleted.

Sent back 2026-10-20 from PR #5316 (branch claude/deposit-withdrawal-s13): merging main now conflicts in src/core2/estates.ts (it passed every check before main moved); finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5316 (branch claude/deposit-withdrawal-s13): The body explicitly says no played-year proof was completed. The item requires a drawn one-year buildBenchWorld, a payment larger than the wallet causing a bank withdrawal, deposit/withdrawal ids and balanced books, and the owner big-bill path. The unit estate fixture and a partially narrowed stopgap do not complete that acceptance. Finish the named proof or split the completed estate-specific scope from the still-open larger-payment item.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5316 (branch claude/deposit-withdrawal-s13): the Done-when table explicitly leaves the annual withdrawal and stopgap-resolution acceptance unproved; the estate-only slice needs its own valid item with generated-world reader evidence; finish on that branch, merge main into it first.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have made a payment ask the bank for a withdrawal; the wallet reserve already pays and no player sees the bank leg.
