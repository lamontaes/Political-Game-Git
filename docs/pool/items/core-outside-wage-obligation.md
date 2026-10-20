---
id: core-outside-wage-obligation
title: "A private employer outside the town can pay a worker's wages from the place's outside account, against an exact due record"
area: core
kind: feature
priority: 2
size: L
status: in-pr
claimed-by: claude/peaceful-ritchie-03780x
pr: #5076
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T19:11:05.471Z
---

**What.** Work payroll can pay from an outside account only when a government's public pay authority names the commitment (src/core2/public-work-pay.ts: the employer and the zero-stock outside owner must share one government identity). A commuter who works for a private firm outside the town has no such authority, so a job at the place's outside-market account stops payroll with "Outside payment requires preparation of its actual due obligation" (src/core2/finance-plan.ts, `FinanceCashPlanner.available`). Add an outside pay authority for private employers beside the public one: a frozen record naming the outside owner, the commitments it pays and its source, resolved into an exact dated due that `authorizeOutside` accepts, so the ledger still shows every outside dollar against a named obligation. This is the missing piece for people-unplaced-outside-employer, people-unplaced-fill-in-job and world-lodes-commutes.

**Rules.** An effect is a read, not a record: payroll reads the authority at the moment it pays. Wire to the world: every dollar balances and is reported as outside money. Replace, never layer: once commuters have jobs, the place-level unplaced-wages flow is deleted by those items, not kept beside them. Core area: changes to the finance cash layer go through a core-area session.

**Done when.** In a test in src/core2 using buildBenchWorld in a drawn place (name and seed in the PR body), a jobless full person given a job at the place's outside-market account through api.startJob is paid on the payday by journal record id from the outside owner, the paycheck is withheld by the law in force, and a pay that no authority names still throws.

**Files.** src/core2/public-work-pay.ts, src/core2/finance-plan.ts, src/core2/work-payroll-cash.ts, src/core2/types.ts

**Notes.** Found Oct 19 (claude/peaceful-ritchie-03780x) trying people-unplaced-outside-employer: `api.startJob` with a commitment and calendar copied from a private worker, employer = the place's outside account, 60 days advanced; the first error was "Public pay does not match its actual owned work obligation" (a public template commitment), the second the one above.

**Built Oct 19 (claude/peaceful-ritchie-03780x).** The place's outside account now carries a pay authority (`outside-pay:<place>`, src/core2/opening-outside-market.ts), and `resolvePublicWorkPayDue` (src/core2/public-work-pay.ts) accepts an employer that is its own zero-stock outside owner in place of a matching government identity. A job started with `api.startJob` at the account, its commitment naming `publicPayAuthorityId`, is paid by the ordinary work payroll and withheld by the law in force (src/core2/outside-wage-obligation.test.ts); a commitment the authority does not name still throws "Public pay does not match its actual owned work obligation". Nothing in the opening uses it yet: people-unplaced-outside-employer is next. Orgs that carry a `publicPayAuthority` are no longer all public employers; the opening test that listed them now skips the outside account.
