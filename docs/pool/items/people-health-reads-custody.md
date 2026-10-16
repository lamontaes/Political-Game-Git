---
id: people-health-reads-custody
title: "The health engine reads whether a person is in custody when it decides care"
area: people
kind: wiring
priority: 3
size: S
status: in-pr
claimed-by: claude/health-custody
pr: #4766
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T15:55:59.100Z
---

**What.** The health engine does not read `inCustody` (src/core2/modules/justice.ts) when it decides care, so a person in prison is treated as free to see a doctor of their choice. Make care decisions read custody at the moment they decide.

**Rules.** No dice; an effect is a read; one rule, all 56 places; the chain is the acceptance.

**Done when.** In a one-year run of a drawn place, a person serving a term makes no elective care visit while serving, shown by the health and custody record ids; released, they do.

**Files.** src/core2/modules/health.ts

**Notes.** Split out of gov-needs-opus-gov-209 (line 209 of OPUS-GOV.md), which built the voting and polling-place reads. Not checked against main beyond a search.

Looked at Oct 16 (claude, released, not built): the health engine makes no care decision for custody to be read at. `src/core2/modules/health.ts` schedules a serious-illness onset and a death date (`remainingDaysAfterOnset`, `src/simulation/crisis/death-causes.ts`), and the only input a care choice would change is `covered`, which the engine passes as null for everyone (registered stopgap SG-P10-health-minimal-port: coverage is absent from the port). A person in custody would be covered by the state, and null already means "not shortened", so reading `inCustody` there changes no day of any record. The read becomes real when the health port gains a coverage record (the stopgap's replacement); then `covered` is true for a person in custody, false for an uninsured free person, and the days differ by `uncoveredDaysFactor`. Until then the done-when ("no elective care visit while serving") has no visit to withhold. Leave open behind the coverage record; the item should carry `blocked-on: people-stopgap-health-missing-mechanic`.
