---
id: world-police-patrol-and-grievance-causes-part-2-grievance-record
title: "A dispute between two named people writes a grievance record other engines can read"
area: world
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr: #8231
after:
blocked-on:
lead: laws-effects
model: opus
effort: medium
root: design-movements-and-unrest
source: split from world-police-patrol-and-grievance-causes in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at:
merged-at:
---

**What.** No engine writes a grievance between two people; only recalls reads the word. Add a grievance record (two people, the cause record, the date, the kind of dispute) written by engines that already create conflict, such as an eviction in the housing engine (landlord and evicted household's head) and a layoff in the jobs engine (the employer's owner and the laid-off worker), through the events those engines already emit, not a new tracker. This is the second of three parts of world-police-patrol-and-grievance-causes.

**Cause.** Design: docs/design/proposals/movements-and-unrest-2026-10-14.md (unrest arises from conditions between people and reaches officials). The jobs engine (src/core2/modules/jobs.ts) writes layoffs and the housing engine (src/core2/housing-occupancy.ts) writes evictions, and neither records a grievance between the two people involved.

**Fix.** Add a module that listens to those existing events and writes one grievance row per dispute, naming both people by record id and the cause record, ending it when the cause is undone. Name the engines used in the pull request.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: a grievance exists because a recorded event hurt a named person, never a roll. An effect is a read, not a record: part 3 reads it. Ask why: each grievance answers why by the cause record id. One model, two tiers: a counted person's dispute is tallied by the same rule, times their count.

**Done when.** A second session, on main in a drawn place (place and seed named), plays a year in dev mode and finds a grievance row by record id between two named people after an eviction or a layoff, with the cause record id on it. A test in src/core2 names the place, the seed and the ids.

**Waits on.** Nothing.

**Files.** src/core2/modules/grievance.ts (new), src/core2/modules/jobs.ts, src/core2/housing-occupancy.ts

**Notes.** Not seen in the game (2026-11-11, second-session-2): Copperhill, Tennessee (drawn), seed 7ae6830c-8591-42d1-9bbe-57fae15333eb, main 25963514: dev mode layoff then a week run; Trace of the grievance id says record-not-found and names only the job-change, no aggrieved or opposing person
