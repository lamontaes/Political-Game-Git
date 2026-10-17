---
id: gov-state-election-office-holder
title: "A state's election office has a chief election official: a person the filing scene can put at the counter"
area: gov
kind: wiring
priority: 3
size: M
status: done
claimed-by: claude/state-election-official
pr: #4841
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T23:13:33.154Z
---

**What.** A contest filed with a state or territory election board, commission or division shows the office's title and no one at the counter, because the filing data names agencies, not people. Give each state election agency a recorded chief election official, a full person in the state government's staff records on the state's payroll, so the filing scene can fill the clerk role for state and federal races the same way it does for a town or county clerk. The holder comes from the place's own data, never from a rule naming a state.

**Rules.** One rule, all 56 places: which agency takes filings, and who runs it, comes from the place's records. Estimate, never UNKNOWN: where the data names an agency but not its head, draw a person with a per-world spread and mark the source as an estimate. Wire to the world: the official's pay is a payroll record the state budget reads. Resolves the stopgap SG-GOV-state-election-office-holder.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) every state and federal contest in the filing data has a chief election official by person record id, the director's clerk fill returns that person for a filing moment, the person has an open job on the state treasury, and the tests in src/director/civic-roles.test.ts show Vaitogi, American Samoa style places (territory-wide races filed with an election office) naming a clerk.

**Files.** src/core2/modules/filing-clerk.ts, src/core2/modules/executive.ts, src/core2/data/stopgaps.json, src/director/civic-roles.test.ts

**Notes.** Found building gov-clerk-person (Oct 16): in Vaitogi, American Samoa every race files with the American Samoa Election Office and no clerk is named.
