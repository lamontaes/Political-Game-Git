---
id: gov-m3-04-funded-work-delayed-or-failed
title: "A funded public work is delivered, delayed or failed from its contractor's and town's records, not finished by the calendar"
area: gov
lead: governing
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: governing lead Oct 29
---

**What.** M3-04's test sentence says funded work is paid and then delivered, delayed or failed. Today a capital line's award is paid each month and the work is "finished" on the day the next fiscal year's budget takes over (`finishedProjects` in src/core2/modules/projects.ts, registered as SG-OFFICE-public-project-finish-date: "no work schedule or completion record exists"), so every paid work is delivered on time and none is ever late or abandoned. src/core2/projects.test.ts proves the paid and delivered half only. Give the award a work schedule and a completion record that the contractor's own state (its money, its workers, a hazard on the site) moves later or ends, and clear the stopgap.

**Rules.** No dice: a work is late or fails only from a recorded cause (the contractor short of cash or staff, a hazard record, the line cut), never a monthly chance. Sliding scales and causes: delay grows with the shortfall that causes it, with no threshold where it flips. Replace, never layer: the completion record replaces the fiscal-year finish date, which is deleted with its stopgap.

**Done when.** A test in src/core2/projects.test.ts, in a drawn place built with buildBenchWorld and the seed it prints, plays until one capital award is delivered on schedule and finds a second that is delayed or failed, each naming its cause by record id (the contractor's cash or staff record, or the hazard record), with SG-OFFICE-public-project-finish-date removed from src/core2/data/stopgaps.json; the M3-04 command already runs that file.

**Files.** src/core2/modules/projects.ts, src/core2/modules/contracts.ts, src/core2/projects.test.ts, src/core2/data/stopgaps.json

**Notes.** Filed by the governing lead, Oct 29, from the M3-04 command (branch governing/m3-spec-commands). The laws lead owns what a law does to people; ask it whether a project schedule exists in its work before building. Research the share of local capital projects finished late (a sourced or estimated rate checks the total, never one project's outcome).
