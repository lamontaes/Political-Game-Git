---
id: gov-elected-holder-reads-out-of-work
title: "A county clerk who holds the office on record comes to office hours asking for a job"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: m0-m2
model: sonnet
effort: medium
root: none
source: Desk thread, Nov 15, rule 136 played file (/mnt/project-files/words-lead/who-they-are/who-played-75626d9f.md)
---

**What.** John Mendoza serves as the elected county clerk (offices term office:gus2025:105319:clerk) from day one, yet he has no job row, so the case engine reads him as out of work with thin savings and sends him to a council member's office hours: "John Mendoza, the county clerk, meets you at the office... I need a job. What I saved is almost gone."
Seen: Hardinsburg, Kentucky (2134552), seed 4276344481a2b078e70633cfee47d0caccb65f74:2, visit office-approached:case:person_f4535288f43c0996:2025-02-19.

**Cause.** Found in code: src/core2/modules/offices.ts, the offices engine, seats an elected holder with a term but no paid job (person.jobId undefined for person_f4535288f43c0996), and src/core2/modules/constituent-cases.ts reads "out of work" as "no job row", so a serving officeholder counts as unemployed.

**Fix.** Pay a serving elected officeholder through the office's own payroll (the official-pay engine's job for the term), or have the case engine's out-of-work read count a serving term as work; the first is the record a payslip, the card and the case read alike. Prove that no serving officeholder opens a job-search case.

**Time box.** 2 hours, one Sonnet session at medium effort.

**Rules.** One rule, all 56 places: every elected office, any level. Wire to the world: the job or term is the record the case engine reads.

**Done when.** At Hardinsburg KY (seed above) and at a drawn place with a seed nobody chose, no person with a serving term opens an out-of-work case in a played year, by record id, and John Mendoza does not come to office hours asking for a job; a second session sees it in dev mode.

**Waits on.** Nothing.

**Files.** src/core2/modules/offices.ts, src/core2/modules/official-pay.ts, src/core2/modules/constituent-cases.ts
