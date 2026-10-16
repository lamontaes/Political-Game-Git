---
id: gov-stopgap-press-faked-mechanic
title: "Stopgaps in press (faked-mechanic): 2 open"
area: gov
kind: stopgap
priority: 2
status: done
claimed-by:
pr: #4596
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/press.ts, kind faked-mechanic"
claimed-at:
---

**What.** Two faked-mechanic stopgaps remain in `press.ts`. SG-PEOPLE-press-outlet-revenue: an outlet's revenue is one standing monthly payment from the town's outside customers, sized at the opening, with local businesses buying no ads and the payment not following the audience. SG-PEOPLE-press-staff-turnover: independent replacement hiring was removed, and no hire has yet been followed from the jobs engine to the desk in a played year. Make the outlet earn from its audience's subscriptions and from local businesses that choose to advertise, and have the jobs engine's hire reach the masthead. The player would notice a paper that shrinks when readers leave and replaces a reporter who quits.

**Rules.** No dice: advertising and subscriptions follow readers' choices and businesses' cash and goals, never a fixed payment; The chain is the acceptance: follow one ad dollar from a named business to the outlet's books to a reporter's pay, and one hire from the jobs engine to the desk; An effect is a read, not a record: the masthead reads real employment and the revenue reads the audience at payment time; One model, two tiers: the counted audience subscribes by the same rule as a full reader times their count; Placeholders: both rows close only when the mechanism is shown; Replace, never layer: the standing outside payment is deleted in the same change; Estimate, never UNKNOWN: an ad price with no source starts from the real average marked ESTIMATED with spread; Speed: revenue settles monthly from the audience count, not per-reader daily.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): an outlet's revenue in the year rises and falls with its audience and includes a named local business's ad payment, and a reporter who leaves is replaced through a jobs hire that appears on the masthead (outlet, business, hire ids named). Tests in `src/core2/press.test.ts` (and a new `src/core2/press-money.test.ts`). The owner plays it: sees a local paper run an ad from a shop he knows.

**Files.** src/core2/modules/press.ts, src/core2/press-money.ts, src/core2/press-staff.ts, src/core2/data/press/parameters.json, src/core2/data/stopgaps.json

**Notes.** First row: An outlet's revenue (its audience's subscriptions and the advertising they see) is one standing monthly payment from the town's outside customers, sized at the opening from its audience and an estimated amount per follow

Sent back 2026-10-16 from PR #4596 (branch claude/gov-stopgap-press-faked-mechanic): Sent back by the merger: morning check: the diff deletes a row from src/core2/data/stopgaps.json. A built stopgap stays in the file with status resolved and a note on what replaced it; a deleted row is refused. Restore the row as resolved, merge main, push; finish on that branch, merge main into it first.
