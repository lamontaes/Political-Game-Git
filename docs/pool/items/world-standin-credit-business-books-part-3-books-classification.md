---
id: world-standin-credit-business-books-part-3-books-classification
title: "Business books carry a recorded legal form and funding route, read by the credit engine"
area: world
kind: stopgap
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: money
model: opus
effort: medium
root: none
source: split from world-standin-credit-business-books in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** The business books keep an authored crosswalk from workplace classifications to corporate industry priors and excluded institutional funding routes, with no legal form, supplier relationship or budget established. Record industry and legal form (corporation, branch, nonprofit, public) and the funding route for actual employers and counterparties, including public, branch and nonprofit budgets, and let the credit engine read the classified book. This is the third of three parts of world-standin-credit-business-books.

**Cause.** Found in code: src/core2/data/business-books.json (line 259) carries stopgapId SG-P8-business-books-classification, the authored crosswalk from workplace classifications to industry priors, and src/core2/business-books.test.ts (line 118) asserts it; the row is open in src/core2/data/stopgaps/p8.json.

**Fix.** Add a legal form and funding route to each employer and counterparty record, replace the authored classification crosswalk with a read of those records, and resolve the stopgap row.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the credit engine reads the classified book when it decides. Replace, never layer: the crosswalk is deleted when the records replace it. One rule, all 56 places: classifications are data, never a named place. Estimate, never UNKNOWN: an employer with no recorded form takes the industry's modal form marked ESTIMATED.

**Done when.** A second session, on main in a drawn place from all 56 (place and seed named), plays a year in dev mode and opens a business, a nonprofit and a public employer: each shows a legal form and a funding route by record id, and the credit engine's decision on a credit line cites the classified book. A test in src/core2/business-books.test.ts names the place and seed, and SG-P8-business-books-classification is resolved.

**Waits on.** Nothing.

**Files.** src/core2/data/business-books.json, src/core2/business-books.test.ts, src/core2/modules/credit.ts, src/core2/data/stopgaps/p8.json

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have recorded each business's legal form and funding route; no player sees it.
