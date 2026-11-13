---
id: core-life-record-part-13-a-raise-or-promotion
title: "The life record, part 13: a worker who stays gets raises, in play and before the start, and a large one is told as a promotion"
area: people
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: lives
model: sonnet
effort: high
root: design-life-record
source: gap sheet, Nov 12, 2026 (Fable A), filed by the Life records builder opus-lr
checked: opus-lr 2026-11-12
---

**What.** The owner, Nov 8: "None of my history is simulated." A working life is a list of employers with one wage each, so nobody is ever given a raise or promoted, before the start or in play (gap sheet, Nov 12, row 4). The gap sheet assumed the jobs engine writes raises in play; it does not. Seen: a person's card and the Journal, which tell a raise or promotion with a year, and the person's pay on their card.

**Cause.** Found in code: `src/core2/past-work.ts` writes a spell per employer with one `hourlyMinor` for the whole spell (`begin`, near line 640), so a long spell never changes pay. In play, `src/core2/modules/jobs.ts` `raiseUnfilledPay` (line 1204) raises only an unfilled opening's offered pay; nothing raises the pay of a worker who holds a job, and `src/core2/data/life/remembered.json` has no raise row (checked Nov 12; the gap sheet's "promotion from a pay rise at the same employer, which the design already names" has no engine behind it).

**Fix.** Research first (skill `researcher`): the yearly wage growth of job stayers by age (Federal Reserve Bank of Atlanta Wage Growth Tracker, job stayers), as a SOURCED row in the jobs parameter table. Then one rule in the jobs engine, monthly on each job's anniversary (skill `cadence-and-summaries`, never daily): the employer's books (what a head's share of last month's margin can carry, as `raiseUnfilledPay` reads it) and the owner's open-handedness (`decisionLean`) set the raise, centered on the researched growth for the worker's age; the job's pay changes and a `work.raise` record names the worker. A raise well above the year's typical one is told as a promotion. The work pass before the start runs the same rule along each spell at its yearly step against the conditions it already reads. The life table tells `work/raise`; the card names the spots for Story.

**Time box.** 1 hour of research and 7 hours of building, Sonnet at high effort.

**Rules.** No dice: the books and the owner's traits decide; the research checks totals. One engine: the jobs engine's rule, read by the past pass, no second wage model. Wire to the world: the raise is a cost on the employer's books and income for the household.

**Done when.** A one-year played run of a drawn place prints the town's mean raise for workers who stayed against the researched growth for their ages (within its spread) and names one `work.raise` record whose job's pay changed and whose employer's books paid it. A test in two drawn places opens every town adult: a spell of several years before the start has raises with years and rising pay. A second session sees one card on main tell a raise or promotion with a year.

**Waits on.** Lines from Story for the spots the pull request names.

**Files.** src/core2/modules/jobs.ts, src/core2/past-work.ts, src/core2/data/life/remembered.json, src/bench/card.ts
