---
id: law-levels-federal-mandate-governs
title: "Law levels: a federal mandate in force governs over the state and the town"
area: laws
kind: bug
priority: 2
size: S
status: claimed
claimed-by: federal-mandate-loaded
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-06T17:02:37.996Z
---

**What.** The federal Medicaid work rule (operative 2027-01-01) was loaded only where a state had no answer of its own, so in the roughly 51 places that answer no it never took effect (docs/reports/law-levels-2026-11-05.md, Part B item 3).

**Rules.** Higher level wins; federal over state; the date comes from the research's operativeAt; no dice.

**Done when.** A federal mandate row is always loaded for a state-level question the research answers for the nation with an effective date; resolveLawInForce lets it govern from that date over the state and town rows; a drawn-place test shows the state's no governs before and the federal row from the day.

**Files.** src/core2/modules/laws.ts,src/core2/laws-in-force.ts,src/core2/federal-mandate-levels.test.ts

**Notes.** TODO
