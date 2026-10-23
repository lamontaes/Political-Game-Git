# Session C

> **History.** This describes the old engine or a process that ended in October 2026. Don't follow it; read `AGENTS.md`, `ARCHITECTURE.md` and `docs/README.md`.

State legislators and governors use the shared day clock. The played year reached an address, a cabinet appointment and paid per diem.

## What the owner can play

Control a state legislator or governor through the bench player. Session and district days use the shared clock and act ledger. The governor can give the address, propose a budget, nominate a named person, and decide a bill on the desk.

## Measured play

Seed `f17a65f327021d58` drew Homer, Alaska. The played year ran from January 20, 2025 to January 20, 2026 in 78.9 seconds. The shared calendar and address produced 34 state clock stops, 392 member acts, and 282 recorded view changes; [draft #4330](https://github.com/lamontaes/Political-Game-Git/pull/4330) records their IDs from `scripts/office-day-state/year.ts` at `0e38a27f21`. The first month paid the member $3,377 for eleven attended days at $307 a day, from the Alaska per-diem row; draft #4330 names the payment record. The treasury read the payments before spending the rest of its budget.

The initial governor proposal failed. The follow-up at `ce1d8f0a6f` used existing budget amounts and ordinary negotiations, then passed through both chambers. The governor struck the parks increase and reduced the administration increase to $10,000. Each override failed with 27 votes against 45 required; `scripts/office-day-state/year.ts:249` records both votes and the budget change.

## Assignment

- Order 1: integration built; final checks and remaining proof in progress. Local and federal branches were already ancestors of main. The state branch’s separate stops and desk rule are replaced.
- Order 2: draft #4343 contains the five defect fixes; jurisdiction incompatibility law remains estimated and needs completion.
- Order 3: draft #4350 rebuilds the wider candidate pool and congressional vacancy path; empty-race legal coverage and ordinary-play proof remain incomplete.
- Pool: drafts #4357 and #4358 are parked. No further pool work until all three Session C orders are complete. The earlier move to the pool was premature.

## Limits and failed checks

The first play script skipped beyond its intended handoff; its calendar target now bounds each leg. A fixture read the wrong budget table; the test now reads the actual adopted budget. Per diem initially ran after the treasury close and paid nothing; it now uses the existing budget-line payer hook. A proof import exposed the treasury’s existing import cycle; the script starts through buildBenchWorld.

The item-veto rule now supports reductions, exact override fractions, attendance denominators and joint totals through `src/core2/state-item-veto.ts:46` and `executiveItemVeto` in `src/core2/modules/legislature.ts:3259`. Protected spending restrictions and unresolved legal details remain registered. The completed October 15 follow-up kept the same seed and dates. Its output in `/tmp/session-c-reduction-chain.log` records an 88.071-second year and a $10,000 administration increase in `budget:US-AK:2024`. Treasury payments reached businesses and their named owners; learned attribution and a director scene remain unproved. Governor appointments retain the registered job-transition limit: candidates must first leave another job. The state branch’s dev-seating helper remains registered. Guard and police decision bodies remain deferred by the owner’s October 14, 2026 ruling in `docs/coordination/OWNER-DECISIONS.md:60`.

## Method

Branch: `office/session-c-unified`. Draft PR: #4330.

A read-only civic-report-reviewer helper reviewed the PR text under the reporting skill. No implementation helpers. No merges. Dependencies installed in the existing registered cloud workspace. Checks are limited to changed files and their related tests.

## Final related checks

The six related test files produced 29 passes and five failures. Both federal vote failures reproduce on clean main with the same seed. All three trait failures also reproduce on clean main; main additionally fails the stale coverage-table check.

The same speed script measured 73.117 seconds on base `1977d40995` and 78.428 seconds at `0e38a27f21`, a 7.3% increase. These speed measurements precede the reduction and attendance changes. Item-veto limits remain registered as open.

The follow-up speed run at `f76070a74c` measured 97.373 seconds, above the allowed increase from the earlier 73.117-second base. A fresh clean-base run measured 94.533 seconds with the same command and seed (`/tmp/session-c-veto-base-recheck.log`). Against that comparison the branch is 3.0% slower and below two minutes. The speed gate passes; the older 73.117-second measurement no longer describes the current run conditions.

# Session C: legislatures and officeholders

State office days and the election-record fixes have draft changes with played-world evidence.
The wider candidate pool now has a completed played year and passing focused checks.

## Work

Order 1 is in draft PR #4330. The shared office-day engine runs state sessions, per diem, appointments, and addresses.
Order 2 is in draft PR #4343. Election identities, bill records, body names, office conflicts, and presidential press coverage have played-world evidence.

Order 3 is in draft PR #4350 on `gov/session-c-wide-races`.
The state and national candidate pool feeds the existing candidacy chooser.
An empty congressional race reaches the existing vacancy process when the new term starts.
The final played year took 109.424 seconds in drawn Homer, Alaska.
The isolated speed check took 81.739 seconds versus 73.117 on main.
All 14 focused tests and the changed-file checks passed.

State holdover rules, repeated empty special elections, and presidential failure to elect remain open.
Wider unnamed residents and state legislative district residency need fuller records.
These gaps remain in the stopgap registry.
PR #4256 is superseded by #4350.
The press-employment rule remains a CTO ruling pending owner confirmation.

The read-only helper `civic_report_review` reviewed report wording for orders 1 and 2.
It also reviewed the empty-term design and the order 3 implementation.
The helper inherited this session's configured model and effort.
No implementation was delegated.

## Pool: assumed voter registration

Draft #4357 removes the unsupported registered-voter result from filing eligibility.
The underlying research data and the other eligibility checks remain.
All 15 related filing tests passed. The played year took 78.485 seconds.
Filing, campaign spending, and election result IDs are in the draft body.

# Session C: legislatures and officeholders

State office days and the election-record fixes have draft changes with played-world evidence.
The wider candidate pool now has a completed played year and passing focused checks.

## Work

Order 1 is in draft PR #4330. The shared office-day engine runs state sessions, per diem, appointments, and addresses.
Order 2 is in draft PR #4343. Election identities, bill records, body names, office conflicts, and presidential press coverage have played-world evidence.

Order 3 is in draft PR #4350 on `gov/session-c-wide-races`.
The state and national candidate pool feeds the existing candidacy chooser.
An empty congressional race reaches the existing vacancy process when the new term starts.
The final played year took 109.424 seconds in drawn Homer, Alaska.
The isolated speed check took 81.739 seconds versus 73.117 on main.
All 14 focused tests and the changed-file checks passed.

State holdover rules, repeated empty special elections, and presidential failure to elect remain open.
Wider unnamed residents and state legislative district residency need fuller records.
These gaps remain in the stopgap registry.
PR #4256 is superseded by #4350.
The press-employment rule remains a CTO ruling pending owner confirmation.

The read-only helper `civic_report_review` reviewed report wording for orders 1 and 2.
It also reviewed the empty-term design and the order 3 implementation.
The helper inherited this session's configured model and effort.
No implementation was delegated.

## Pool: assumed voter registration

Draft #4357 removes the unsupported registered-voter result from filing eligibility.
The underlying research data and the other eligibility checks remain.
All 15 related filing tests passed. The played year took 78.485 seconds.
Filing, campaign spending, and election result IDs are in the draft body.

## Pool: invented turnout weather

Draft #4358 removes the unsupported weather reading from voting reasons.
Named, counted, and wider voters retain the same other turnout causes.
All six related tests passed. The played year took 74.045 seconds.
It produced 880 named ballot records and ten counted-ballot records without a weather field.
The read-only helper found no blocker in the retirement.

## Order 3 update (draft #4350, branch `gov/session-c-wide-races`)

The state and national candidate pool feeds the existing candidacy chooser. An empty congressional race reaches the existing vacancy process when the new term starts. The final played year took 109.424 seconds in drawn Homer, Alaska; the isolated speed check took 81.739 seconds versus 73.117 on main. State holdover rules, repeated empty special elections and presidential failure to elect remain open (pool items `gov-holdover-rule-data`, `gov-empty-special-repeats`, `gov-failed-presidential-election`). The press-employment rule remains a CTO ruling pending owner confirmation. Main was merged into the branch on October 15: the eligibility union keeps press-employment and drops registered-voter, as #4357 ruled.
