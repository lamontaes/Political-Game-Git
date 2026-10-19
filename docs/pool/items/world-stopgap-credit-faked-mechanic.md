---
id: world-stopgap-credit-faked-mechanic
title: "Stopgaps in credit (faked-mechanic): 1 open"
area: world
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/credit.ts, kind faked-mechanic"
claimed-at:
---

**What.** The stopgap row(s) SG-WORLD-credit-business-applies in src/core2/modules/credit.ts mark a shortcut that is still live in play. Today a business with no recorded owner (a public employer, an ownerless landlord) applies for a line whenever its cash is below a few months of payroll. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** No dice: the application comes from the business's books and its owner's or board's choice, never a rule that fires at a cash level. Sliding scales and causes: nothing flips at a threshold. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), an ownerless employer's line application cites its books and the board or governing body record that decided, with the credit line record id, named by record id. The test in src/core2/credit.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: see the town's landlord seek a loan and read why.

**Files.** src/core2/modules/credit.ts, src/core2/data/stopgaps.json, src/core2/credit.test.ts

**Notes.** First row: A business with no recorded owner (a public employer, an ownerless landlord) applies for a line whenever its cash is below a few months of payroll; owned businesses' owners decide.

**Built Oct 19 (claude/peaceful-ritchie-03780x).** First measured how often the fake ran: in a played year in Walthourville, Georgia (1380256), Falmouth Foreside, Maine (2324530) and Laurel Hill, Florida (1239650) there were 7, 10 and 3 line applications and none was from an ownerless business. Then `review` in src/core2/modules/credit.ts changed: a public employer (it has a pay authority) takes no business line, since its government's treasury funds it, and an ownerless business that is not public faces the reasons an owner does (need, rate and cost) as a pull from `strongestPulls`, which grows with its need instead of firing at a cash level. SG-WORLD-credit-business-applies is resolved. Not met: the done-when asks the application to cite a board or governing-body record, and no such record exists, so that question is registered as SG-WORLD-owner-decision-ownerless-credit (kind owner-decision, open). OWNER DECISIONS NEEDED: should an ownerless landlord's loan name a deciding record (a board, trustee or executor), or is the pull the whole story?
