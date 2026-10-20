---
id: core-stopgap-outcome-web-faked-mechanic
title: "Stopgaps in outcome-web (faked-mechanic): 1 open"
area: core
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
after: world-outcome-links-sizes, core-outcome-causes-recorded, core-outcome-produced
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/outcome-web.ts, kind faked-mechanic"
claimed-at:
---

**What.** The stopgap row(s) SG-WEB-outcome-drift in src/core2/modules/outcome-web.ts mark a shortcut that is still live in play. Today each outcome the web keeps (crime, schooling, coverage, turnout and the rest) stays at its place's real starting level except where a researched link moves it. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** An effect is a read, not a record: each outcome is moved by another engine's record and read by views, budgets, news or a screen. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), one kept outcome moves after a law or a budget line changes, with the moving record and its reader named, named by record id. The test in src/core2/outcome-web.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: raise the schools budget and see schooling in the town's numbers move a year later.

**Files.** src/core2/modules/outcome-web.ts, src/core2/outcome-web-model.ts, src/core2/data/stopgaps.json, src/core2/outcome-web.test.ts

**Notes.** First row: Each outcome the web keeps (crime, schooling, coverage, turnout and the rest) stays at its place's real starting level except where a researched link moves it; nothing else in the world moves it.

**Split (Oct 15).** The row says every kept outcome needs the engines that cause it. The web already has 101 built links (72 from laws, and budget, labor, school and crime causes) and tests that a layoff moves burglary and a SNAP work rule moves receipt. What is left is the 120 links that are not built: `world-outcome-links-sizes`, `core-outcome-causes-recorded`, `core-outcome-produced`. About 36 more are about zero and need no work. The row closes when those three are done and society-wide shifts come from recorded causes rather than a monthly chance; the crime-engine question for the owner is `owner-crime-engine`.

Oct 20: The Oct 15 claim has no PR and is over two days old, so the claim is cleared.

Oct 20: Switched from blocked to the automatic after: gate on world-outcome-links-sizes, core-outcome-causes-recorded, core-outcome-produced, so it opens by itself the moment those items are done.
