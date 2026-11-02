---
id: elections-recall-reads-ended-term
title: "Recall and misconduct checks read the term an official's id was minted from, so a re-elected named official drops out of them"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** recalls.ts:208-215 finds an official's term by the term named in their own id (official:<termId>), and its callers at about lines 460, 537 and 634 use it for recall and misconduct checks. A town seat's named official filled in at the opening keeps the id official:<opening term> after a re-election, so this lookup returns the ended opening term and the official drops out of those checks. The laws lead confirmed it on main on Nov 2 while checking the speed lead's office-terms fold proposal.

**Rules.** The simulation is the one layer that knows anything: a check reads the official's serving term, through one helper (servingTermsOf in src/core2/modules/offices.ts), not the term their id was minted from. One rule, all 56 places: no place is named in code, and the test draws its place.

**Done when.** In a played world (buildBenchWorld) in a place drawn from all 56, named with its seed, a test re-elects a town seat's named official and shows the recall and misconduct checks reading the new serving term by record id; with the old lookup put back, the test fails.

**Files.** src/core2/recalls.ts,src/core2/modules/offices.ts

**Notes.** lead: governing. Owner by family: elections and campaigns. Found by the laws lead's check of the office-terms fold proposal (core-long-run-election-and-term-rows), Nov 2 00:01 UTC.
