---
id: world-stopgap-credit-faked-mechanic
title: "Stopgaps in credit (faked-mechanic): 1 open"
area: world
kind: stopgap
priority: 2
status: in-pr
claimed-by: claude/world-stopgap-credit-faked-mechanic
pr: #5257
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/credit.ts, kind faked-mechanic"
claimed-at: 2026-10-19T23:06:26.727Z
---

**What.** The stopgap row(s) SG-WORLD-credit-business-applies in src/core2/modules/credit.ts mark a shortcut that is still live in play. Today a business with no recorded owner (a public employer, an ownerless landlord) applies for a line whenever its cash is below a few months of payroll. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** No dice: the application comes from the business's books and its owner's or board's choice, never a rule that fires at a cash level. Sliding scales and causes: nothing flips at a threshold. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), an ownerless employer's line application cites its books and the board or governing body record that decided, with the credit line record id, named by record id. The test in src/core2/credit.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: see the town's landlord seek a loan and read why.

**Files.** src/core2/modules/credit.ts, src/core2/data/stopgaps.json, src/core2/credit.test.ts

**Notes.** First row: A business with no recorded owner (a public employer, an ownerless landlord) applies for a line whenever its cash is below a few months of payroll; owned businesses' owners decide.

**Tried Oct 19 (claude/peaceful-ritchie-03780x), not built.** Measured first: in a played year in Walthourville, Georgia (1380256), Falmouth Foreside, Maine (2324530) and Laurel Hill, Florida (1239650) there were 7, 10 and 3 line applications and none was from an ownerless business, so the fake rarely runs in a played world. Then replaced it in src/core2/modules/credit.ts with the pull a counted owner faces (`strongestPulls`) and let a public employer (it has a pay authority) take no business line. Reverted: nine tests in src/core2/business.test.ts, closure-credit-line.test.ts and credit-audit.test.ts failed because their fixtures have ownerless businesses that borrow and no jobs engine to hold the pull's state ("Module has no registered state"), and `strongestPulls` is itself a registered stopgap (SG-WORLD-jobs-counted-choices), so the swap moved the fake rather than replacing it. What would close it: a deciding record for an ownerless business (a board, trustee or executor) that the application cites, which needs an owner ruling on who decides; until then the row stays open. OWNER DECISIONS NEEDED: should an ownerless landlord's loan name a deciding record?
