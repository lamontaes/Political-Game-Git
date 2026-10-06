# Session 53 — b29 P1 progress

Date: 2026-10-06

## Current published candidate

- PR #2459 (draft): `b29 P1: targeted two-state calendar proof — not whole-world chronological acceptance.`
- Branch: `session-53-b29-p1`.
- Current candidate before this marker: `b31648bf82f62cae73c451584f54af24a7c45c3d` (base `main` at `f88508186b78f526ecf89a420b5fb584171e039a`; not merged).
- Previous broad runner remains stopped; PID 773 is `Z`/`[npm run world:a] <defunct>`, not executing. Stop request receipt and terminal verification are preserved in `/tmp/session53-run-evidence.txt`; broad-run OOM log is `/tmp/session53-nationwide-calendar-attempt-oom.txt`.

## Done

- P1 state bill-season scheduler uses the existing member-agenda filer; D.C. Council calendar is seeded for every nationwide opening.
- Added first Congress monthly intake due row through exported `scheduleCongressIntake`, consumed by the existing `congressIntakeHandler` / `fileMemberAgendaBills` path. Async and synchronous openings seed state and D.C. rows.
- Corrected session-end evidence: Apr. 30's 2,347 rows / 77 batches / 179.133 seconds / 85 state filings / 14 state enactments and 5 D.C. Council filings / 4 enactments are bounded progress, not per-jurisdiction full-session acceptance. The saved artifact lacks `sessionAdjournments`; source dates must not be described as simulation end records reached.
- Focused calendar/intake tests: 69 passed. `git diff --check` passed.
- Opening-life integration run failed at its existing Congress principles assertion (expected >3,500 saved rows; observed 0). It passed the calendar-row assertions before this failure; no Congress passage count is claimed from this change.
- CTO owner question posted on #2424 comment 6014404450: name owner or confirm Session 53 ownership for territorial packs/rosters and source-backed session-end coverage/instrumentation.

## Still blocked / bounded work

- 28 annual-session states have no finite 2026 end date in the current source table; four states have no regular session in 2026; Michigan and North Carolina dates are estimates. The source table has 15 published state adjournment dates (12 on/before Apr. 30, 3 later), but this run did not serialize actual session-end records.
- PR has a generic pack but no territorial seated roster/intake. GU, VI, AS, MP have no canonical legislative packs/rosters. D.C. Council is year-round; Congress has no state-style session-end contract in the coverage table.
- No whole-world annual/daily run, heap increase, build, or merge. Keep OOM route as the Session5 speed issue, not a b29 blocker.

## Next safe step

Refresh #2424 / CTO rulings; in parallel, inspect the exact compiled session-end source and institution-pack contract locations, then prepare per-jurisdiction coverage instrumentation that records `sessionAdjournments` from the calendar-only resolver. Continue only bounded calendar runs with ordinary heap. Do not claim acceptance until every jurisdiction has a source-backed own session end and the all-due resolver records that end reached.

Next command:

```bash
rg -n "function stateSessionEnds|function stateSessionEndEstimate|NO_STATE_LEGISLATURE|sessionAdjournments" src/simulation/governing/statute-effective-date.ts src/simulation/legislature-game-profile.ts src/simulation/types.ts
```
