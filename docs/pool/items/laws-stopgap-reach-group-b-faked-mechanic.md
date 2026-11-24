---
id: laws-stopgap-reach-group-b-faked-mechanic
title: "Stopgaps in reach-group-b (faked-mechanic): 2 open"
area: laws
kind: stopgap
priority: 2
status: dropped
claimed-by:
pr:
blocked-on:
after: laws-property-tax-cap-statutes, laws-groundwater-farm-use
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/laws/reach-group-b.json, kind faked-mechanic"
claimed-at: 2026-10-16T02:49:58.475Z
---

**What.** The stopgap row(s) SG-GOV-REACH-B-property-tax-bills, SG-GOV-REACH-B-business-cost in src/core2/data/laws/reach-group-b.json mark a shortcut that is still live in play. Today the assessment and tax bill read the cap law, but a yes or no catalog law still uses a generic estimated assessment cap rather than the statutory levy-versus-assessment rule, and business cost laws use a stand-in cost. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** Estimate, never UNKNOWN: a cap not yet in the data starts from the real average with a spread and a source. Wire to the world: the cap changes a bill a named owner pays. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), a property tax cap law changes the bill of a named owner through their own account and a business cost law changes a named business's payroll cost, with bill and account record ids, named by record id. The test in src/core2/property-tax-laws.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: pass a property tax cap and read the new bill on his own house. **On screen.** Nothing yet: it would show on Politics → Budgets, and nothing there reads it.

**Files.** src/core2/data/laws/reach-group-b.json, src/core2/data/stopgaps.json, src/core2/property-tax-laws.test.ts

**Notes.** First row: The existing assessment and tax bill now read the cap law and settle full and counted owners through their own accounts. A yes/no catalog law still uses a generic estimated assessment cap rather than statutory levy-versu

**Split (Oct 16).** Both rows need research the engine cannot invent: the cap statutes (`laws-property-tax-cap-statutes`) and farm water use (`laws-groundwater-farm-use`). This item is done when both rows are resolved.

Oct 20: The Oct 16 claim has no PR and is over two days old, so the claim is cleared.

Oct 20: Switched from blocked to the automatic after: gate on laws-property-tax-cap-statutes, laws-groundwater-farm-use, so it opens by itself the moment those items are done.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): roll-up of laws-property-tax-cap-statutes + laws-groundwater-farm-use; the children carry the work.

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: merge into laws-property-tax-cap-statutes. This is the roll-up of laws-property-tax-cap-statutes and laws-groundwater-farm-use ("the children carry the work", look-first audit Oct 27); its `after:` gate is those two. Both stopgap rows (SG-GOV-REACH-B-property-tax-bills and SG-GOV-REACH-B-business-cost) are open in src/core2/data/stopgaps/gov.json. The kept item takes the property-tax row; the SG-GOV-REACH-B-business-cost row (groundwater farm use) is carried by laws-groundwater-farm-use and must also close there. Stale path: src/core2/data/stopgaps.json is now src/core2/data/stopgaps/gov.json.

**Notes (CTO, Nov 10).** Dropped on Fable's pool redo proposal (`docs/pool/redo-2026-11-10/README.md`): merged into `laws-property-tax-cap-statutes`, which carries this item's remaining work.
