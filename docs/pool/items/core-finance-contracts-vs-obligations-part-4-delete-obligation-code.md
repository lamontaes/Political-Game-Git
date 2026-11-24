---
id: core-finance-contracts-vs-obligations-part-4-delete-obligation-code
title: "Delete the accounts obligation code"
area: core
kind: cleanup
priority: 2
size: S
status: open
claimed-by:
pr:
after: core-finance-contracts-vs-obligations-part-2-retirement-claims, core-finance-contracts-vs-obligations-part-3-group-b-estates-budgets
blocked-on:
lead: money
source: split from core-finance-contracts-vs-obligations in the pool redo, Nov 10, 2026
standard: 2
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** Once no engine calls the accounts layer's obligation functions, the code that remains is dead: the schedule, settleObligations, the due map and its tests, about 200 lines of src/core2/accounts.ts. Delete it in one change with its tests and the accounts.due journal kind. Show the year did not slow. Feeds: core-finance-contracts-vs-obligations

**Cause.** Found in code: src/core2/accounts.ts `addObligation` and its schedule, settle and due-map code, and src/core2/accounts.test.ts, have no caller once parts 2 and 3 land.

**Fix.** Delete the obligation code, its tests and the accounts.due kind. Run `npm run speed:year` against its base.

**Time box.** 2 hours for a Sonnet session.

**Rules.** Replace, never layer: the layer that loses is deleted, not kept beside the winner. Wire to the world: every household's rent and bill still posts the same dollars on the journal, shown in a played year. Speed: a year must stay within 20 percent of its base, measured on the same machine.

**Done when.** A second session, in a one-year run of the played world (`buildBenchWorld`, a drawn place from all 56, seed named), sees rent, a bill and a retirement claim post from the finance layer by journal record id, a search of src/core2 finds no obligation code in src/core2/accounts.ts, and `npm run speed:year` is within 20 percent of base.

**Waits on.** Parts 2 and 3 of this item merged.

**Files.** src/core2/accounts.ts, src/core2/accounts.test.ts
