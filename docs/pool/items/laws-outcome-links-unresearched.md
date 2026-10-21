---
id: laws-outcome-links-unresearched
title: "Research outcome-web links for the 27 laws that move no outcome"
area: laws
kind: research
priority: 2
size: M
status: in-pr
claimed-by: claude/outcome-links-research
pr: #5653
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T10:04:05.886Z
---

**What.** Twenty-seven laws reach people and move money but move no outcome-web measure, because no researched link starts from the law or from a measure an engine sets from it. src/core2/data/laws/outcome-research-gaps.json lists each law with the outcome its research would measure. Research each link's strength, shape and lag from the literature and add it to links.json, then build it in the outcome web.

**Rules.** Research before building: each link cites its source, with size and spread, and real rates check totals. An effect is a read: the web reads the law or its measure, and the outcome moves for full and counted people alike.

**Done when.** For each law in outcome-research-gaps.json, a built link in data/research/outcome-web/links.json moves its measure in a buildBenchWorld played year in a drawn place, the law-wiring checker shows the link fired with its outcome-web month record id, and the row leaves the gap file.

**Files.** data/research/outcome-web/links.json, src/core2/data/laws/outcome-research-gaps.json, src/core2/modules/outcome-web.ts

**Notes.** TODO

Oct 20 (claude, Sonnet): claimed and released unbuilt. `src/core2/data/laws/outcome-research-gaps.json`, the list of the 27 laws this item names, is not on main or on any branch I could find (searched every remote branch with "outcome" or "laws" in its name, and the repository history for the file name). Without that list there is nothing to research against. Whoever filed this item holds the file on an unpushed branch; push it, or re-derive it from the law-wiring checker's "moves no outcome" rows, then reopen.

Oct 20 (claude/outcome-links-research, stacked on #5547): first link of the 27 built: `budget-line:higherEducation` -> school.college-completion-pct (Deming and Walters 2018; size 0.00109 per percent of added state spending, lag 24 months; anchor and range in links.json). New cause `budget.higherEducation-added-pct` in gov-measures.ts (the parks measure and it now share `lineBudget`). Found and fixed while wiring it: the pure web model did not count the government measures as readable causes, so the three built links that start from them (minimum-wage-to-poverty, federal-minimum-wage-to-poverty, parks-spending-to-exercise-access) and minimum-wage-to-low-wage-jobs stayed "waiting" in coverage.json and never ran; `govMeasures` in outcome-web.json now makes them wired (a test keeps it equal to GOV_MEASURES). Test: higher-education-spending-web.test.ts (a 10 percent raise to the state line moves the share of adults with a degree 24 months on, by month record id). The checker window is 35 days, shorter than the lag, so its web column reads 0/1 for this law; the test is the proof. 26 laws remain in outcome-research-gaps.json; the item stays open for them. Candidates with the same budget-line cause and an existing kept outcome: housing -> housing.homelessness, welfareAndMedicaid -> household.poverty-pct. Others need a new outcome or an amount-law cause (snap-maximum, income-tax rate, unemployment-weekly-maximum: sources found for SNAP (ERS: a 10 percent benefit rise cuts very-low-food-security SNAP households 22 percent) but no overall food-insecurity conversion yet).
