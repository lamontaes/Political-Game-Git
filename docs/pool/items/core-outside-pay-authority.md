---
id: core-outside-pay-authority
title: "A place's outside account carries a pay authority, so a worker's wages can be paid from it against an exact due record"
area: core
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/outside-pay-authority
pr: #5577
blocked-on:
source: "split of core-outside-wage-obligation (L), Oct 20"
claimed-at: 2026-10-20T06:35:51.262Z
---

**What.** The pay-resolution step (`resolvePublicWorkPayDue`) accepts an employer only when it holds stock or is a recorded public owner, so a private employer outside the town cannot pay a worker from the place's outside account. Give the place's outside account a pay authority in `src/core2/opening-outside-market.ts`, and let `resolvePublicWorkPayDue` accept an employer that is its own zero-stock outside owner when the authority and an exact due record are present. The wages then post on the journal from the outside account to the worker, never from nowhere.

**Rules.** Every dollar balances: the wage is a journal posting from the outside account with a due record by id, and nothing pays without one. An effect is a read, not a record: the payday step must read the authority when it pays, not merely hold it. One rule, all 56 places: the authority is built from each place's recorded outside market, no place named in code.

**Done when.** In a one-year played world (`buildBenchWorld`, a place drawn from all 56, seed named in the PR body) a worker paid by an employer that is the place's outside owner receives each wage as a journal entry from the outside account against a due record, shown by entry id and due-record id. A test beside `src/core2/public-work-pay.ts` covers an accepted outside owner and a refused employer with no authority.

**Files.** src/core2/opening-outside-market.ts, src/core2/public-work-pay.ts, src/core2/finance-cash.ts

**Notes.** Split Oct 20 from core-outside-wage-obligation (L), whose PR #5076 was sent back as a 218-file bundle. This is its first piece; the commuter job that uses it is core-commuter-job-fill-in. Build on a clean branch from main, not on claude/peaceful-ritchie-03780x.

Oct 20 (claude/outside-pay-authority): built smaller than the item thought. `resolvePublicWorkPayDue` already accepts an employer that is its own zero-stock owner with an authority, and `startJob` already adds a commitment that names the authority to its list, so the only missing piece was the authority itself: each place's outside account (`outsideMarketAccount`) now carries `governmentFacts` (the place's jurisdiction) and a `publicPayAuthority` with no commitments. `outside-pay-authority.test.ts` hires a full person to the outside account and shows the payroll ledger paid with a receipt, the account's cash still zero, the journal balanced, and a normal employer refused a commitment that names the outside authority. The commuter job that uses it is `core-commuter-job-fill-in`.
