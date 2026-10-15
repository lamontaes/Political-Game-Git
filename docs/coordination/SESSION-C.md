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
