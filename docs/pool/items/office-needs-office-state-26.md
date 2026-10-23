---
id: office-needs-office-state-26
title: "Needs from other sessions listed in OFFICE-STATE.md (line 26): 1 lines"
area: office
kind: wiring
priority: 2
status: done
claimed-by: claude/office-needs-office-state-26
pr: #4545
blocked-on:
milestone:
source: 'docs/archive/2026-10-23/coordination/OFFICE-STATE.md "Needs from other sessions" (line 26)'
claimed-at: 2026-10-16T02:30:58.777Z
---

**What.** The state office-day work (OFFICE-STATE) needs the state scheduler stand-in replaced by the shared registry, stops and act ledger now that the local and federal engines are on main. Session C's rebuild is in draft PR #4330 on branch `office/session-c-unified` (as of 2026-10-15). Verify what that PR already does against `src/core2/office-day-state.ts` and `office-day-registry.ts`, finish the replacement and delete the stand-in. The player would notice that a state legislator's day behaves like the council member's and the member of Congress's.

**Rules.** Replace, never layer: the state scheduler stand-in is deleted in the same change and the PR body counts what was removed; An effect is a read, not a record: the state acts and stops are read from the registry by the engine at the moment the day runs; One rule, all 56 places: state calendars are data for all 56 places; Speed: measure the office day before and after on the same machine; no more than 20% slower; This is a game, not a spreadsheet: no new step for the player; Wire to the world: the state day moves votes, bills and pay in a generated world.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): ten days as a state representative in the drawn state (named) run through `registerOfficeActs` and `registerStopKinds` with no stand-in scheduler left in the code (grep shows none), with at least one session-day vote and one act ledger entry named by id. Tests beside `src/core2/office-day-federal.test.ts` pattern for state. The owner plays it: spends a legislative week as a state representative.

**Files.** src/core2/office-day-state.ts, src/core2/office-day-registry.ts, src/core2/office-day-levels.ts, src/core2/office-day-acts.ts

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
