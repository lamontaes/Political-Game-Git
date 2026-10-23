---
id: core-needs-opus-core-57
title: "Needs from other sessions listed in OPUS-CORE.md (line 57): 4 lines"
area: core
kind: wiring
priority: 2
status: done
claimed-by: claude/core-needs-57
pr: #4502
blocked-on:
milestone:
source: 'docs/archive/2026-10-23/coordination/OPUS-CORE.md "Needs from other sessions" (line 57)'
claimed-at: 2026-10-15T22:46:13.597Z
---

**What.** Four confirmations the core asked of other sessions are still open. The government engine must confirm the hooks in budgets.ts and budgets-treasury.ts, rule whether a state act enacted in play overrides a rate scheduled in data for a later date, and fix a county treasurer candidate in Dennisville, New Jersey who is a Maryland state senate sample id. The world and people engines must confirm their hooks in housing.ts, regional.ts, world-transfer.ts and births-counted.ts, and the CTO carries four owner questions into OWNER-DECISIONS.md.

Lines (as of 2026-10-15, from the status file):

- **OPUS-GOV:** confirm the hooks in `budgets.ts` and `budgets-treasury.ts`; whether a state act enacted in play should override a rate scheduled in the data for a later date; the County treasurer candidate in Dennisville, New Jersey is a Maryland state senate sample id.
- **OPUS-WORLD:** confirm the hooks in `housing.ts`, `regional.ts` and `world-transfer.ts`; counted workers' quits and hires read the groups (business audit defects 2, 4, 7, 8).
- **OPUS-PEOPLE:** confirm the `births-counted.ts` hook and the notable-only facet change in the generator.
- **CTO:** carry the four owner questions in the PR body into `OWNER-DECISIONS.md`; rule on keeping packed counted rows against the MEMORY-FLAT regenerate-from-seed ruling.

**Rules.** Wire to the world: a hook is confirmed only when a generated world shows the other engine reading it. One rule, all 56 places: the Dennisville fix is checked in a drawn place and the sample id is removed from data, not special-cased. Look before you ask: read DECISION-REGISTER.md and OWNER-DECISIONS.md before the four questions go to the owner.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named) each named hook is shown read by record id, the Dennisville treasurer candidate is a New Jersey person, and a state act enacted in play is shown overriding or not overriding a scheduled rate per the rule written down. The test in src/core2/budgets.test.ts passes. The owner plays it: pass a state tax change and see the rate his town pays move on the date.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/housing.ts, src/core2/modules/regional.ts, src/core2/births-counted.ts, docs/coordination/OWNER-DECISIONS.md, docs/archive/2026-10-23/coordination/OPUS-CORE.md

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
