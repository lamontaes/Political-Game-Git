# Stand-in triage: state (Nov 10, 2026)

Rows: 2. Still faked 1, already replaced 0, partly replaced 1, could not tell 0. Closes by: code 2, research 0, data 0, design 0, owner call 0. New items: 0.

| Stand-in | Still true? | What closes it | Pool item | Size | May stay at early access? | In plain words |
| --- | --- | --- | --- | --- | --- | --- |
| SG-STATE-line-item-veto-engine | partly replaced | code | gov-item-veto-deadlines-and-categories (open) | M | no: item vetoes are real; remaining gaps are deadlines, external assent and protected categories | A governor can strike or cut budget items and the legislature votes on overriding them; some special deadlines and protected spending categories are still missing. |
| SG-STATE-dev-seat-player | still faked | code | office-stopgap-office-day-state-missing-core-api (open) | S | yes: dev mode only, not reached in ordinary play | Developer mode seats the player in a state office by writing directly to the offices table, because no proper seating function exists. |

## Evidence

- `SG-STATE-line-item-veto-engine`: src/core2/modules/legislature.ts:5871-5882 executiveItemVeto strikes/reduces items with override votes; marker moved from 3815 to 5881.
- `SG-STATE-dev-seat-player`: src/core2/office-day-state.ts:1598-1609 seatPlayerInStateOffice calls offices seatTerm directly; offices.ts seatResident (line 632) still internal. Marker moved to 1609.

## Questions for the owner

None.
