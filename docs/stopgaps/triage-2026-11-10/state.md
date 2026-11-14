# Stand-in triage: state (Nov 10, 2026)

Owner test (Nov 10): kept 1 (with what the player sees), dropped 0 (too in depth), of which borderline 0. The train built the other row (see the evidence line).

Rows: 2. Still faked 0, already replaced 1, partly replaced 1, could not tell 0. Closes by: code 2, research 0, data 0, design 0, owner call 0. New items: 0.

| Stand-in                       | Still true?      | What closes it | Pool item                                     | Size | May stay at early access?                                                                        | In plain words                                                                                                                                                      | Where the player sees it                                      |
| ------------------------------ | ---------------- | -------------- | --------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| SG-STATE-line-item-veto-engine | partly replaced  | code           | gov-item-veto-deadlines-and-categories (open) | M    | no: item vetoes are real; remaining gaps are deadlines, external assent and protected categories | A governor can strike or cut budget items and the legislature votes on overriding them; some special deadlines and protected spending categories are still missing. | A governor's budget he signs or vetoes, and the override vote |
| SG-STATE-dev-seat-player       | already replaced | code           | none (built Nov 11)                           | S    | yes: dev mode only, and now seats through the offices engine                                     | Developer mode seats the player in a state office through the offices engine's term writer, which ends the serving term and writes the player's term.               | built: seatPlayerInStateOffice, Nov 11                        |

## Evidence

- `SG-STATE-line-item-veto-engine`: src/core2/modules/legislature.ts:5871-5882 executiveItemVeto strikes/reduces items with override votes; marker moved from 3815 to 5881.
- `SG-STATE-dev-seat-player`: src/core2/office-day-state.ts:1598-1609 seatPlayerInStateOffice calls offices seatTerm directly; offices.ts seatResident (line 632) still internal. Marker moved to 1609. On the train it is built: `seatPlayerInStateOffice` seats through the exported `seatTerm` (resolved Nov 11); the triage's earlier drop is superseded by that row.

## Questions for the owner

None.
