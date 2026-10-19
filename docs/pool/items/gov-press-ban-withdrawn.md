---
id: gov-press-ban-withdrawn
title: "Press staff may run and hold office (owner Oct 16): remove the press bar and resolve SG-GOV-press-office-owner-confirmation"
area: gov
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: "owner ruling Oct 16 evening (docs/coordination/OWNER-DECISIONS.md); audit Oct 19, Part A on #4663"
---

**What.** The owner withdrew the "reporters and outlet owners can't hold office" rule on Oct 16 (OWNER-DECISIONS, Oct 16 evening): the defect was auto-appointment of a reporter to an empty seat at the opening, not eligibility, and "a reporter who wants to run may run." #4663 extended the ban instead, so a reporter who wants to run still cannot, and `pressConflict` in `src/core2/press-conflict.ts` is still read by `candidacy.ts`, `elections.ts`, `candidate-pool.ts` and `offices.ts`. Remove the eligibility ban and resolve `SG-GOV-press-office-owner-confirmation`; keep the fix that an empty seat is not filled by appointment from press staff (or anyone) outside the place's own vacancy rule from data, and find why `suitedResidents` ranked an outlet's head first. Press employment alone must not disqualify a candidate.

**Rules.** Look before you ask: the ruling is in OWNER-DECISIONS and the code must follow it, not the withdrawn CTO line. No dice: who fills an empty seat comes from the place's vacancy rule in data, never from a job title or a ranking nobody can explain.

**Done when.** In a drawn place a full person employed by the town's outlet files for council and appears on the ballot, by record id; an empty seat is filled by the place's vacancy rule (from data) and never by a reporter's job alone, shown in a played world with `buildBenchWorld`; the stopgap row is resolved and the elections and gov tests pass, including `src/core2/vacancy-press-staff.test.ts` rewritten to the ruling. The owner plays it: a reporter he knows can file and run.

**Files.** src/core2/press-conflict.ts, src/core2/modules/candidacy.ts, src/core2/modules/elections.ts, src/core2/candidate-pool.ts, src/core2/modules/offices.ts, src/core2/data/stopgaps.json, src/core2/vacancy-press-staff.test.ts

**Notes.** Supersedes the audit's working id gov-press-conflict-withdrawn. gov-press-conflict-stale-on-opening-day is the same seam and may close with it.
