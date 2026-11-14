---
id: core-town-wage-and-price-questions
title: "A town has no question of its own on wages, prices or taxes, so a mayor cannot answer a bad term for jobs or prices"
area: core
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: director-term-read-areas-answered-by-one-map
source: account lead thread "Give rivals more than one issue", Nov 14 (coordinator, mayor's address after a bad term)
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** After a term where the town's jobs or prices slid, a mayor's address cannot open on them, because the mayor holds only three policy questions and the town's own budget lines, and none of them bears on jobs or prices; a challenger in a town race has nothing of their own to say on them either. Pay is answered through the welfare line. Seen: in the mayor's address at Bee Cave TX, Kingsbury NV and Medford MA (seed a7c13e) with prices sliding, which stays a policy address.

**Cause.** Found in code: `contestPositions` in src/core2/contest-positions.ts offers a town seat the entries of `PLATFORM_QUESTIONS` its level may decide plus its budget lines, and the catalog's city-level policies `law:minimum-wage` and the sales tax rate carry no `question` (src/core2/data/legislature/bill-catalog.json), so no stance question about them exists to offer; the lines a town spends on hold no jobs or prices line (the lines named in src/core2/data/budgets/line-names.json for a city carry no regional development or income security row).

**Fix.** Add stance questions, with their positions rows, for a town's own minimum wage and sales-tax rate and name them in the term read's `answeredBy` (jobs, pay, prices); make `levelMayDecide` offer them where the state lets the town act.

**Time box.** 4 hours for an Opus session.

**Rules.** One engine per mechanic: the questions join `PLATFORM_QUESTIONS` and the one map, never a second list. One rule, all 56 places: the rows name no place, and positions are researched rows that never decide an outcome.

**Done when.** A second session, in three drawn places (Bee Cave TX, Kingsbury NV and Medford MA, the draws 0 to 2 of seed a7c13e) with the town's prices sliding, reads the mayor's address on main and sees it open on prices, and the paragraph asks on one of these questions by record id.

**Waits on.** director-term-read-areas-answered-by-one-map.

**Files.** src/core2/contest-positions.ts, src/core2/campaign-data.ts, src/core2/data/legislature/bill-catalog.json, src/core2/data/term-read/areas.json

**Notes.** Filed Nov 14 with the pull request that gave the term read one map of the questions that answer each area.
