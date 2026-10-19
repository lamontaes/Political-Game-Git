---
id: gov-outside-revenue-borrowing
title: "The federal gap is borrowed from named lenders, and interest is paid to them"
area: gov
kind: stopgap
priority: 1
size: M
status: done
claimed-by: claude/gov-outside-revenue-borrowing
pr: #4484
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-15T22:18:48.537Z
---

**What.** Each month `closeMonth` in `src/core2/modules/budgets.ts` makes the federal treasury borrow the month's gap from the outside account with no lender behind it (stopgap SG-GOV-outside-revenue-monthly, flows marked plug in `src/core2/data/outside-flows.json`). Replace the borrowing with named lenders: each month's gap is bought by lender records (households and businesses that hold securities, the central bank, foreign and institutional holders as counted groups) in shares from sourced holdings data, and the treasury's interest line pays interest back to those holders on a schedule. Interest to a holder in the town reaches that holder's cash and income like any other interest. The player would notice national debt interest reaching named savers and the Fed, and a bigger deficit raising what the interest line pays.

**Rules.** The chain is the acceptance: follow one borrowed dollar from a named lender's cash to the treasury and the interest back to a named holder, by record id; One model, two tiers: counted holders receive interest by the same rule as a full person times their count, and a full holder is consistent with their group; Research before building: holder shares come from sourced Treasury holdings data tagged SOURCED or ESTIMATED with source and spread; real data checks the totals and never picks one lender; No dice: no seeded roll picks a lender; holdings and the gap decide; One rule, all 56 places: the same engine handles every government that borrows, in all 56 places, with no place named; Estimate, never UNKNOWN: a holder share with no source starts from the national average marked ESTIMATED, never UNKNOWN; Speed: borrowing and interest settle monthly in aggregate and on the day a holding changes, never by scanning the world daily; Replace, never layer: the plug borrowing and its outside-flows row are deleted in the same change, with the count in the PR body.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): `scripts/core2-year/closures.mjs` check 6 shows the federal borrowing flows matched to lender rows (none plug), the interest paid in the year is on the journal with a named in-town holder's record id, and the dollar test balances. Tests in `src/core2/budgets.test.ts` cover a surplus month and a deficit month. The owner plays it: reads the budget screen and sees who lent the money and who was paid interest.

**Files.** src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts, src/core2/data/outside-flows.json, src/core2/data/stopgaps.json

**Notes.** Rewritten to the quality gate 2026-10-15 (the item was a stub when added with `npm run pool -- add`).
