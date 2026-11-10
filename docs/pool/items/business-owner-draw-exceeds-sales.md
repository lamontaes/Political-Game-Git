---
id: business-owner-draw-exceeds-sales
title: "An owner's draws over three years exceeded everything the business sold"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: added with npm run pool -- add
claimed-at:
lead: jobs
standard: 2
model: sonnet
effort: high
root: none
checked: fable 2026-11-10
---

**What.** In Cochituate, Massachusetts (key 2514570, seed 93a558a5898ee167fd5c49b69a4183c546da870c3754f7688faeb29392d6d4dc) organization_2e7b1494489acb56 paid its owner 198,017,107 cents over three years on 179,939,980 cents of sales received; roadmap M1-08's check fails on it. Suspected cause, not confirmed: business.ts (around 1275) takes profit from the net cash change, which counts loans and owner equity coming in, so retained profit and the draw can include borrowed money. The check itself, src/core2/tooling/m1-08-check.ts, is now in the repository (the Oct 27 note below could not find it), and it compares each owner draw in the journal with the profit the business had kept, so the worker can run it on the place and seed above and name the failing clause before changing business.ts.

**Cause.** Needs cause. Looked at: the item's own Notes (a worker on Oct 27 ran Cochituate, Massachusetts, seed above, and found no business whose owner draws exceeded its sales; draws are capped by retained profit and by cash past the payroll cushion in src/core2/modules/business.ts) and the check, which now exists at src/core2/tooling/m1-08-check.ts. Not read: how that check counts a draw (it may count the owner's wages, rent or other payments to the owner as draws).

**Fix.** None until the cause is found.

**Time box.** 2 hours for a Sonnet session: run src/core2/tooling/m1-08-check.ts on the place and seed above, name the failing clause, and rewrite this item with Found in code or Measured.

**Rules.** Wire to the world: an owner's draw is paid from profit the business's own sales earned, read from its journal entries, never from a loan or the owner's own money coming back.

**Done when.** Once the cause is found, a second session runs src/core2/tooling/m1-08-check.ts in Cochituate, Massachusetts (a drawn place, key 2514570, seed 93a558a5898ee167fd5c49b69a4183c546da870c3754f7688faeb29392d6d4dc) and sees its owner-draw clauses pass, with the cause named by line in the PR body. A test that borrows money into a business with no sales shows no draw follows.

**Waits on.** Nothing.

**Files.** src/core2/modules/business.ts, src/core2/tooling/m1-08-check.ts

**Notes.** TODO

Could not reproduce (Claude worker, Oct 27). The M1-08 check this item cites is not in the repository (`docs/roadmap/features.json` M1-08 has `command: null`; there is no `src/bench/m1-08-check.ts` or tooling file). I ran Cochituate, Massachusetts (2514570, seed 93a558a5898ee167fd5c49b69a4183c546da870c3754f7688faeb29392d6d4dc) for three years from 2025-01-02 and compared each business's owner-draw records (`business` module `draws` table, `drawnMinor`, 1,850 records) with its own `salesReceivedMinor` change: no business, including organization_2e7b1494489acb56, drew more than it sold. In this code a draw is capped by profit kept (`retained`, which `netCash` = cash plus deposits less credit principal and supplier bills makes loan-neutral, since a drawn loan adds cash and principal alike) and by cash past the payroll cushion (business.ts month(), `wanted = min(retained * share, cash - cushion)`). So the suspected loan inflation is not in the draw path. If the check counts every payment to the owner (the owner's wages, rent or other sales to the owner) as a draw, that would explain 198,017,107 against 179,939,980; the check's source is needed to say. Left open for whoever has the check's code.
