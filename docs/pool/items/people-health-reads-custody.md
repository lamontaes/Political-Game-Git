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

Looked at Oct 16 (claude, not built): the premise is missing on main. The health engine (`src/core2/modules/health.ts`) schedules a condition's onset and severity; it has no elective care visit to gate, and no act in the game is a doctor's visit (the `care-for-relative` act in `src/core2/data/content.json` is looking after a dependent at home). So "a person serving a term makes no elective care visit" has nothing to hold back. A custody read belongs on the act that would exist, the care visit, once someone designs it (the Political Process baseline does not list one); until then this item can be dropped or rewritten as the owner's call.
