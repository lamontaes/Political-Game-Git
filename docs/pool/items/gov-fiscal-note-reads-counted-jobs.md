---
id: gov-fiscal-note-reads-counted-jobs
title: "A bill's fiscal note counts the counted workers its wage floor raises, in the body's own place"
area: gov
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: governing lead, Oct 30 (review of gov-m3-01-fiscal-note-at-drafting)
lead: governing
---

**What.** A wage bill's fiscal note (costOf and employerCosts in src/core2/modules/legislature.ts) counts only full people's open work commitments paid under the new floor. It never reads the counted jobs of the modeled wider population (countedJobsOf in src/core2/modules/jobs.ts), so in a two-level town the note undercounts the workers and the yearly pay a raise reaches. It also walks every commitment in the world rather than the jobs in the drafting body's own place, and the note's words (town jobs paid under the new floor, no pay effect) are typed in code rather than worded by the English engine.

**Rules.** One model, two tiers: a counted job is read by the same rule as a full person's commitment, times its count. One rule, all 56 places: the body's place comes from the bill's jurisdiction record, never a named place. No hand-written player text: the note's sentence comes from a bank (the Words session's), and the engine keeps only numbers and record ids.

**Done when.** In a drawn place built with buildBenchWorld and the seed it prints, a minimum-wage bill drafted through seatAct has a fiscal note whose workers equal the full people's commitments plus the counted jobs (by count) in the body's place paid under the new floor, named by commitment id and counted-job row id, whose yearly pay matches the sum of the same rows, and whose words come from a bank line; a commitment in another place is not counted.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/jobs.ts, src/bench/bill-paper.test.ts, data/english/parts/bill-paper.json

**Notes.** TODO
