# Session C: legislatures and officeholders

State office days and the election-record fixes have draft changes with played-world evidence.
The wider candidate pool is being checked before its draft can be handed off.

## Work

Order 1 is in draft PR #4330. The shared office-day engine runs state sessions, per diem, appointments, and addresses.
Order 2 is in draft PR #4343. Election identities, bill records, body names, office conflicts, and presidential press coverage have played-world evidence.

Order 3 is in draft PR #4350 on `gov/session-c-wide-races`.
The state and national candidate pool feeds the existing candidacy chooser.
An empty congressional race reaches the existing vacancy process when the new term starts.
The final played year and speed comparison are in progress.

State holdover rules, repeated empty special elections, and presidential failure to elect remain open.
Wider unnamed residents and state legislative district residency need fuller records.
These gaps remain in the stopgap registry.
PR #4256 stays open until the replacement holds.

The read-only helper `civic_report_review` reviewed report wording for orders 1 and 2.
It also reviewed the empty-term design and the order 3 implementation.
The helper inherited this session's configured model and effort.
No implementation was delegated.
