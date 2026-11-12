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
effort: low
root: none
checked: fable 2026-11-10
---

**What.** In Cochituate, Massachusetts (key 2514570, seed 93a558a5898ee167fd5c49b69a4183c546da870c3754f7688faeb29392d6d4dc) organization_2e7b1494489acb56 paid its owner 198,017,107 cents over three years on 179,939,980 cents of sales received; roadmap M1-08's check fails on it. Suspected cause, not confirmed: business.ts (around 1275) takes profit from the net cash change, which counts loans and owner equity coming in, so retained profit and the draw can include borrowed money. The check itself, src/core2/tooling/m1-08-check.ts, is now in the repository (the Oct 27 note below could not find it), and it compares each owner draw in the journal with the profit the business had kept, so the worker can run it on the place and seed above and name the failing clause before changing business.ts. Seen: an owner's pay and the business's books in the town's money numbers, where a draw larger than the sales is a wrong result.

**Cause.** Found in code: campaigns pay businesses for polls and mail without booking it as the seller's sales. Measured: `GOLDEN_PATH_SEED=93a558a5898ee167fd5c49b69a4183c546da870c3754f7688faeb29392d6d4dc GOLDEN_PATH_PLACE_KEY=2514570 node --import tsx src/core2/tooling/m1-08-check.ts` on main 061eda78 exits 1 with one failure: "organization_2e7b1494489acb56: drew 559015424 over the run on 396713235 of sales received in it". The per-draw clause passes: no draw was larger than the profit kept. With a journal trace outside the repository, the firm (Cochituate Campaign Works, kind professional) took only outside sales in its first 6 months ($923,192 in, $153,616 drawn). From month 6 to 24 it took $1,828,133 of outside sales and $5,927,175 for polls plus $128,410 for mail from campaigns, on the journal kind `campaigns:purchase`. Its book's `salesReceivedMinor` rose only by the outside sales. `spend` in src/core2/modules/campaigns.ts (about line 3591) posts the payment to the seller's account but never adds it to the seller's book, unlike the other sellers' paths (src/core2/press-money.ts line 175, src/core2/medical-bills.ts line 656). Profit in src/core2/modules/business.ts is the change in net cash (`netCash`, line 322), so the draw rightly follows the campaigns' money, and the books understate the firm's sales. The Oct 27 note's loan suspicion is ruled out: net cash nets loans out.

**Fix.** In `spend` (src/core2/modules/campaigns.ts), when the seller keeps business books (`core.finance.businesses.get(sellerId)`), add the amount to that book's `receivedMinor` and `salesReceivedMinor`, as src/core2/press-money.ts does for an outlet's sales. Count each payment once: if a press outlet's book already takes campaign ads through press-money, leave `ad` purchases to that path. Add a test in src/core2: a campaign that buys a poll from a town business raises that business's `salesReceivedMinor` by the price, by money record id. Then rerun src/core2/tooling/m1-08-check.ts in Cochituate.

**Time box.** 1.5 hours for one Sonnet session; the check's three years take about 15 minutes. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: an owner's draw is paid from profit the business's own sales earned, read from its journal entries, never from a loan or the owner's own money coming back.

**Done when.** A second session runs src/core2/tooling/m1-08-check.ts in Cochituate, Massachusetts (a drawn place, key 2514570, seed 93a558a5898ee167fd5c49b69a4183c546da870c3754f7688faeb29392d6d4dc) and in one fresh drawn place with a campaign season (seed named), and sees its owner-draw clauses pass in each. A test shows a campaign's purchase from a business counted in that business's sales by record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/press-money.ts, src/core2/modules/business.ts, src/core2/tooling/m1-08-check.ts

**Notes.** TODO

Could not reproduce (Claude worker, Oct 27). The M1-08 check this item cites is not in the repository (`docs/roadmap/features.json` M1-08 has `command: null`; there is no `src/bench/m1-08-check.ts` or tooling file). I ran Cochituate, Massachusetts (2514570, seed 93a558a5898ee167fd5c49b69a4183c546da870c3754f7688faeb29392d6d4dc) for three years from 2025-01-02 and compared each business's owner-draw records (`business` module `draws` table, `drawnMinor`, 1,850 records) with its own `salesReceivedMinor` change: no business, including organization_2e7b1494489acb56, drew more than it sold. In this code a draw is capped by profit kept (`retained`, which `netCash` = cash plus deposits less credit principal and supplier bills makes loan-neutral, since a drawn loan adds cash and principal alike) and by cash past the payroll cushion (business.ts month(), `wanted = min(retained * share, cash - cushion)`). So the suspected loan inflation is not in the draw path. If the check counts every payment to the owner (the owner's wages, rent or other sales to the owner) as a draw, that would explain 198,017,107 against 179,939,980; the check's source is needed to say. Left open for whoever has the check's code.

Nov 11 (cause finder for Fable B): reproduced with the check, now in the repository, and traced the firm's journal inflows over two years with a trace outside the repository. The owner's draws come from real money, campaigns buying polls and mail, but that money never reaches the firm's sales on its books. The fix books campaign purchases as the seller's sales.
