---
id: people-health-reads-custody
title: "The health engine reads whether a person is in custody when it decides care"
area: people
kind: wiring
priority: 3
size: S
status: claimed
claimed-by: claude/health-custody
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T15:55:59.100Z
---

**What.** The health engine does not read `inCustody` (src/core2/modules/justice.ts) when it decides care, so a person in prison is treated as free to see a doctor of their choice. Make care decisions read custody at the moment they decide.

**Rules.** No dice; an effect is a read; one rule, all 56 places; the chain is the acceptance.

**Done when.** In a one-year run of a drawn place, a person serving a term makes no elective care visit while serving, shown by the health and custody record ids; released, they do.

**Files.** src/core2/modules/health.ts

**Notes.** Split out of gov-needs-opus-gov-209 (line 209 of OPUS-GOV.md), which built the voting and polling-place reads. Not checked against main beyond a search.
