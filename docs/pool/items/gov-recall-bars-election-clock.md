---
id: gov-recall-bars-election-clock
title: "Recall bars counted from an election, and each state's rule after a failed recall, read by the recall engine"
area: gov
kind: stopgap
priority: 3
size: M
status: in-pr
claimed-by:
pr:
blocked-on:
standard: 2
model: sonnet
effort: medium
lead: governing
root: rc9-place-facts-one-default
source: added with npm run pool -- add
after:
checked: fable 2026-11-10
---

**What.** src/core2/modules/recalls.ts reads each state's bars as days into the term and days before its end (src/core2/data/campaigns/recall-bars.json), and bars any later petition for the rest of the term once one failed. Some statutes count from an election instead: Nebraska bars a petition six months before the incumbent filing deadline, Washington stops one six months before the next general election, North Dakota bars a recall election within a year of the next regular one; those are estimated or left out of the table now. Each state's rule after a failed recall also differs (six months in Alaska, 365 days in D.C., two years in Montana, twelve months in Nebraska, the rest of the term in Nevada and North Dakota), recorded in data/research/core/recall-timing-statutes-2026.json. Read both into the recall engine, and read Mississippi's timing rule, which no session has read. Closes SG-GOV-recall-bars-national. Combined by the Oct 25 audit, one change in one seam; the parts folded in: gov-recall-bars-calendar-months (A recall bar stated in calendar months is read as calendar months from the term's own dates); gov-recall-bars-fraction-of-term (A recall bar stated as a fraction of the term is read as that fraction of the term at hand). Each part's own done-when line is listed in Notes and is part of this item's acceptance.

**Cause.** Found in code: src/core2/modules/recalls.ts function openToRecall (lines 388-390, stopgap SG-GOV-recall-bars-national) takes one national bar for states with no row in src/core2/data/campaigns/recall-bars.json, and data/research/core/recall-timing-statutes-2026.json holds the election-counted and after-failure rules that no engine reads.

**Fix.** Read both rule kinds per state into the recall engine (the election-counted bar, the bar after a failed petition, and the calendar-month and fraction-of-term rows) and read Mississippi's timing rule. scripts/research/check-core-research.ts keeps the engine table equal to the research file.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: every bar is a per-state row in data, never a state named in logic. Research before building: each bar cites its statute in the research file, and scripts/research/check-core-research.ts keeps the engine table equal to it.

**Done when.** A second session, in a one-year run of the played world (buildBenchWorld, a drawn place with a petitioned local recall and a seed the builder did not choose, named in the PR), finds a recall petition after a failed one waiting for that state's own bar, named by recall record id; a test in src/core2/recalls.test.ts covers an election-counted bar and an after-failure bar, and scripts/research/check-core-research.ts passes.

**Waits on.** Nothing.

**Files.** src/core2/modules/recalls.ts, src/core2/recalls.test.ts, src/core2/data/campaigns/recall-bars.json, data/research/core/recall-timing-statutes-2026.json, src/core2/data/stopgaps/gov.json, scripts/research/check-core-research.ts

**Notes.** TODO

Folded in Oct 25 from gov-recall-bars-calendar-months. Its done when: A test in src/core2/recalls.test.ts asserts that a six-month closing bar on a term ending January 1, 2027 bars July 2, 2026 and admits June 30, 2026, and that a day-counted row still returns its days; scripts/research/check-core-research.ts passes with the month rows SOURCED; and a one-year run of the played world (buildBenchWorld, a place whose bar is in months, drawn from all 56 and named with its seed in the PR) shows a recall petition started no earlier than that many months after the term began, named by recall record id and the term's dates.

Folded in Oct 25 from gov-recall-bars-fraction-of-term. Its done when: A test in src/core2/recalls.test.ts asserts that a fractional row returns one-fourth of the term in days for terms of 2, 3 and 4 years (about 183, 274 and 365) and that a banded row still returns its two values; scripts/research/check-core-research.ts passes with the row SOURCED and recomputes the days from the fraction; and a one-year run of the played world (buildBenchWorld, a place whose bar is a fraction of the term, drawn from all 56 and named with its seed in the PR) shows a recall petition started no earlier than that fraction of the term after the term began, named by recall record id and the term's dates.

Deferred Oct 25: nothing on screen reads it yet.

Reopened Nov 14, 2026 (owner: dispose of the stopgaps whose shortcut is still what the game does). Built on branch claude/project-thread-x3reqh: bar rows state calendar months, a fraction of the term, a stretch before the seat's next election or filing deadline and the wait after a failed recall; recalls.ts `recallWindowFor` reads them from the term's own dates; the three stopgap rows and markers are deleted. Mississippi has no petitioned town recall in its rule pack, so it needs no bar.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have counted recall bars from elections in three states; the estimated bars already work and the player never sees the difference.
