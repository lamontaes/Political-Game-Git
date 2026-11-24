---
id: core-finance-contracts-vs-obligations-part-1-payee-account
title: "A finance contract can pay into a fund account"
area: core
kind: cleanup
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: money
source: split from core-finance-contracts-vs-obligations in the pool redo, Nov 10, 2026
standard: 2
model: sonnet
effort: high
root: none
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-core-finance-contracts-vs-obligations-part-1-payee-account
---

**What.** Finance contracts pay between a person or organization and another, resolved through core.people or core.organizations, while group B law reach pays benefits into a counted group's fund account, which is not an owner's main account. Before group B can move onto finance contracts, a contract needs a payee account (or the fund's owner id with the fund as its settlement account). This part adds that, with its own settlement and journal source kind, and tests it on a fund payee. Feeds: core-finance-contracts-vs-obligations

**Cause.** Found in code: src/core2/finance-types.ts `FinanceContractInput` (line 7) and src/core2/finance-state.ts `admitFinanceContract` (line 464) resolve payer and payee as owners' main accounts; src/core2/law-reach/group-b-money.ts (`FUND`, line 420 `addObligation`) pays into a fund account instead.

**Fix.** Add an optional payee account to `FinanceContractInput` with its settlement and journal source kind, post through it in `admitFinanceContract`, and test it with a fund payee. Change no caller yet.

**Time box.** 3 hours for a Sonnet session.

**Rules.** Replace, never layer: the layer that loses is deleted, not kept beside the winner. Wire to the world: every household's rent and bill still posts the same dollars on the journal, shown in a played year. Speed: a year must stay within 20 percent of its base, measured on the same machine.

**Done when.** A second session, in a generated world of a drawn place (place and seed named), sees a fund payee post through a finance contract with its own journal kind, by journal record id, and a test in src/core2 fails when the payee account is ignored. No caller outside the new test uses it yet.

**Waits on.** Nothing.

**Files.** src/core2/finance-types.ts, src/core2/finance-state.ts, src/core2/finance-cash.test.ts

**Notes.** Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:56 UTC) on branch claude/pool-core-finance-contracts-vs-obligations-part-1-payee-account.

Released (2026-11-11): a builder claimed this and did not start it (its draft said so and left the claim in place); Fable B released it so another builder can take it.

Released (2026-11-11): Read and scoped, not built: the payee is resolved as an owner's main account in 62 places across finance-cash.ts (guarded plan reads), finance-plan.ts (session.cash.balance(payeeId), leg checks, payee books), finance-state.ts and finance-sales-budgets.ts; a payee account that is a fund account needs the plan session, the receipt readers and the settlement journal kind to carry it together, which is more than admitFinanceContract. First step for a builder: add the optional payeeAccountId to FinanceContractInput and thread it through finance-plan.ts's leg construction (line ~925) with a fund-payee test, before touching the cash readers. Continue on branch claude/pool-core-finance-contracts-vs-obligations-part-1-payee-account.

Released (2026-11-11): Read again, not built: plan move() resolves both ends via #owner (finance-plan.ts 762-935) with sealed replay reads and settlement readers (finance-cash.ts ~1417-1500) treat payee as an organization, so a fund payee needs owner table, guards and readers together; larger than the S box; split into owner-table registration and reader branching. Continue on branch claude/pool-core-finance-contracts-vs-obligations-part-1-payee-account.
