---
id: metrics-school-spending-one-figure
title: "One count of students and one spending-per-student figure, not $344,636 for a town of one student"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: metrics-output-numbers-registry
blocked-on:
lead: schools
model: opus
effort: medium
root: design-one-model-two-tiers
source: docs/design/output-numbers.md (#8926), owner's ask of Nov 12
---

**What.** Metrics showed $344,636 spent per student in a six-year game because the town's student count was one: the county's schools line is multiplied by the town's residents and divided by its students. Children are about one in six residents of a real town, so 185 residents should hold about 30 students. Either the town's people were drawn with almost no children or the student count misses counted children. The outcome web meanwhile keeps its own figure, $15,455, unchanged in six years, which is a second number for one fact. Seen: Metrics' spending per student and graduation, reading, math.

**Cause.** Found in code: src/core2/school-outcomes.ts:910 divides by a student count of 1, and the outcome web keeps its own flat figure (inferred: the count of one comes from `populationByPlace`, src/core2/school-outcomes.ts:832; the measurement below confirms it).

**Fix.** Take the age-band measurement first: on September 1 of a school year, count the drawn place's residents by age band, named and counted separately, and compare the share aged 5 to 17 with the opening's census share for the place. Fix the student count in its engine, then delete the web's spending figure so the web's links read the school engine's row.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic (owner, Oct 27): the engine that already holds the figure writes it once, and every view reads that row; a screen that computes its own version is a duplicate to delete. One model, two tiers (owner, Oct 14): counted children are students by the same rule as named ones, times their count. Replace, never layer (owner, Oct 14): the old counting code is deleted in the same pull request, and the pull request body counts what was removed.

**Done when.** A second session plays two school years in a drawn place, naming the place and seed, and spending per student sits within the state's published range.

**Waits on.** metrics-output-numbers-registry.

**Files.** src/core2/school-outcomes.ts, src/core2/data/outcome-web/outcome-web.json

**Notes.** From docs/design/output-numbers.md (#8926), owner's ask of Nov 12.
