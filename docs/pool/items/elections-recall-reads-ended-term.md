---
id: elections-recall-reads-ended-term
title: "Recall and misconduct checks read the term an official's id was minted from, so a re-elected named official drops out of them"
area: elections
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-elections-recall-reads-ended-term
pr: #8420
blocked-on:
source: added with npm run pool -- add
after:
lead: elections
standard: 2
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
claimed-at: 2026-11-11T01:07:26.628Z
---

**What.** Recall and misconduct checks read the term an official's id was minted from, so a re-elected named official drops out of them. `termOf` in the recalls module finds an official's term by the term named in their own id (`official:<termId>`), and its callers at about lines 456, 533 and 630 use it for recall and misconduct checks. A town seat's named official filled in at the opening keeps the id `official:<opening term>` after a re-election, so this lookup returns the ended opening term and the official drops out of those checks. The laws lead confirmed it on main on Nov 2 while checking the speed lead's office-terms fold proposal.

**Cause.** Found in code: `src/core2/modules/recalls.ts` `termOf` (line 203) resolves an `official:<termId>` id to the term in the id, which is the ended opening term after a re-election; its callers are at lines 456, 533 and 630.

**Fix.** Resolve the official's person to their serving term with `servingTermsOf` (`src/core2/modules/offices.ts`, line 324) in `termOf` and its three callers, so a recall or misconduct check reads the term now serving.

**Time box.** 2 hours for one sonnet session.

**Rules.** The simulation is the one layer that knows anything: a check reads the official's serving term, through one helper (`servingTermsOf`), not the term their id was minted from. One rule, all 56 places: no place is named in code, and the test draws its place. An effect is a read: the recall and misconduct checks must read the new term.

**Done when.** A second session runs a test in a played world (`buildBenchWorld`) in a place drawn from all 56, named with its seed, that re-elects a town seat's named official and sees the recall and misconduct checks read the new serving term by record id; with the old lookup put back, the test fails.

**Waits on.** Nothing.

**Files.** src/core2/modules/recalls.ts, src/core2/modules/offices.ts

**Notes.** lead: governing. Owner by family: elections and campaigns. Found by the laws lead's check of the office-terms fold proposal (core-long-run-election-and-term-rows), Nov 2 00:01 UTC.
